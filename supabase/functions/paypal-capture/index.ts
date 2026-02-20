import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
    const resp = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    const data = await resp.json();
    if (!data.access_token) throw new Error("Failed to get PayPal access token");
    return data.access_token;
}

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, paypal_order_id, out_trade_no } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);

        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!paypal_order_id || !out_trade_no) return jsonResponse({ error: "缺少订单信息" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 查询订单，确认属于该用户且未支付
        const { data: order, error: orderError } = await supabase
            .from("payment_orders")
            .select("*")
            .eq("out_trade_no", out_trade_no)
            .eq("paypal_order_id", paypal_order_id)
            .eq("user_id", user_id)
            .single();

        if (orderError || !order) {
            console.error("[paypal-capture] Order not found:", out_trade_no);
            return jsonResponse({ error: "订单不存在" }, 404);
        }

        if (order.status === "paid") {
            return jsonResponse({ success: true, already_paid: true });
        }

        // Capture PayPal 订单
        const accessToken = await getPayPalAccessToken();
        const captureResp = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypal_order_id}/capture`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });

        const captureData = await captureResp.json();
        console.log("[paypal-capture] Capture response:", JSON.stringify(captureData));

        if (captureData.status !== "COMPLETED") {
            console.error("[paypal-capture] Capture not completed:", captureData.status);
            return jsonResponse({ error: "PayPal 支付未完成", detail: captureData.status }, 400);
        }

        // 验证金额
        const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        const paidAmount = parseFloat(capture?.amount?.value || "0");
        const orderAmount = parseFloat(order.amount);
        if (Math.abs(paidAmount - orderAmount) > 0.01) {
            console.error("[paypal-capture] Amount mismatch:", paidAmount, "vs", orderAmount);
            return jsonResponse({ error: "金额不匹配" }, 400);
        }

        // 使用原子 RPC 处理支付（复用现有逻辑）
        const { data: result, error: rpcError } = await supabase.rpc(
            "safe_process_payment_v2",
            {
                p_out_trade_no: out_trade_no,
                p_trade_no: paypal_order_id,
                p_pay_type: "paypal",
                p_money: orderAmount,
                p_notify_data: captureData,
            }
        );

        if (rpcError) {
            console.error("[paypal-capture] RPC error:", rpcError);
            return jsonResponse({ error: "处理支付失败" }, 500);
        }

        if (!result?.success) {
            console.error("[paypal-capture] Processing failed:", JSON.stringify(result));
            return jsonResponse({ error: "激活订阅失败" }, 500);
        }

        if (result.already_paid) {
            console.log("[paypal-capture] Already paid:", out_trade_no);
            return jsonResponse({ success: true, already_paid: true });
        }

        console.log("[paypal-capture] Payment processed:", JSON.stringify(result));

        // 发放邀请佣金
        const creditsAdded = result.credits_added || 0;
        if (creditsAdded > 0) {
            try {
                await supabase.rpc("grant_referral_commission_v2", {
                    p_order_out_trade_no: out_trade_no,
                    p_credits_received: creditsAdded,
                });
            } catch (e) {
                console.error("[paypal-capture] Referral commission exception:", e);
            }
        }

        return jsonResponse({ success: true });

    } catch (error) {
        console.error("[paypal-capture] Error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
