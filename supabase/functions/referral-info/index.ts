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
        if (!user_id) {
            return jsonResponse({ error: "缺少用户信息" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 确保用户有邀请码
        const { data: genResult } = await supabase.rpc("generate_referral_code_v2", { p_user_id: user_id });
        const referralCode = genResult?.code || "";

        // 查询奖励记录（作为邀请人）
        const { data: rewards, error: rewardsError } = await supabase
            .from("referral_rewards")
            .select("referee_phone, reward_type, credits_amount, purchase_count, created_at")
            .eq("referrer_id", user_id)
            .order("created_at", { ascending: false });

        if (rewardsError) {
            console.error("[referral-info] Query error:", rewardsError);
            return jsonResponse({ error: "查询失败" }, 500);
        }

        const rewardList = rewards || [];

        // 统计
        const signupRewards = rewardList.filter((r: any) => r.reward_type === "signup");
        const commissionRewards = rewardList.filter((r: any) => r.reward_type === "commission");

        // 统计邀请人数（去重 referee_phone，仅 signup 类型）
        const uniqueReferees = new Set(signupRewards.map((r: any) => r.referee_phone));

        const totalSignupBonus = signupRewards.reduce((sum: number, r: any) => sum + r.credits_amount, 0);
        const totalCommission = commissionRewards.reduce((sum: number, r: any) => sum + r.credits_amount, 0);

        // 手机号脱敏
        const maskedRewards = rewardList.map((r: any) => ({
            ...r,
            referee_phone: r.referee_phone
                ? r.referee_phone.slice(0, 3) + "****" + r.referee_phone.slice(-4)
                : "",
        }));

        return jsonResponse({
            success: true,
            referral_code: referralCode,
            total_referrals: uniqueReferees.size,
            total_signup_bonus: totalSignupBonus,
            total_commission: totalCommission,
            rewards: maskedRewards,
        });
    } catch (error) {
        console.error("[referral-info] Error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
