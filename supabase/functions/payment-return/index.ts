import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySign } from "../_shared/subscription.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ZPAYZ_PID = Deno.env.get("ZPAYZ_PID") || "";
const ZPAYZ_PKEY = Deno.env.get("ZPAYZ_PKEY") || "";

// 前端页面 URL
const FRONTEND_URL = "https://smile-ai-studio.com";

serve(async (req) => {
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    console.log("[payment-return] Received:", JSON.stringify(params));

    try {
        const { pid, trade_no, out_trade_no, type, name, money, trade_status, sign } = params;

        // 验签
        const signParams = { ...params };
        delete signParams.sign;
        delete signParams.sign_type;
        const valid = await verifySign(signParams, sign, ZPAYZ_PKEY);

        if (!valid || pid !== ZPAYZ_PID) {
            return Response.redirect(`${FRONTEND_URL}/?payment_status=error`, 302);
        }

        // 查询订单的代理信息，决定跳转域名
        let redirectBase = FRONTEND_URL;
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: order } = await supabase
                .from("payment_orders")
                .select("agent_id")
                .eq("out_trade_no", out_trade_no)
                .single();
            if (order?.agent_id) {
                const { data: agent } = await supabase
                    .from("agents")
                    .select("domain")
                    .eq("id", order.agent_id)
                    .single();
                if (agent?.domain) {
                    redirectBase = `https://${agent.domain}`;
                }
            }
        } catch (e) {
            console.error("[payment-return] Agent lookup error:", e);
        }

        if (trade_status === "TRADE_SUCCESS") {
            return Response.redirect(
                `${redirectBase}/?payment_status=success&out_trade_no=${out_trade_no}`,
                302
            );
        }

        return Response.redirect(`${redirectBase}/?payment_status=pending`, 302);

    } catch (error) {
        console.error("[payment-return] Error:", error);
        return Response.redirect(`${FRONTEND_URL}/?payment_status=error`, 302);
    }
});
