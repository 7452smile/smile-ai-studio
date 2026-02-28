import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callFreepikApi, deductCredits } from "../_shared/freepik.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";
const MUSIC_CREDITS_PER_SECOND = 1;

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, prompt, music_length_seconds } = await req.json();

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt || !prompt.trim()) return jsonResponse({ error: "请输入音乐描述" }, 400);
        if (prompt.length > 2500) return jsonResponse({ error: "描述不能超过 2500 字符" }, 400);
        if (!music_length_seconds || music_length_seconds < 10 || music_length_seconds > 240) {
            return jsonResponse({ error: "时长需在 10-240 秒之间" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        const creditsCost = music_length_seconds * MUSIC_CREDITS_PER_SECOND;

        const deductResult = await deductUserCreditsById(user_id, creditsCost, "Music Generation");
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        const requestBody: any = { prompt, music_length_seconds };
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
        }

        const result = await callFreepikApi("/v1/ai/music-generation", "POST", requestBody);
        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "Music Generation");
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "Music Generation");
            return jsonResponse({ error: "未获取到任务 ID" }, 500);
        }

        if (result.apiKeyId) {
            await deductCredits(result.apiKeyId, creditsCost);
        }

        const { data: taskData, error: insertError } = await supabase
            .from("generation_tasks")
            .insert({
                user_id,
                task_type: "audio",
                model: "music-generation",
                prompt: prompt.slice(0, 500),
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: { music_length_seconds }
            })
            .select()
            .single();

        if (insertError) return jsonResponse({ error: "保存任务失败" }, 500);

        return jsonResponse({
            success: true,
            task_id: taskData.id,
            freepik_task_id: freepikTaskId,
            status: "processing",
            credits_cost: creditsCost,
            remaining_credits: deductResult.remaining
        });

    } catch (error) {
        console.error("Handler error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
