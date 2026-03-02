import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const userId = await getAuthenticatedUserId(req);
        if (!userId) return jsonResponse({ success: false, error: "未登录" }, 401);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 验证代理身份
        const { data: agent, error: agentErr } = await supabase
            .from("agents")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();
        if (agentErr || !agent) return jsonResponse({ success: false, error: "非代理用户" }, 403);

        const { action_type, params = {} } = await req.json();

        switch (action_type) {
            case "create_code": {
                const { code_type, credits_amount, tier_id, max_uses, expires_days } = params;
                const code = `AG${agent.id.slice(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                const expiresAt = expires_days
                    ? new Date(Date.now() + expires_days * 86400000).toISOString()
                    : new Date(Date.now() + 365 * 86400000).toISOString();

                const { data: result, error } = await supabase.rpc("agent_purchase_redeem_code", {
                    p_agent_id: agent.id,
                    p_code: code,
                    p_code_type: code_type || "promo",
                    p_credits_amount: credits_amount || 0,
                    p_tier_id: tier_id || null,
                    p_max_uses: max_uses || 1,
                    p_expires_at: expiresAt,
                    p_description: `代理${agent.brand_name}创建`,
                });

                if (error) {
                    console.error("[agent-action] create_code error:", error);
                    return jsonResponse({ success: false, error: error.message });
                }
                if (result && !result.success) {
                    return jsonResponse({ success: false, error: result.error });
                }

                return jsonResponse({ success: true, code, cost: result?.cost });
            }

            case "request_withdrawal": {
                const { amount } = params;
                if (!amount || amount <= 0) return jsonResponse({ success: false, error: "金额无效" });

                const { data: result, error } = await supabase.rpc("agent_request_withdrawal", {
                    p_agent_id: agent.id,
                    p_amount: amount,
                });

                if (error) {
                    console.error("[agent-action] withdrawal error:", error);
                    return jsonResponse({ success: false, error: error.message });
                }
                if (result && !result.success) {
                    return jsonResponse({ success: false, error: result.error });
                }

                return jsonResponse({ success: true, new_balance: result?.new_balance });
            }

            case "update_pricing": {
                const { pricing } = params;
                if (!Array.isArray(pricing)) return jsonResponse({ success: false, error: "无效的定价数据" });

                // 验证售价 >= 成本价
                for (const p of pricing) {
                    if (p.sell_price > 0 && p.sell_price < p.cost_price) {
                        return jsonResponse({ success: false, error: `${p.tier_id} 售价不能低于成本价` });
                    }
                }

                // 更新定价
                for (const p of pricing) {
                    await supabase
                        .from("agent_tier_pricing")
                        .update({
                            sell_price: p.sell_price,
                            is_active: p.sell_price > 0
                        })
                        .eq("agent_id", agent.id)
                        .eq("tier_id", p.tier_id);
                }

                return jsonResponse({ success: true });
            }

            case "update_contact": {
                const { contact_wechat, contact_telegram, contact_email, enable_telegram, enable_email } = params;

                const { error } = await supabase
                    .from("agents")
                    .update({
                        contact_wechat,
                        contact_telegram,
                        contact_email,
                        enable_telegram,
                        enable_email,
                    })
                    .eq("id", agent.id);

                if (error) {
                    console.error("[agent-action] update_contact error:", error);
                    return jsonResponse({ success: false, error: error.message });
                }

                return jsonResponse({ success: true });
            }

            default:
                return jsonResponse({ success: false, error: "未知操作类型" }, 400);
        }
    } catch (error) {
        console.error("[agent-action] Error:", error);
        return jsonResponse({ success: false, error: "服务器错误" }, 500);
    }
});
