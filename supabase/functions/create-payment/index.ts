import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSign } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";

const ZPAYZ_PID = Deno.env.get("ZPAYZ_PID") || "";
const ZPAYZ_PKEY = Deno.env.get("ZPAYZ_PKEY") || "";
// 使用 submit.php 页面跳转方式（比 mapi.php API 方式更可靠）
const ZPAYZ_SUBMIT_URL = "https://zpayz.cn/submit.php";

// PayPal
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com";

// 人民币→美元固定价格映射（tier_id + billing_cycle → USD）
const USD_PRICES: Record<string, Record<string, number>> = {
    starter:   { monthly: 2.99,  annual: 29.9 },
    advanced:  { monthly: 6.99,  annual: 69.9 },
    flagship:  { monthly: 13.99, annual: 139.9 },
    studio:    { monthly: 42.99, annual: 429.9 },
};

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

const FRONTEND_URL = "https://smile-ai-studio.com";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, user_phone: bodyPhone, tier_id, billing_cycle, pay_type = "alipay" } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);

        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!tier_id || tier_id === "free") return jsonResponse({ error: "无效的套餐" }, 400);
        if (!["monthly", "annual"].includes(billing_cycle)) return jsonResponse({ error: "无效的计费周期" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 查询套餐价格
        const { data: tier, error: tierError } = await supabase
            .from("subscription_tiers")
            .select("*")
            .eq("id", tier_id)
            .eq("is_active", true)
            .single();

        if (tierError || !tier) return jsonResponse({ error: "套餐不存在" }, 400);

        const isPayPal = pay_type === "paypal";

        // 确定金额和货币
        let amount: number;
        let currency: string;
        if (isPayPal) {
            const usdPrice = USD_PRICES[tier_id]?.[billing_cycle];
            if (!usdPrice) return jsonResponse({ error: "该套餐不支持 PayPal 支付" }, 400);
            amount = usdPrice;
            currency = "USD";
        } else {
            amount = billing_cycle === "annual" ? tier.annual_price : tier.monthly_price;
            currency = "CNY";
        }
        if (amount <= 0) return jsonResponse({ error: "无效的金额" }, 400);

        // 生成订单号
        const out_trade_no = `SAI${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

        if (isPayPal) {
            // === PayPal 支付流程 ===
            const accessToken = await getPayPalAccessToken();

            const orderPayload = {
                intent: "CAPTURE",
                purchase_units: [{
                    reference_id: out_trade_no,
                    description: `Smile AI ${tier.name} - ${billing_cycle === "annual" ? "Annual" : "Monthly"}`,
                    amount: {
                        currency_code: "USD",
                        value: amount.toFixed(2),
                    },
                }],
                payment_source: {
                    paypal: {
                        experience_context: {
                            return_url: `${FRONTEND_URL}/?out_trade_no=${out_trade_no}`,
                            cancel_url: `${FRONTEND_URL}/?payment_status=cancelled`,
                            brand_name: "Smile AI Studio",
                            user_action: "PAY_NOW",
                        },
                    },
                },
            };

            const ppResp = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderPayload),
            });

            const ppData = await ppResp.json();
            if (!ppResp.ok || !ppData.id) {
                console.error("[create-payment] PayPal create order failed:", JSON.stringify(ppData));
                return jsonResponse({ error: "创建 PayPal 订单失败" }, 500);
            }

            const approveLink = ppData.links?.find((l: any) => l.rel === "payer-action" || l.rel === "approve");
            if (!approveLink) {
                console.error("[create-payment] PayPal no approve link:", JSON.stringify(ppData.links));
                return jsonResponse({ error: "获取 PayPal 支付链接失败" }, 500);
            }

            // 保存订单
            const { error: insertError } = await supabase
                .from("payment_orders")
                .insert({
                    out_trade_no,
                    user_id,
                    user_phone: bodyPhone || null,
                    tier_id,
                    billing_cycle,
                    amount,
                    currency,
                    pay_type: "paypal",
                    paypal_order_id: ppData.id,
                    status: "pending",
                });

            if (insertError) {
                console.error("Insert order error:", insertError);
                return jsonResponse({ error: "创建订单失败" }, 500);
            }

            console.log("[create-payment] PayPal order created:", out_trade_no, "ppId:", ppData.id);

            return jsonResponse({
                success: true,
                order_id: out_trade_no,
                payment_url: approveLink.href,
                paypal_order_id: ppData.id,
                amount,
                currency,
            });

        } else {
            // === ZPAYZ 支付流程（原有逻辑） ===

            // 保存订单
            const { error: insertError } = await supabase
                .from("payment_orders")
                .insert({
                    out_trade_no,
                    user_id,
                    user_phone: bodyPhone || null,
                    tier_id,
                    billing_cycle,
                    amount,
                    currency,
                    pay_type,
                    status: "pending",
                });

            if (insertError) {
                console.error("Insert order error:", insertError);
                return jsonResponse({ error: "创建订单失败" }, 500);
            }

            // 构建 zpayz 支付参数（submit.php 跳转方式）
            const notify_url = `${WEBHOOK_BASE_URL}/payment-notify`;
            const return_url = `${WEBHOOK_BASE_URL}/payment-return`;

            const params: Record<string, string> = {
                pid: ZPAYZ_PID,
                type: pay_type,
                out_trade_no,
                notify_url,
                return_url,
                name: `Smile AI ${tier.name} - ${billing_cycle === "annual" ? "年付" : "月付"}`,
                money: amount.toFixed(2),
            };

            // 生成签名
            const sign = await generateSign(params, ZPAYZ_PKEY);

            // 拼接跳转 URL（submit.php?pid=xxx&type=xxx&...&sign=xxx&sign_type=MD5）
            const queryString = Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join("&");
            const payment_url = `${ZPAYZ_SUBMIT_URL}?${queryString}&sign=${sign}&sign_type=MD5`;

            console.log("[create-payment] Generated payment URL for order:", out_trade_no);

            return jsonResponse({
                success: true,
                order_id: out_trade_no,
                payment_url,
                amount,
            });
        }

    } catch (error) {
        console.error("Create payment error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
