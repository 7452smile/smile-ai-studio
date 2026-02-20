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

// 积分消耗：720p 5/10/15秒=42/84/126, 1080p 5/10/15秒=63/126/189
const getWanCreditsCost = (resolution: string, duration: string): number => {
    if (resolution === '1080p') {
        if (duration === '15') return 189;
        if (duration === '10') return 126;
        return 63;
    }
    // 720p
    if (duration === '15') return 126;
    if (duration === '10') return 84;
    return 42;
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[wan-video] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            prompt: body.prompt?.slice(0, 50),
            resolution: body.resolution,
            duration: body.duration,
            size: body.size,
            has_first_frame: !!body.first_frame_image
        }));

        const {
            user_id: bodyUserId,
            prompt,
            resolution = "720p",
            duration = "5",
            size = "1280*720",
            negative_prompt,
            enable_prompt_expansion = false,
            shot_type = "single",
            seed,
            first_frame_image
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt) return jsonResponse({ error: "请输入提示词" }, 400);

        // 验证参数
        if (!['720p', '1080p'].includes(resolution)) {
            return jsonResponse({ error: "无效的分辨率" }, 400);
        }
        if (!['5', '10', '15'].includes(duration)) {
            return jsonResponse({ error: "无效的视频时长" }, 400);
        }

        // 验证尺寸与分辨率匹配
        const valid720pSizes = ['1280*720', '720*1280'];
        const valid1080pSizes = ['1920*1080', '1080*1920'];
        if (resolution === '720p' && !valid720pSizes.includes(size)) {
            return jsonResponse({ error: "720p 分辨率仅支持 1280*720 或 720*1280" }, 400);
        }
        if (resolution === '1080p' && !valid1080pSizes.includes(size)) {
            return jsonResponse({ error: "1080p 分辨率仅支持 1920*1080 或 1080*1920" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const isImageToVideo = !!first_frame_image;

        // 根据分辨率和模式选择 API 端点
        let endpoint: string;
        if (isImageToVideo) {
            endpoint = resolution === '1080p'
                ? "/v1/ai/image-to-video/wan-v2-6-1080p"
                : "/v1/ai/image-to-video/wan-v2-6-720p";
        } else {
            endpoint = resolution === '1080p'
                ? "/v1/ai/text-to-video/wan-v2-6-1080p"
                : "/v1/ai/text-to-video/wan-v2-6-720p";
        }

        const requestBody: any = {
            prompt,
            size,
            duration,
            enable_prompt_expansion,
            shot_type
        };

        // 添加可选参数
        if (negative_prompt) {
            requestBody.negative_prompt = negative_prompt;
        }
        if (seed !== undefined && seed !== null && seed !== -1) {
            requestBody.seed = seed;
        }

        // 上传首帧图片到 R2（如果是 I2V 模式）
        let uploadedImageUrl: string | null = null;
        if (first_frame_image) {
            try {
                uploadedImageUrl = await ensureImageUrl(first_frame_image, "wan_first_frame.png");
                requestBody.image = uploadedImageUrl;
            } catch (uploadError) {
                console.error("First frame upload error:", uploadError);
                return jsonResponse({ error: "首帧图片上传失败" }, 500);
            }
        }

        // 添加 webhook URL
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
            console.log("[wan-video] Webhook URL:", requestBody.webhook_url);
        } else {
            console.warn("[wan-video] WEBHOOK_BASE_URL not set!");
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "video");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getWanCreditsCost(resolution, duration);
        const deductResult = await deductUserCreditsById(user_id, creditsCost);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[wan-video] Calling Freepik API:", endpoint);
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[wan-video] Freepik API result:", JSON.stringify({
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
                model: "wan",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: {
                    resolution,
                    duration,
                    size,
                    negative_prompt,
                    enable_prompt_expansion,
                    shot_type,
                    seed,
                    is_image_to_video: isImageToVideo,
                    uploaded_image_url: uploadedImageUrl
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
