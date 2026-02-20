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
        const { user_id: bodyUserId } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 查询用户当前套餐
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("subscription_tier, credits")
            .eq("id", user_id)
            .single();

        if (profileError || !profile) {
            return jsonResponse({ error: "用户不存在" }, 404);
        }

        const tierId = profile.subscription_tier || "free";

        // 查询套餐详情
        const { data: tier, error: tierError } = await supabase
            .from("subscription_tiers")
            .select("*")
            .eq("id", tierId)
            .single();

        if (tierError || !tier) {
            return jsonResponse({ error: "套餐信息异常" }, 500);
        }

        // 查询活跃订阅
        let subscription = null;
        if (tierId !== "free") {
            const { data: sub } = await supabase
                .from("user_subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .eq("status", "active")
                .single();

            // 实时检查订阅是否已过期
            if (sub && new Date(sub.period_end) < new Date()) {
                // 订阅已过期，立即标记并降级
                await supabase
                    .from("user_subscriptions")
                    .update({ status: "expired" })
                    .eq("id", sub.id);
                await supabase
                    .from("user_profiles")
                    .update({ subscription_tier: "free" })
                    .eq("id", user_id);

                const { data: freeTier } = await supabase
                    .from("subscription_tiers")
                    .select("*")
                    .eq("id", "free")
                    .single();

                return jsonResponse({
                    success: true,
                    tier: "free",
                    tier_name: freeTier?.name || "免费版",
                    billing_cycle: null,
                    period_end: null,
                    credits: profile.credits,
                    max_concurrent_image: freeTier?.max_concurrent_image || 999,
                    max_concurrent_video: freeTier?.max_concurrent_video || 999,
                    max_concurrent_total: freeTier?.max_concurrent_total || 1,
                    history_hours: freeTier?.history_hours || 1,
                    persist_to_r2: false,
                    features: freeTier?.features || [],
                });
            }
            subscription = sub;
        }

        return jsonResponse({
            success: true,
            tier: tierId,
            tier_name: tier.name,
            billing_cycle: subscription?.billing_cycle || null,
            period_end: subscription?.period_end || null,
            credits: profile.credits,
            max_concurrent_image: tier.max_concurrent_image,
            max_concurrent_video: tier.max_concurrent_video,
            max_concurrent_total: tier.max_concurrent_total,
            history_hours: tier.history_hours,
            persist_to_r2: tier.persist_to_r2,
            features: tier.features || [],
        });

    } catch (error) {
        console.error("Get subscription error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
