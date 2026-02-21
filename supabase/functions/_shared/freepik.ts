// Freepik API 通用工具函数
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 余额不足的错误消息
const QUOTA_EXCEEDED_MESSAGE = "Hello! You've reached the default usage limit";

// 冷却时间 24 小时
const COOLDOWN_HOURS = 24;

/**
 * 获取可用的 API Key（排除冷却中的 key）
 */
export async function getAvailableApiKey(): Promise<{ id: string; api_key: string } | null> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cooldownThreshold = new Date().toISOString();

    // 选 is_active=true 且（没有冷却时间 或 冷却已过期）的 key，按余额降序
    const { data, error } = await supabase
        .from("freepik_api_keys")
        .select("id, api_key")
        .eq("is_active", true)
        .or(`cooldown_until.is.null,cooldown_until.lt.${cooldownThreshold}`)
        .order("remaining_credits", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        console.error("No available API key:", error);
        return null;
    }

    return data;
}

/**
 * 将 API Key 设置为冷却状态（24小时后自动恢复可用）
 */
export async function cooldownApiKey(keyId: string): Promise<void> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cooldownUntil = new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

    await supabase
        .from("freepik_api_keys")
        .update({ cooldown_until: cooldownUntil })
        .eq("id", keyId);

    console.log(`API Key ${keyId} in cooldown until ${cooldownUntil}`);
}

/**
 * 扣减 API Key 积分
 */
export async function deductCredits(keyId: string, amount: number): Promise<void> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.rpc("deduct_api_key_credits", {
        p_key_id: keyId,
        p_amount: amount,
    });

    if (error) {
        console.error("[freepik] deduct credits error:", error);
    }
}

/**
 * 检查响应是否为余额不足错误
 */
export function isQuotaExceededError(responseBody: any): boolean {
    if (typeof responseBody === "object" && responseBody.message) {
        return responseBody.message.includes(QUOTA_EXCEEDED_MESSAGE);
    }
    return false;
}

/**
 * 调用 Freepik API（带自动重试切换 Key）
 */
export async function callFreepikApi(
    endpoint: string,
    method: "GET" | "POST",
    body?: any,
    maxRetries: number = 3
): Promise<{ success: boolean; data?: any; error?: string; apiKeyId?: string }> {

    let lastError = "";
    const triedKeyIds = new Set<string>();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const apiKey = await getAvailableApiKey();

        if (!apiKey) {
            return { success: false, error: "没有可用的 API Key" };
        }

        // 已因限流被冷却的 key 不再重试
        if (triedKeyIds.has(apiKey.id)) {
            return { success: false, error: "没有可用的 API Key" };
        }

        try {
            const response = await fetch(`https://api.freepik.com${endpoint}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "x-freepik-api-key": apiKey.api_key
                },
                body: body ? JSON.stringify(body) : undefined
            });

            const responseData = await response.json();

            // 检查是否触发限流
            if (isQuotaExceededError(responseData)) {
                console.log(`API Key ${apiKey.id} quota exceeded, cooling down and switching...`);
                await cooldownApiKey(apiKey.id);
                triedKeyIds.add(apiKey.id);
                lastError = "API Key 触发限流，正在切换...";
                continue;
            }

            // 其他错误
            if (!response.ok) {
                return {
                    success: false,
                    error: responseData.message || `HTTP ${response.status}`,
                    apiKeyId: apiKey.id
                };
            }

            // 成功
            return {
                success: true,
                data: responseData,
                apiKeyId: apiKey.id
            };

        } catch (err) {
            lastError = String(err);
            console.error(`Freepik API call failed:`, err);
        }
    }

    return { success: false, error: lastError || "所有 API Key 均不可用" };
}
