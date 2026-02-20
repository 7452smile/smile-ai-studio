// 用户积分操作模块 - 封装 RPC 调用（UUID only）
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 预扣用户积分（原子操作）
 */
export async function deductUserCreditsById(
    userId: string,
    amount: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("deduct_user_credits_v2", {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        console.error("[userCredits] deduct error:", error);
        return { success: false, error: "积分扣除失败" };
    }

    if (data === -1) {
        return { success: false, error: "积分不足，请充值后再试" };
    }

    console.log(`[userCredits] Deducted ${amount} from userId=${userId}, remaining: ${data}`);
    return { success: true, remaining: data };
}

/**
 * 退还用户积分
 */
export async function refundUserCreditsById(
    userId: string,
    amount: number,
    taskId?: string
): Promise<{ success: boolean; remaining?: number }> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("refund_user_credits_v2", {
        p_user_id: userId,
        p_amount: amount,
    });

    if (error) {
        console.error("[userCredits] refund error:", error);
        try {
            await supabase.rpc("log_failed_refund_v2", {
                p_user_id: userId,
                p_amount: amount,
                p_task_id: taskId || null,
                p_source: "edge_function",
                p_reason: error.message || "refund RPC failed",
            });
            console.error(`[userCredits] Logged failed refund: ${amount} credits for userId=${userId}`);
        } catch (logError) {
            console.error("[userCredits] CRITICAL: Failed to log refund failure:", logError);
        }
        return { success: false };
    }

    console.log(`[userCredits] Refunded ${amount} to userId=${userId}, remaining: ${data}`);
    return { success: true, remaining: data };
}

/**
 * 查询用户积分余额
 */
export async function getUserCreditsById(userId: string): Promise<number> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("get_user_credits_v2", {
        p_user_id: userId,
    });

    if (error) {
        console.error("[userCredits] get error:", error);
        return -1;
    }

    return data;
}
