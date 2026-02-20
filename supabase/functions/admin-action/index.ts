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
                    // 加积分：用 refund_user_credits_v2
                    const { data, error } = await supabase.rpc("refund_user_credits_v2", {
                        p_user_id: profile.id,
                        p_amount: numAmount,
                    });
                    if (error) return jsonResponse({ success: false, error: error.message }, 500);
                    return jsonResponse({ success: true, remaining: data });
                } else {
                    // 扣积分：用 deduct_user_credits_v2
                    const { data, error } = await supabase.rpc("deduct_user_credits_v2", {
                        p_user_id: profile.id,
                        p_amount: Math.abs(numAmount),
                    });
                    if (error) return jsonResponse({ success: false, error: error.message }, 500);
                    if (data === -1) return jsonResponse({ success: false, error: "积分不足" }, 400);
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

                if (error) return jsonResponse({ success: false, error: error.message }, 500);
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
                const { error: activateErr } = await supabase.rpc("activate_subscription", {
                    p_phone: order.user_phone,
                    p_tier_id: order.tier_id,
                    p_billing_cycle: order.billing_cycle,
                    p_out_trade_no: out_trade_no,
                });

                if (activateErr) {
                    return jsonResponse({ success: false, error: "订阅激活失败: " + activateErr.message }, 500);
                }

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

                if (error) return jsonResponse({ success: false, error: error.message }, 500);
                return jsonResponse({ success: true });
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
                        return jsonResponse({ success: false, error: "兑换码已存在" }, 400);
                    }
                    return jsonResponse({ success: false, error: error.message }, 500);
                }
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

                if (error) return jsonResponse({ success: false, error: error.message }, 500);
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

                if (error) return jsonResponse({ success: false, error: error.message }, 500);
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