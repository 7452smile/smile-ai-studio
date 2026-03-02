import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 主站域名（不返回代理配置）
const MAIN_DOMAINS = ["smile-ai-studio.com", "www.smile-ai-studio.com", "localhost"];

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const url = new URL(req.url);
        const domain = url.searchParams.get("domain") || "";

        if (!domain || MAIN_DOMAINS.some(d => domain === d || domain.endsWith("." + d)) || domain.startsWith("localhost")) {
            return jsonResponse({ agent: null });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 标准化域名：去掉协议和尾部斜杠
        const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        // 查询所有活跃代理
        const { data: agents } = await supabase
            .from("agents")
            .select("id, domain, brand_name, logo_url, credits_rate, status, contact_wechat, contact_telegram, contact_email, enable_telegram, enable_email")
            .eq("status", "active");

        // 查找匹配的代理（容错处理）
        const agent = agents?.find(a => {
            const dbDomain = a.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            return dbDomain === normalizedDomain;
        });

        if (!agent) {
            return jsonResponse({ agent: null });
        }

        // 查询代理套餐定价
        const { data: pricing } = await supabase
            .from("agent_tier_pricing")
            .select("tier_id, sell_price, is_active")
            .eq("agent_id", agent.id)
            .eq("is_active", true);

        return jsonResponse({
            agent: {
                id: agent.id,
                brand_name: agent.brand_name,
                logo_url: agent.logo_url,
                contact_wechat: agent.contact_wechat,
                contact_telegram: agent.contact_telegram,
                contact_email: agent.contact_email,
                enable_telegram: agent.enable_telegram,
                enable_email: agent.enable_email,
                tier_pricing: (pricing || []).map(p => ({
                    tier_id: p.tier_id,
                    sell_price: p.sell_price,
                })),
            },
        });
    } catch (error) {
        console.error("[agent-config] Error:", error);
        return jsonResponse({ agent: null });
    }
});
