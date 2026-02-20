import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callFreepikApi, deductCredits } from "../_shared/freepik.ts";
import { ensureImageUrl } from "../_shared/r2.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";

// 积分消耗：768p 6秒=24, 768p 10秒=47, 1080p 6秒=40
const getMinimaxCreditsCost = (resolution: string, duration: number): number => {
    if (resolution === '1080p') return 40;
    return duration === 10 ? 47 : 24;
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[minimax-video] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            prompt: body.prompt?.slice(0, 50),
            resolution: body.resolution,
            duration: body.duration,
            has_first_frame: !!body.first_frame_image,
            has_last_frame: !!body.last_frame_image
        }));

        const {
            user_id: bodyUserId,
            prompt,
            resolution = "768p",
            duration = 6,
            prompt_optimizer = true,
            first_frame_image,
            last_frame_image
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt) return jsonResponse({ error: "请输入提示词" }, 400);

        // 验证参数
        if (!['768p', '1080p'].includes(resolution)) {
            return jsonResponse({ error: "无效的分辨率" }, 400);
        }
        if (resolution === '1080p' && duration !== 6) {
            return jsonResponse({ error: "1080p 分辨率仅支持 6 秒视频" }, 400);
        }
        if (![6, 10].includes(duration)) {
            return jsonResponse({ error: "无效的视频时长" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const isImageToVideo = !!first_frame_image;

        // 根据分辨率选择 API 端点
        const endpoint = resolution === '1080p'
            ? "/v1/ai/image-to-video/minimax-hailuo-02-1080p"
            : "/v1/ai/image-to-video/minimax-hailuo-02-768p";

        const requestBody: any = {
            prompt,
            prompt_optimizer,
            duration
        };

        // 上传首帧图片到 R2
        let uploadedFirstFrameUrl: string | null = null;
        if (first_frame_image) {
            try {
                uploadedFirstFrameUrl = await ensureImageUrl(first_frame_image, "first_frame.png");
                requestBody.first_frame_image = uploadedFirstFrameUrl;
            } catch (uploadError) {
                console.error("First frame upload error:", uploadError);
                return jsonResponse({ error: "首帧图片上传失败" }, 500);
            }
        }

        // 上传尾帧图片到 R2（仅当有首帧时才有效）
        let uploadedLastFrameUrl: string | null = null;
        if (last_frame_image && first_frame_image) {
            try {
                uploadedLastFrameUrl = await ensureImageUrl(last_frame_image, "last_frame.png");
                requestBody.last_frame_image = uploadedLastFrameUrl;
            } catch (uploadError) {
                console.error("Last frame upload error:", uploadError);
                return jsonResponse({ error: "尾帧图片上传失败" }, 500);
            }
        }

        // 添加 webhook URL
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
            console.log("[minimax-video] Webhook URL:", requestBody.webhook_url);
        } else {
            console.warn("[minimax-video] WEBHOOK_BASE_URL not set!");
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "video");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getMinimaxCreditsCost(resolution, duration);
        const deductResult = await deductUserCreditsById(user_id, creditsCost);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[minimax-video] Calling Freepik API:", endpoint);
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[minimax-video] Freepik API result:", JSON.stringify({
            success: result.success,
            error: result.error,
            hasData: !!result.data,
            taskId: result.data?.data?.task_id
        }));

        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost);
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost);
            return jsonResponse({ error: "未获取到任务 ID" }, 500);
        }

        // 扣减 API Key 积分
        if (result.apiKeyId) {
            await deductCredits(result.apiKeyId, creditsCost);
        }

        // 保存任务记录
        const { data: taskData, error: insertError } = await supabase
            .from("generation_tasks")
            .insert({
                user_id,
                task_type: "video",
                model: "minimax",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: {
                    resolution,
                    duration,
                    prompt_optimizer,
                    is_image_to_video: isImageToVideo,
                    uploaded_first_frame_url: uploadedFirstFrameUrl,
                    uploaded_last_frame_url: uploadedLastFrameUrl
                }
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            return jsonResponse({ error: "保存任务失败" }, 500);
        }

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
