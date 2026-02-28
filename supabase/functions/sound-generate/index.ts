import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callFreepikApi, deductCredits } from "../_shared/freepik.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";
import { translate, hasChinese } from "../_shared/translate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";
const SOUND_EFFECT_CREDITS_COST = 2;

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, text, duration_seconds, loop, prompt_influence } = await req.json();

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!text || !text.trim()) return jsonResponse({ error: "请输入音效描述" }, 400);
        if (text.length > 500) return jsonResponse({ error: "描述不能超过 500 字符" }, 400);

        const dur = duration_seconds ?? 5;
        if (dur < 0.5 || dur > 22) {
            return jsonResponse({ error: "时长需在 0.5-22 秒之间" }, 400);
        }

        // 检测中文并翻译
        const finalText = hasChinese(text) ? await translate(text, "zh", "en") : text;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        const creditsCost = SOUND_EFFECT_CREDITS_COST;

        const deductResult = await deductUserCreditsById(user_id, creditsCost, "Sound Effect");
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        const requestBody: any = { text: finalText, duration_seconds: dur };
        if (loop !== undefined) requestBody.loop = loop;
        if (prompt_influence !== undefined) requestBody.prompt_influence = prompt_influence;
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
        }

        const result = await callFreepikApi("/v1/ai/sound-effects", "POST", requestBody);
        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "Sound Effect");
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "Sound Effect");
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
                model: "sound-effect",
                prompt: text.slice(0, 500),
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: { duration_seconds: dur, loop: loop || false, prompt_influence: prompt_influence ?? 0.3 }
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
            remaining_credits: deductResult.remaining,
            translated_text: finalText !== text ? finalText : undefined
        });

    } catch (error) {
        console.error("Handler error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
