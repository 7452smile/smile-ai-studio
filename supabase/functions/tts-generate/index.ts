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
const TTS_CREDITS_PER_1000_CHARS = 5;

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, text, voice_id, stability = 0.5, similarity_boost = 0.2, speed = 1, use_speaker_boost = true } = await req.json();

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!text || text.length === 0) return jsonResponse({ error: "请输入文本" }, 400);
        if (!voice_id) return jsonResponse({ error: "请选择声音" }, 400);

        const textLength = text.replace(/\n/g, '').length;
        if (textLength === 0) return jsonResponse({ error: "请输入文本" }, 400);
        if (textLength > 40000) return jsonResponse({ error: "文本不能超过 40000 字符" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 并发检查（复用图片并发槽）
        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分
        const creditsCost = Math.ceil(textLength / 1000) * TTS_CREDITS_PER_1000_CHARS;

        // 预扣积分
        const deductResult = await deductUserCreditsById(user_id, creditsCost, "ElevenLabs TTS");
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        const requestBody: any = { text, voice_id, stability, similarity_boost, speed, use_speaker_boost };
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
        }

        const result = await callFreepikApi("/v1/ai/voiceover/elevenlabs-turbo-v2-5", "POST", requestBody);
        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "ElevenLabs TTS");
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "ElevenLabs TTS");
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
                model: "elevenlabs-tts",
                prompt: text.slice(0, 500),
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: { voice_id, stability, similarity_boost, speed, use_speaker_boost, text_length: text.length }
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
