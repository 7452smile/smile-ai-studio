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

        const { query_type, params = {} } = await req.json();

        switch (query_type) {
            case "my_info": {
                // 查询定价信息
                const { data: pricing } = await supabase
                    .from("agent_tier_pricing")
                    .select("tier_id, cost_price, sell_price, is_active")
                    .eq("agent_id", agent.id)
                    .order("tier_id");

                return jsonResponse({
                    success: true,
                    data: { ...agent, pricing: pricing || [] }
                });
            }

            case "stats": {
                const { count: totalUsers } = await supabase
                    .from("user_profiles")
                    .select("id", { count: "exact", head: true })
                    .eq("agent_id", agent.id);

                const { data: commData } = await supabase
                    .from("agent_transactions")
                    .select("amount")
                    .eq("agent_id", agent.id)
                    .eq("type", "commission");
                const totalCommission = (commData || []).reduce((s: number, r: any) => s + Number(r.amount), 0);

                return jsonResponse({
                    success: true,
                    data: { total_users: totalUsers || 0, total_commission: totalCommission },
                });
            }

            case "my_codes": {
                const { data: codes } = await supabase
                    .from("redemption_codes")
                    .select("*")
                    .eq("agent_id", agent.id)
                    .order("created_at", { ascending: false })
                    .limit(100);
                return jsonResponse({ success: true, data: codes || [] });
            }

            case "my_transactions": {
                const limit = params.limit || 50;
                const offset = params.offset || 0;
                const { data: txs } = await supabase
                    .from("agent_transactions")
                    .select("*")
                    .eq("agent_id", agent.id)
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);
                return jsonResponse({ success: true, data: txs || [] });
            }

            case "my_withdrawals": {
                const { data: wds } = await supabase
                    .from("agent_withdrawals")
                    .select("*")
                    .eq("agent_id", agent.id)
                    .order("created_at", { ascending: false })
                    .limit(50);
                return jsonResponse({ success: true, data: wds || [] });
            }

            case "my_users": {
                const { data: users } = await supabase
                    .from("user_profiles")
                    .select("id, nickname, phone, email, credits, created_at")
                    .eq("agent_id", agent.id)
                    .order("created_at", { ascending: false })
                    .limit(100);
                return jsonResponse({ success: true, data: users || [] });
            }

            default:
                return jsonResponse({ success: false, error: "未知查询类型" }, 400);
        }
    } catch (error) {
        console.error("[agent-query] Error:", error);
        return jsonResponse({ success: false, error: "服务器错误" }, 500);
    }
});
