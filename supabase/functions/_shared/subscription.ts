// 订阅系统共享模块 - 并发检查 + 支付签名
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 检查用户并发限制
 */
export async function checkConcurrencyById(
    userId: string,
    taskType: "image" | "video"
): Promise<{ allowed: boolean; reason?: string; tier?: string }> {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("check_concurrency_v2", {
        p_user_id: userId,
        p_task_type: taskType,
    });

    if (error) {
        console.error("[subscription] concurrency check error:", error);
        return { allowed: false, reason: "系统繁忙，请稍后重试" };
    }

    return data as { allowed: boolean; reason?: string; tier?: string };
}

/**
 * MD5 哈希（Deno 原生）
 */
async function md5(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    // Deno 内置 crypto 不支持 MD5，使用 std 库
    const { crypto: stdCrypto } = await import("https://deno.land/std@0.168.0/crypto/mod.ts");
    const hash = await stdCrypto.subtle.digest("MD5", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 生成 zpayz 支付签名
 * 规则：参数按 ASCII 排序拼接 key=value& + PKEY，然后 MD5
 */
export async function generateSign(
    params: Record<string, string>,
    pkey: string
): Promise<string> {
    const sorted = Object.keys(params)
        .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "")
        .sort();
    const str = sorted.map((k) => `${k}=${params[k]}`).join("&") + pkey;
    return await md5(str);
}

/**
 * 验证 zpayz 支付签名
 */
export async function verifySign(
    params: Record<string, string>,
    sign: string,
    pkey: string
): Promise<boolean> {
    const expected = await generateSign(params, pkey);
    return expected === sign;
}
