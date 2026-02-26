import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isAdminPhone, isAdminUser, getSupabase } from "../_shared/admin.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedPhone } from "../_shared/auth.ts";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { admin_phone: bodyAdminPhone, query_type, params = {} } = await req.json();
        const admin_phone = await getAuthenticatedPhone(req, bodyAdminPhone);

        // 支持 phone 或 userId 鉴权
        let authorized = false;
        if (admin_phone && isAdminPhone(admin_phone)) {
            authorized = true;
        } else {
            // 尝试从 session 获取 userId 判断
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

        switch (query_type) {
            // ==================== 概览 ====================
            case "overview": {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

                // 并行查询
                const [usersRes, todayUsersRes, ordersRes, todayOrdersRes, subsRes, recentRes] = await Promise.all([
                    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
                    supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
                    supabase.from("payment_orders").select("amount").eq("status", "paid"),
                    supabase.from("payment_orders").select("amount").eq("status", "paid").gte("paid_at", todayStart),
                    supabase.from("user_subscriptions").select("tier_id, subscription_tiers(name)").eq("status", "active"),
                    supabase.from("generation_tasks").select("id, user_id, user_phone, model, task_type, status, credits_cost, created_at").order("created_at", { ascending: false }).limit(20),
                ]);
                const totalRevenue = (ordersRes.data || []).reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
                const todayRevenue = (todayOrdersRes.data || []).reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

                // 套餐分布
                const tierDist: Record<string, number> = {};
                for (const sub of (subsRes.data || [])) {
                    const name = (sub as any).subscription_tiers?.name || sub.tier_id;
                    tierDist[name] = (tierDist[name] || 0) + 1;
                }

                // 为 recent_tasks 附加 nickname
                const tasks = recentRes.data || [];
                const userIds = [...new Set(tasks.map((t: any) => t.user_id).filter(Boolean))];
                let nicknameMap: Record<string, string> = {};
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase.from("user_profiles").select("id, nickname").in("id", userIds);
                    for (const p of (profiles || [])) nicknameMap[p.id] = p.nickname;
                }
                const recentTasks = tasks.map((t: any) => ({ ...t, nickname: nicknameMap[t.user_id] || t.user_phone || t.user_id?.slice(0, 8) }));

                return jsonResponse({
                    success: true,
                    data: {
                        total_users: usersRes.count || 0,
                        today_users: todayUsersRes.count || 0,
                        total_revenue: totalRevenue,
                        today_revenue: todayRevenue,
                        active_subscriptions: (subsRes.data || []).length,
                        tier_distribution: tierDist,
                        recent_tasks: recentTasks,
                    }
                });
            }

            // ==================== 用户列表 ====================
            case "users": {
                const { page = 1, page_size = 20, search = "" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                let query = supabase
                    .from("user_profiles")
                    .select("id, phone, email, nickname, credits, subscription_tier, created_at, last_daily_credit_at", { count: "exact" })
                    .order("created_at", { ascending: false })
                    .range(from, to);

                if (search) {
                    query = query.or(`phone.like.%${search}%,email.like.%${search}%,nickname.like.%${search}%`);
                }

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                return jsonResponse({ success: true, data, total: count || 0 });
            }

            // ==================== 用户详情 ====================
            case "user_detail": {
                const { phone, user_id } = params;
                if (!phone && !user_id) return jsonResponse({ success: false, error: "缺少 phone 或 user_id" }, 400);

                let profileQuery = supabase.from("user_profiles").select("*");
                if (user_id) profileQuery = profileQuery.eq("id", user_id);
                else profileQuery = profileQuery.eq("phone", phone);

                const profileRes = await profileQuery.single();
                const lookupId = profileRes.data?.id;
                const lookupPhone = profileRes.data?.phone;

                const [tasksRes, ordersRes, allTasksRes, redemptionRes] = await Promise.all([
                    lookupId
                        ? supabase.from("generation_tasks").select("*").eq("user_id", lookupId).order("created_at", { ascending: false }).limit(50)
                        : supabase.from("generation_tasks").select("*").eq("user_phone", lookupPhone).order("created_at", { ascending: false }).limit(50),
                    lookupPhone
                        ? supabase.from("payment_orders").select("*").eq("user_phone", lookupPhone).order("created_at", { ascending: false }).limit(50)
                        : { data: [] },
                    // 全量任务用于按模型聚合
                    lookupId
                        ? supabase.from("generation_tasks").select("model, credits_cost, status, created_at").eq("user_id", lookupId).eq("status", "completed")
                        : supabase.from("generation_tasks").select("model, credits_cost, status, created_at").eq("user_phone", lookupPhone).eq("status", "completed"),
                    // 兑换记录聚合
                    lookupId
                        ? supabase.from("redemption_records").select("credits_amount").eq("user_id", lookupId)
                        : { data: [] },
                ]);

                // 按模型聚合积分消耗
                const creditsByModel: Record<string, number> = {};
                let totalConsumed = 0;
                for (const t of (allTasksRes.data || [])) {
                    const m = t.model || 'unknown';
                    creditsByModel[m] = (creditsByModel[m] || 0) + (t.credits_cost || 0);
                    totalConsumed += (t.credits_cost || 0);
                }

                const totalRecharged = (redemptionRes as any).data?.reduce((s: number, r: any) => s + (r.credits_amount || 0), 0) || 0;
                const totalPaid = ((ordersRes as any).data || []).filter((o: any) => o.status === 'paid').reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

                // 最后活跃时间：最近一条任务
                const lastTask = (tasksRes.data || [])[0];
                const lastActiveAt = lastTask?.created_at || null;

                return jsonResponse({
                    success: true,
                    data: {
                        profile: profileRes.data,
                        tasks: tasksRes.data || [],
                        orders: (ordersRes as any).data || [],
                        credits_by_model: creditsByModel,
                        total_consumed: totalConsumed,
                        total_recharged: totalRecharged,
                        total_paid: totalPaid,
                        last_active_at: lastActiveAt,
                    }
                });
            }

            // ==================== 订单列表 ====================
            case "orders": {
                const { page = 1, page_size = 20, status = "", search = "", date_from = "", date_to = "", sort_by = "created_at", sort_order = "desc" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                let query = supabase
                    .from("payment_orders")
                    .select("*", { count: "exact" })
                    .order(sort_by, { ascending: sort_order === "asc" })
                    .range(from, to);

                if (status) query = query.eq("status", status);
                if (search) query = query.or(`out_trade_no.like.%${search}%,user_phone.like.%${search}%`);
                if (date_from) query = query.gte("created_at", date_from);
                if (date_to) query = query.lte("created_at", date_to + "T23:59:59");

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 附加用户 phone/email
                const orders = data || [];
                const orderUserIds = [...new Set(orders.map((o: any) => o.user_id).filter(Boolean))];
                let orderUserMap: Record<string, { phone: string; email: string | null }> = {};
                if (orderUserIds.length > 0) {
                    const { data: profiles } = await supabase.from("user_profiles").select("id, phone, email").in("id", orderUserIds);
                    for (const p of (profiles || [])) orderUserMap[p.id] = { phone: p.phone, email: p.email };
                }
                const enrichedOrders = orders.map((o: any) => {
                    const profile = orderUserMap[o.user_id];
                    const email = profile?.email || null;
                    // 从 @phone.local 邮箱中提取手机号
                    const phoneFromEmail = email?.match(/^(\d+)@phone\.local$/)?.[1];
                    const phone = profile?.phone || o.user_phone || phoneFromEmail || '';
                    return {
                        ...o,
                        user_phone: phone,
                        user_email: email && !email.endsWith('@phone.local') ? email : null,
                    };
                });

                return jsonResponse({ success: true, data: enrichedOrders, total: count || 0 });
            }

            // ==================== 任务列表 ====================
            case "tasks": {
                const { page = 1, page_size = 20, status = "", model = "", task_type = "", date_from = "", date_to = "" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                let query = supabase
                    .from("generation_tasks")
                    .select("*", { count: "exact" })
                    .order("created_at", { ascending: false })
                    .range(from, to);

                if (status) query = query.eq("status", status);
                if (model) query = query.like("model", `${model}%`);
                if (task_type) query = query.eq("task_type", task_type);
                if (date_from) query = query.gte("created_at", date_from);
                if (date_to) query = query.lte("created_at", date_to + "T23:59:59");

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 附加 nickname + api_key
                const tasks = data || [];
                const uids = [...new Set(tasks.map((t: any) => t.user_id).filter(Boolean))];
                const akIds = [...new Set(tasks.map((t: any) => t.api_key_id).filter(Boolean))];
                let nMap: Record<string, string> = {};
                let akMap: Record<string, string> = {};
                if (uids.length > 0) {
                    const { data: profiles } = await supabase.from("user_profiles").select("id, nickname").in("id", uids);
                    for (const p of (profiles || [])) nMap[p.id] = p.nickname;
                }
                if (akIds.length > 0) {
                    const { data: keys } = await supabase.from("freepik_api_keys").select("id, api_key").in("id", akIds);
                    for (const k of (keys || [])) akMap[k.id] = k.api_key;
                }
                const enriched = tasks.map((t: any) => ({ ...t, nickname: nMap[t.user_id] || t.user_phone || t.user_id?.slice(0, 8), api_key: akMap[t.api_key_id] || null }));

                return jsonResponse({ success: true, data: enriched, total: count || 0 });
            }

            // ==================== 订阅列表 ====================
            case "subscriptions": {
                const { page = 1, page_size = 20 } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                const { data, count, error } = await supabase
                    .from("user_subscriptions")
                    .select("*, subscription_tiers(name)", { count: "exact" })
                    .eq("status", "active")
                    .order("period_end", { ascending: true })
                    .range(from, to);

                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 附加 nickname
                const subs = data || [];
                const subUserIds = [...new Set(subs.map((s: any) => s.user_id).filter(Boolean))];
                let subNMap: Record<string, string> = {};
                if (subUserIds.length > 0) {
                    const { data: profiles } = await supabase.from("user_profiles").select("id, nickname").in("id", subUserIds);
                    for (const p of (profiles || [])) subNMap[p.id] = p.nickname;
                }
                const enrichedSubs = subs.map((s: any) => ({ ...s, nickname: subNMap[s.user_id] || s.user_phone || '' }));

                return jsonResponse({ success: true, data: enrichedSubs, total: count || 0 });
            }

            // ==================== API Key 列表 ====================
            case "api_keys": {
                const { data, error } = await supabase
                    .from("freepik_api_keys")
                    .select("id, api_key, remaining_credits, is_active, note, created_at, disabled_at")
                    .order("created_at", { ascending: false });

                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 脱敏：只显示前8位和后4位
                const masked = (data || []).map((k: any) => ({
                    ...k,
                    api_key: k.api_key.length > 12
                        ? k.api_key.slice(0, 8) + "****" + k.api_key.slice(-4)
                        : "****",
                }));

                return jsonResponse({ success: true, data: masked });
            }

            // ==================== 邀请返利 ====================
            case "referrals": {
                const { page = 1, page_size = 20, search = "" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                // 统计概览
                const [totalCodesRes, totalRewardsRes, signupRewardsRes, commissionRewardsRes] = await Promise.all([
                    supabase.from("referral_codes").select("id", { count: "exact", head: true }),
                    supabase.from("referral_rewards").select("id", { count: "exact", head: true }),
                    supabase.from("referral_rewards").select("credits_amount").eq("reward_type", "signup"),
                    supabase.from("referral_rewards").select("credits_amount").eq("reward_type", "commission"),
                ]);

                const totalSignupCredits = (signupRewardsRes.data || []).reduce((s: number, r: any) => s + r.credits_amount, 0);
                const totalCommissionCredits = (commissionRewardsRes.data || []).reduce((s: number, r: any) => s + r.credits_amount, 0);

                // 奖励明细列表（分页）
                let query = supabase
                    .from("referral_rewards")
                    .select("*", { count: "exact" })
                    .order("created_at", { ascending: false })
                    .range(from, to);

                if (search) {
                    query = query.or(`referrer_phone.like.%${search}%,referee_phone.like.%${search}%`);
                }

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                return jsonResponse({
                    success: true,
                    stats: {
                        total_referral_codes: totalCodesRes.count || 0,
                        total_rewards: totalRewardsRes.count || 0,
                        total_signup_credits: totalSignupCredits,
                        total_commission_credits: totalCommissionCredits,
                    },
                    data,
                    total: count || 0,
                });
            }

            // ==================== 兑换码列表 ====================
            case "redemption_codes": {
                const { page = 1, page_size = 20, search = "" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                let query = supabase
                    .from("redemption_codes")
                    .select("id, code, credits_amount, max_uses, current_uses, code_type, is_active, expires_at, description, created_by, created_at, tier_id", { count: "exact" })
                    .order("created_at", { ascending: false })
                    .range(from, to);

                if (search) {
                    query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
                }

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 统计
                const [totalCodesRes, totalUsesRes] = await Promise.all([
                    supabase.from("redemption_codes").select("id", { count: "exact", head: true }),
                    supabase.from("redemption_records").select("id", { count: "exact", head: true }),
                ]);

                return jsonResponse({
                    success: true,
                    stats: {
                        total_codes: totalCodesRes.count || 0,
                        total_redemptions: totalUsesRes.count || 0,
                    },
                    data,
                    total: count || 0,
                });
            }

            // ==================== 任务模型统计 ====================
            case "task_stats": {
                const { date_from = "", date_to = "" } = params;
                let query = supabase.from("generation_tasks").select("model, status, credits_cost");
                if (date_from) query = query.gte("created_at", date_from);
                if (date_to) query = query.lte("created_at", date_to + "T23:59:59");

                const { data, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                const stats: Record<string, { count: number; credits: number; completed: number; failed: number; failed_credits: number }> = {};
                for (const t of (data || [])) {
                    const m = t.model || 'unknown';
                    if (!stats[m]) stats[m] = { count: 0, credits: 0, completed: 0, failed: 0, failed_credits: 0 };
                    stats[m].count++;
                    stats[m].credits += (t.credits_cost || 0);
                    if (t.status === 'completed') stats[m].completed++;
                    if (t.status === 'failed') { stats[m].failed++; stats[m].failed_credits += (t.credits_cost || 0); }
                }
                return jsonResponse({ success: true, data: stats });
            }

            // ==================== 操作日志 ====================
            case "audit_log": {
                const { page = 1, page_size = 20, action_type = "" } = params;
                const from = (page - 1) * page_size;
                const to = from + page_size - 1;

                let query = supabase.from("admin_audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
                if (action_type) query = query.eq("action_type", action_type);

                const { data, count, error } = await query;
                if (error) return jsonResponse({ success: false, error: error.message }, 500);
                return jsonResponse({ success: true, data, total: count || 0 });
            }

            // ==================== 兑换记录查询 ====================
            case "redemption_records": {
                const { code_id } = params;
                if (!code_id) return jsonResponse({ success: false, error: "缺少 code_id" }, 400);

                const { data, error } = await supabase.from("redemption_records").select("*").eq("code_id", code_id).order("created_at", { ascending: false });
                if (error) return jsonResponse({ success: false, error: error.message }, 500);

                // 附加 nickname
                const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
                let nMap: Record<string, string> = {};
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase.from("user_profiles").select("id, nickname").in("id", userIds);
                    for (const p of (profiles || [])) nMap[p.id] = p.nickname;
                }
                const enriched = (data || []).map((r: any) => ({ ...r, nickname: nMap[r.user_id] || r.user_id?.slice(0, 8) }));
                return jsonResponse({ success: true, data: enriched });
            }

            default:
                return jsonResponse({ success: false, error: `未知查询类型: ${query_type}` }, 400);
        }
    } catch (err: any) {
        console.error("[admin-query] error:", err);
        return jsonResponse({ success: false, error: err.message || "服务器错误" }, 500);
    }
});