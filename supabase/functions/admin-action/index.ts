import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isAdminPhone, isAdminUser, getSupabase } from "../_shared/admin.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedPhone } from "../_shared/auth.ts";

function generateRandomCode(length: number): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
        result += chars[arr[i] % chars.length];
    }
    return result;
}

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { admin_phone: bodyAdminPhone, action_type, params = {} } = await req.json();
        const admin_phone = await getAuthenticatedPhone(req, bodyAdminPhone);

        let authorized = false;
        if (admin_phone && isAdminPhone(admin_phone)) {
            authorized = true;
        } else {
            try {
                const userToken = req.headers.get("x-user-token");
                if (userToken) {
                    const supabase = getSupabase();
                    const { data: { user } } = await supabase.auth.getUser(userToken);
                    if (user && await isAdminUser(user.id)) {
                        authorized = true;
                    }
                }
            } catch {}
        }

        if (!authorized) {
            return jsonResponse({ success: false, error: "无权限" }, 403);
        }

        const supabase = getSupabase();

        const logAudit = async (actionType: string, targetUser: string | null, params: any, success: boolean, message?: string) => {
            try {
                await supabase.from("admin_audit_log").insert({
                    admin_id: admin_phone || "unknown",
                    action_type: actionType,
                    target_user: targetUser,
                    params,
                    result_success: success,
                    result_message: message || null,
                });
            } catch {}
        };

        switch (action_type) {
            // ==================== 调整积分 ====================
            case "adjust_credits": {
                const { phone, amount } = params;
                if (!phone || amount === undefined) {
                    return jsonResponse({ success: false, error: "缺少 phone 或 amount" }, 400);
                }

                const numAmount = Number(amount);
                if (isNaN(numAmount) || numAmount === 0) {
                    return jsonResponse({ success: false, error: "amount 必须为非零数字" }, 400);
                }

                // 支持 phone、email、user_id 查找用户
                let profile: any = null;
                // 先尝试 UUID 格式（user_id）
                if (/^[0-9a-f-]{36}$/.test(phone)) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("id", phone).single();
                    profile = data;
                }
                if (!profile) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("phone", phone).single();
                    profile = data;
                }
                if (!profile) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("email", phone).single();
                    profile = data;
                }

                if (!profile) {
                    return jsonResponse({ success: false, error: "用户不存在" }, 404);
                }

                if (numAmount > 0) {
                    const { data, error } = await supabase.rpc("refund_user_credits_v2", {
                        p_user_id: profile.id,
                        p_amount: numAmount,
                        p_tx_type: "admin_adjust",
                        p_description: `管理员调整 +${numAmount}`,
                    });
                    if (error) { await logAudit("adjust_credits", phone, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                    await logAudit("adjust_credits", phone, params, true);
                    return jsonResponse({ success: true, remaining: data });
                } else {
                    const { data, error } = await supabase.rpc("deduct_user_credits_v2", {
                        p_user_id: profile.id,
                        p_amount: Math.abs(numAmount),
                        p_tx_type: "admin_adjust",
                        p_description: `管理员调整 ${numAmount}`,
                    });
                    if (error) { await logAudit("adjust_credits", phone, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                    if (data === -1) { await logAudit("adjust_credits", phone, params, false, "积分不足"); return jsonResponse({ success: false, error: "积分不足" }, 400); }
                    await logAudit("adjust_credits", phone, params, true);
                    return jsonResponse({ success: true, remaining: data });
                }
            }

            // ==================== 修改套餐 ====================
            case "change_tier": {
                const { phone, tier_id } = params;
                if (!phone || !tier_id) {
                    return jsonResponse({ success: false, error: "缺少 phone 或 tier_id" }, 400);
                }

                // 支持 phone、email、user_id 查找
                let targetId: string | null = null;
                if (/^[0-9a-f-]{36}$/.test(phone)) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("id", phone).single();
                    if (data) targetId = data.id;
                }
                if (!targetId) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("phone", phone).single();
                    if (data) targetId = data.id;
                }
                if (!targetId) {
                    const { data } = await supabase.from("user_profiles").select("id").eq("email", phone).single();
                    if (data) targetId = data.id;
                }
                if (!targetId) return jsonResponse({ success: false, error: "用户不存在" }, 404);

                const { error } = await supabase
                    .from("user_profiles")
                    .update({ subscription_tier: tier_id })
                    .eq("id", targetId);

                if (error) { await logAudit("change_tier", phone, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("change_tier", phone, params, true);
                return jsonResponse({ success: true });
            }

            // ==================== 手动标记订单已付 ====================
            case "mark_order_paid": {
                const { out_trade_no } = params;
                if (!out_trade_no) {
                    return jsonResponse({ success: false, error: "缺少 out_trade_no" }, 400);
                }

                // 查询订单
                const { data: order, error: findErr } = await supabase
                    .from("payment_orders")
                    .select("*")
                    .eq("out_trade_no", out_trade_no)
                    .single();

                if (findErr || !order) {
                    return jsonResponse({ success: false, error: "订单不存在" }, 404);
                }
                if (order.status === "paid") {
                    return jsonResponse({ success: false, error: "订单已支付" }, 400);
                }

                // 更新订单状态
                await supabase
                    .from("payment_orders")
                    .update({ status: "paid", paid_at: new Date().toISOString() })
                    .eq("out_trade_no", out_trade_no);

                // 激活订阅
                // 查出 user_id
                let markUserId: string | null = null;
                if (order.user_phone) {
                    const { data: pu } = await supabase.from("user_profiles").select("id").eq("phone", order.user_phone).single();
                    if (pu) markUserId = pu.id;
                }
                if (!markUserId && order.user_email) {
                    const { data: eu } = await supabase.from("user_profiles").select("id").eq("email", order.user_email).single();
                    if (eu) markUserId = eu.id;
                }
                if (!markUserId) {
                    await logAudit("mark_order_paid", out_trade_no, params, false, "找不到用户");
                    return jsonResponse({ success: false, error: "找不到对应用户" }, 404);
                }

                const { error: activateErr } = await supabase.rpc("activate_subscription_v2", {
                    p_user_id: markUserId,
                    p_tier_id: order.tier_id,
                    p_billing_cycle: order.billing_cycle,
                });

                if (activateErr) {
                    await logAudit("mark_order_paid", out_trade_no, params, false, activateErr.message);
                    return jsonResponse({ success: false, error: "订阅激活失败: " + activateErr.message }, 500);
                }

                await logAudit("mark_order_paid", order.user_phone, params, true);
                return jsonResponse({ success: true });
            }

            // ==================== 启用/禁用 API Key ====================
            case "toggle_api_key": {
                const { key_id, is_active } = params;
                if (!key_id || is_active === undefined) {
                    return jsonResponse({ success: false, error: "缺少 key_id 或 is_active" }, 400);
                }

                const updateData: Record<string, boolean | string | null> = { is_active: !!is_active };
                if (!is_active) {
                    updateData.disabled_at = new Date().toISOString();
                } else {
                    updateData.disabled_at = null;
                }

                const { error } = await supabase
                    .from("freepik_api_keys")
                    .update(updateData)
                    .eq("id", key_id);

                if (error) { await logAudit("toggle_api_key", key_id, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("toggle_api_key", key_id, params, true);
                return jsonResponse({ success: true });
            }

            // ==================== 批量添加 API Key ====================
            case "batch_add_api_keys": {
                const { keys, remaining_credits } = params;
                if (!keys || !Array.isArray(keys) || keys.length === 0) {
                    return jsonResponse({ success: false, error: "缺少 keys 数组" }, 400);
                }
                const rows = keys.filter((k: string) => k.trim()).map((k: string) => ({
                    api_key: k.trim(),
                    remaining_credits: remaining_credits != null ? Number(remaining_credits) : null,
                    is_active: true,
                }));
                const { error } = await supabase.from("freepik_api_keys").insert(rows);
                if (error) { await logAudit("batch_add_api_keys", null, { count: rows.length }, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("batch_add_api_keys", null, { count: rows.length }, true);
                return jsonResponse({ success: true, count: rows.length });
            }

            // ==================== 批量修改所有 API Key 余额 ====================
            case "batch_set_api_key_credits": {
                const { credits } = params;
                if (credits === undefined || credits === null) {
                    return jsonResponse({ success: false, error: "缺少 credits 参数" }, 400);
                }
                const newCredits = Number(credits);
                const { data, error } = await supabase
                    .from("freepik_api_keys")
                    .update({ remaining_credits: newCredits })
                    .eq("is_active", true)
                    .select("id");
                if (error) { await logAudit("batch_set_api_key_credits", null, { credits: newCredits }, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                const count = data?.length || 0;
                await logAudit("batch_set_api_key_credits", null, { credits: newCredits, count }, true);
                return jsonResponse({ success: true, count });
            }

            // ==================== 创建兑换码 ====================
            case "create_redemption_code": {
                const { code, credits_amount, max_uses = 1, code_type = "promo", description = "", expires_at, tier_id } = params;

                if (code_type === "subscription") {
                    if (!tier_id) {
                        return jsonResponse({ success: false, error: "订阅码必须指定 tier_id" }, 400);
                    }
                    // 验证 tier_id 有效
                    const { data: tier } = await supabase.from("subscription_tiers").select("id").eq("id", tier_id).single();
                    if (!tier) {
                        return jsonResponse({ success: false, error: "无效的 tier_id" }, 400);
                    }
                } else {
                    if (!credits_amount || credits_amount <= 0) {
                        return jsonResponse({ success: false, error: "credits_amount 必须大于 0" }, 400);
                    }
                }

                const finalCode = code ? code.toUpperCase().trim() : generateRandomCode(8);

                const { data, error } = await supabase
                    .from("redemption_codes")
                    .insert({
                        code: finalCode,
                        credits_amount: code_type === "subscription" ? 0 : Number(credits_amount),
                        max_uses: Number(max_uses),
                        code_type,
                        description: description || null,
                        expires_at: expires_at || null,
                        created_by: admin_phone,
                        tier_id: code_type === "subscription" ? tier_id : null,
                    })
                    .select()
                    .single();

                if (error) {
                    if (error.code === "23505") {
                        await logAudit("create_redemption_code", null, params, false, "兑换码已存在");
                        return jsonResponse({ success: false, error: "兑换码已存在" }, 400);
                    }
                    await logAudit("create_redemption_code", null, params, false, error.message);
                    return jsonResponse({ success: false, error: error.message }, 500);
                }
                await logAudit("create_redemption_code", null, params, true);
                return jsonResponse({ success: true, data });
            }

            // ==================== 批量创建兑换码 ====================
            case "batch_create_redemption_codes": {
                const { count, prefix = "", credits_amount, max_uses = 1, code_type = "promo", description = "", expires_at, tier_id } = params;
                if (!count || count <= 0 || count > 500) {
                    return jsonResponse({ success: false, error: "count 必须在 1-500 之间" }, 400);
                }

                if (code_type === "subscription") {
                    if (!tier_id) {
                        return jsonResponse({ success: false, error: "订阅码必须指定 tier_id" }, 400);
                    }
                    const { data: tier } = await supabase.from("subscription_tiers").select("id").eq("id", tier_id).single();
                    if (!tier) {
                        return jsonResponse({ success: false, error: "无效的 tier_id" }, 400);
                    }
                } else {
                    if (!credits_amount || credits_amount <= 0) {
                        return jsonResponse({ success: false, error: "credits_amount 必须大于 0" }, 400);
                    }
                }

                const codes: string[] = [];
                const usedCodes = new Set<string>();
                for (let i = 0; i < count; i++) {
                    let c: string;
                    do {
                        c = (prefix ? prefix.toUpperCase() : "") + generateRandomCode(prefix ? 6 : 8);
                    } while (usedCodes.has(c));
                    usedCodes.add(c);
                    codes.push(c);
                }

                const rows = codes.map(c => ({
                    code: c,
                    credits_amount: code_type === "subscription" ? 0 : Number(credits_amount),
                    max_uses: Number(max_uses),
                    code_type,
                    description: description || null,
                    expires_at: expires_at || null,
                    created_by: admin_phone,
                    tier_id: code_type === "subscription" ? tier_id : null,
                }));

                const { data, error } = await supabase
                    .from("redemption_codes")
                    .insert(rows)
                    .select("code");

                if (error) { await logAudit("batch_create_redemption_codes", null, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("batch_create_redemption_codes", null, params, true);
                return jsonResponse({ success: true, codes: (data || []).map((d: any) => d.code), count: (data || []).length });
            }

            // ==================== 禁用/启用兑换码 ====================
            case "disable_redemption_code": {
                const { code_id, is_active } = params;
                if (!code_id || is_active === undefined) {
                    return jsonResponse({ success: false, error: "缺少 code_id 或 is_active" }, 400);
                }

                const { error } = await supabase
                    .from("redemption_codes")
                    .update({ is_active: !!is_active })
                    .eq("id", code_id);

                if (error) { await logAudit("disable_redemption_code", code_id, params, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("disable_redemption_code", code_id, params, true);
                return jsonResponse({ success: true });
            }

            // ==================== 批量禁用已用完的兑换码 ====================
            case "batch_disable_used_codes": {
                const { data: usedCodes, error: findErr } = await supabase
                    .from("redemption_codes")
                    .select("id")
                    .eq("is_active", true)
                    .filter("current_uses", "gte", "max_uses");

                if (findErr) { await logAudit("batch_disable_used_codes", null, {}, false, findErr.message); return jsonResponse({ success: false, error: findErr.message }, 500); }

                const ids = (usedCodes || []).map((c: any) => c.id);
                if (ids.length === 0) {
                    await logAudit("batch_disable_used_codes", null, {}, true, "无需禁用");
                    return jsonResponse({ success: true, affected: 0 });
                }

                const { error } = await supabase
                    .from("redemption_codes")
                    .update({ is_active: false })
                    .in("id", ids);

                if (error) { await logAudit("batch_disable_used_codes", null, {}, false, error.message); return jsonResponse({ success: false, error: error.message }, 500); }
                await logAudit("batch_disable_used_codes", null, { affected: ids.length }, true);
                return jsonResponse({ success: true, affected: ids.length });
            }

            case "create_agent": {
                const { user_id, domain, brand_name, logo_url, credits_rate, status, pricing } = params;
                if (!user_id || !domain || !brand_name) return jsonResponse({ success: false, error: "缺少必填字段" });

                const { data: agent, error } = await supabase.from("agents").insert({
                    user_id, domain, brand_name, logo_url: logo_url || null,
                    credits_rate: credits_rate || 100, status: status || 'active',
                }).select().single();

                if (error) { await logAudit("create_agent", null, { domain }, false, error.message); return jsonResponse({ success: false, error: error.message }); }

                // 写入定价（管理员只设置成本价，售价默认为0，由代理自己设置）
                if (pricing && pricing.length > 0) {
                    const rows = pricing.map((p: any) => ({
                        agent_id: agent.id, tier_id: p.tier_id,
                        cost_price: p.cost_price, sell_price: 0, is_active: false,
                    }));
                    await supabase.from("agent_tier_pricing").insert(rows);
                }

                await logAudit("create_agent", null, { agent_id: agent.id, domain }, true);
                return jsonResponse({ success: true, agent_id: agent.id });
            }

            case "update_agent": {
                const { agent_id, domain, brand_name, logo_url, credits_rate, status, balance, pricing } = params;
                if (!agent_id) return jsonResponse({ success: false, error: "缺少 agent_id" });

                const updates: any = {};
                if (domain !== undefined) updates.domain = domain;
                if (brand_name !== undefined) updates.brand_name = brand_name;
                if (logo_url !== undefined) updates.logo_url = logo_url;
                if (credits_rate !== undefined) updates.credits_rate = credits_rate;
                if (status !== undefined) updates.status = status;
                if (balance !== undefined) updates.balance = balance;

                const { error } = await supabase.from("agents").update(updates).eq("id", agent_id);
                if (error) { await logAudit("update_agent", null, { agent_id }, false, error.message); return jsonResponse({ success: false, error: error.message }); }

                // 更新定价（只更新成本价，保留代理设置的售价）
                if (pricing) {
                    for (const p of pricing) {
                        // 先查询是否存在
                        const { data: existing } = await supabase
                            .from("agent_tier_pricing")
                            .select("*")
                            .eq("agent_id", agent_id)
                            .eq("tier_id", p.tier_id)
                            .maybeSingle();

                        if (existing) {
                            // 存在则只更新成本价
                            await supabase.from("agent_tier_pricing")
                                .update({ cost_price: p.cost_price })
                                .eq("agent_id", agent_id)
                                .eq("tier_id", p.tier_id);
                        } else {
                            // 不存在则插入新记录
                            await supabase.from("agent_tier_pricing").insert({
                                agent_id,
                                tier_id: p.tier_id,
                                cost_price: p.cost_price,
                                sell_price: 0,
                                is_active: false,
                            });
                        }
                    }
                }

                await logAudit("update_agent", null, { agent_id, ...updates }, true);
                return jsonResponse({ success: true });
            }

            case "process_withdrawal": {
                const { withdrawal_id, action, admin_note } = params;
                if (!withdrawal_id || !action) return jsonResponse({ success: false, error: "缺少参数" });

                const { data: wd, error: wdErr } = await supabase
                    .from("agent_withdrawals").select("*").eq("id", withdrawal_id).single();
                if (wdErr || !wd) return jsonResponse({ success: false, error: "提现记录不存在" });
                if (wd.status !== 'pending') return jsonResponse({ success: false, error: "该提现已处理" });

                if (action === 'approve') {
                    await supabase.from("agent_withdrawals").update({
                        status: 'approved', admin_note: admin_note || null, processed_at: new Date().toISOString(),
                    }).eq("id", withdrawal_id);
                    await logAudit("approve_withdrawal", null, { withdrawal_id, amount: wd.amount, agent_id: wd.agent_id }, true);
                } else if (action === 'reject') {
                    // 退回余额
                    const { data: agent } = await supabase.from("agents").select("balance").eq("id", wd.agent_id).single();
                    const newBalance = Number(agent?.balance || 0) + Number(wd.amount);
                    await supabase.from("agents").update({ balance: newBalance }).eq("id", wd.agent_id);
                    await supabase.from("agent_withdrawals").update({
                        status: 'rejected', admin_note: admin_note || null, processed_at: new Date().toISOString(),
                    }).eq("id", withdrawal_id);
                    await supabase.from("agent_transactions").insert({
                        agent_id: wd.agent_id, type: 'withdrawal_reject',
                        amount: Number(wd.amount), balance_after: newBalance,
                        reference_id: withdrawal_id, description: '提现被拒绝，退回余额',
                    });
                    await logAudit("reject_withdrawal", null, { withdrawal_id, amount: wd.amount, agent_id: wd.agent_id }, true);
                } else {
                    return jsonResponse({ success: false, error: "action 必须是 approve 或 reject" });
                }

                return jsonResponse({ success: true });
            }

            default:
                return jsonResponse({ success: false, error: `未知操作类型: ${action_type}` }, 400);
        }
    } catch (err: any) {
        console.error("[admin-action] error:", err);
        return jsonResponse({ success: false, error: err.message || "服务器错误" }, 500);
    }
});