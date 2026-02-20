import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySign } from "../_shared/subscription.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ZPAYZ_PID = Deno.env.get("ZPAYZ_PID") || "";
const ZPAYZ_PKEY = Deno.env.get("ZPAYZ_PKEY") || "";

serve(async (req) => {
    // 支付回调使用 GET 方式
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    console.log("[payment-notify] Received:", JSON.stringify(params));

    // 纯文本响应（zpayz 要求返回 "success"）
    const textResponse = (text: string, status = 200) =>
        new Response(text, { status, headers: { "Content-Type": "text/plain" } });

    try {
        const { pid, trade_no, out_trade_no, type, name, money, trade_status, sign } = params;

        // 基本校验
        if (pid !== ZPAYZ_PID) {
            console.error("[payment-notify] PID mismatch");
            return textResponse("fail");
        }

        // 验签
        const signParams = { ...params };
        delete signParams.sign;
        delete signParams.sign_type;
        const valid = await verifySign(signParams, sign, ZPAYZ_PKEY);
        if (!valid) {
            console.error("[payment-notify] Sign verification failed");
            return textResponse("fail");
        }

        // 只处理 TRADE_SUCCESS
        if (trade_status !== "TRADE_SUCCESS") {
            console.log("[payment-notify] Non-success status:", trade_status);
            return textResponse("success");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 查询订单（仅用于签名前的基本校验）
        const { data: order, error: orderError } = await supabase
            .from("payment_orders")
            .select("amount")
            .eq("out_trade_no", out_trade_no)
            .single();

        if (orderError || !order) {
            console.error("[payment-notify] Order not found:", out_trade_no);
            return textResponse("fail");
        }

        // 校验金额（转为整数分比较，避免浮点精度问题）
        const moneyInCents = Math.round(parseFloat(money) * 100);
        const orderInCents = Math.round(parseFloat(order.amount) * 100);
        if (moneyInCents !== orderInCents) {
            console.error("[payment-notify] Amount mismatch:", money, "vs", order.amount);
            return textResponse("fail");
        }

        // 使用原子 RPC 处理支付（带行锁防并发）— 优先用 _v2
        const { data: result, error: rpcError } = await supabase.rpc(
            "safe_process_payment_v2",
            {
                p_out_trade_no: out_trade_no,
                p_trade_no: trade_no,
                p_pay_type: type,
                p_money: parseFloat(money),
                p_notify_data: params,
            }
        );

        if (rpcError) {
            console.error("[payment-notify] RPC error:", rpcError);
            return textResponse("fail");
        }

        if (!result?.success) {
            console.error("[payment-notify] Processing failed:", JSON.stringify(result));
            return textResponse("fail");
        }

        // 已处理过的订单直接返回
        if (result.already_paid) {
            console.log("[payment-notify] Order already paid:", out_trade_no);
            return textResponse("success");
        }

        console.log("[payment-notify] Payment processed:", JSON.stringify(result));

        // 发放邀请佣金（非关键路径，失败不影响支付结果）
        const creditsAdded = result.credits_added || 0;
        if (creditsAdded > 0) {
            try {
                const { data: commResult, error: commError } = await supabase.rpc(
                    "grant_referral_commission_v2",
                    { p_order_out_trade_no: out_trade_no, p_credits_received: creditsAdded }
                );
                if (commError) {
                    console.error("[payment-notify] Referral commission error:", commError);
                } else if (commResult?.success) {
                    console.log("[payment-notify] Referral commission granted:", JSON.stringify(commResult));
                }
            } catch (e) {
                console.error("[payment-notify] Referral commission exception:", e);
            }
        }

        return textResponse("success");

    } catch (error) {
        console.error("[payment-notify] Error:", error);
        return textResponse("fail");
    }
});
