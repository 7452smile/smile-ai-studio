import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callFreepikApi, deductCredits } from "../_shared/freepik.ts";
import { ensureImageUrl } from "../_shared/r2.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors, getRequestOrigin } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 积分消耗：360p/540p/720p/1080p 5秒=14/14/18/36，8秒翻倍，1080p仅5秒
const getPixVerseCreditsCost = (resolution: string, duration: number): number => {
    let baseCost: number;
    switch (resolution) {
        case '360p':
        case '540p':
            baseCost = 14;
            break;
        case '720p':
            baseCost = 18;
            break;
        case '1080p':
            baseCost = 36;
            break;
        default:
            baseCost = 18;
    }
    return duration === 8 ? baseCost * 2 : baseCost;
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[pixverse-video] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            prompt: body.prompt?.slice(0, 50),
            mode: body.mode,
            resolution: body.resolution,
            duration: body.duration,
            style: body.style,
            has_first_frame: !!body.first_frame_image,
            has_last_frame: !!body.last_frame_image
        }));

        const {
            user_id: bodyUserId,
            prompt,
            mode = "i2v",
            resolution = "720p",
            duration = 5,
            negative_prompt,
            style,
            seed,
            first_frame_image,
            last_frame_image
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt) return jsonResponse({ error: "请输入提示词" }, 400);

        // 验证模式
        if (!['i2v', 'transition'].includes(mode)) {
            return jsonResponse({ error: "无效的模式" }, 400);
        }

        // 验证分辨率
        if (!['360p', '540p', '720p', '1080p'].includes(resolution)) {
            return jsonResponse({ error: "无效的分辨率" }, 400);
        }

        // 验证时长
        if (![5, 8].includes(duration)) {
            return jsonResponse({ error: "无效的视频时长" }, 400);
        }

        // 1080p 只支持 5 秒
        if (resolution === '1080p' && duration !== 5) {
            return jsonResponse({ error: "1080p 分辨率仅支持 5 秒视频" }, 400);
        }

        // i2v 模式必须有首帧图片
        if (!first_frame_image) {
            return jsonResponse({ error: "请上传首帧图片" }, 400);
        }

        // transition 模式必须有尾帧图片
        if (mode === 'transition' && !last_frame_image) {
            return jsonResponse({ error: "PixVerse V5 首尾帧模式需要上传尾帧图片" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 根据模式选择 API 端点
        const endpoint = mode === 'transition'
            ? "/v1/ai/image-to-video/pixverse-v5-transition"
            : "/v1/ai/image-to-video/pixverse-v5";

        const requestBody: any = {
            prompt,
            resolution,
            duration
        };

        // 添加可选参数
        if (negative_prompt) {
            requestBody.negative_prompt = negative_prompt;
        }
        if (seed !== undefined && seed !== null && seed !== -1) {
            requestBody.seed = seed;
        }
        // style 仅 i2v 模式支持
        if (mode === 'i2v' && style) {
            requestBody.style = style;
        }

        // 上传首帧图片到 R2
        let uploadedFirstFrameUrl: string | null = null;
        try {
            uploadedFirstFrameUrl = await ensureImageUrl(first_frame_image, "pixverse_first_frame.png");
            if (mode === 'transition') {
                requestBody.first_image_url = uploadedFirstFrameUrl;
            } else {
                requestBody.image_url = uploadedFirstFrameUrl;
            }
        } catch (uploadError) {
            console.error("First frame upload error:", uploadError);
            return jsonResponse({ error: "首帧图片上传失败" }, 500);
        }

        // 上传尾帧图片到 R2（仅 transition 模式）
        let uploadedLastFrameUrl: string | null = null;
        if (mode === 'transition' && last_frame_image) {
            try {
                uploadedLastFrameUrl = await ensureImageUrl(last_frame_image, "pixverse_last_frame.png");
                requestBody.last_image_url = uploadedLastFrameUrl;
            } catch (uploadError) {
                console.error("Last frame upload error:", uploadError);
                return jsonResponse({ error: "尾帧图片上传失败" }, 500);
            }
        }

        // 添加 webhook URL
        const webhookBaseUrl = getRequestOrigin();
        if (webhookBaseUrl) {
            requestBody.webhook_url = `${webhookBaseUrl}/functions/v1/freepik-webhook`;
            console.log("[pixverse-video] Webhook URL:", requestBody.webhook_url);
        } else {
            console.warn("[pixverse-video] No webhook base URL available!");
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "video");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getPixVerseCreditsCost(resolution, duration);
        const deductResult = await deductUserCreditsById(user_id, creditsCost, `PixVerse ${mode === 'transition' ? 'Transition' : 'Video'}`);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[pixverse-video] Calling Freepik API:", endpoint);
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[pixverse-video] Freepik API result:", JSON.stringify({
            success: result.success,
            error: result.error,
            hasData: !!result.data,
            taskId: result.data?.data?.task_id
        }));

        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, `PixVerse ${mode === 'transition' ? 'Transition' : 'Video'}`);
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, `PixVerse ${mode === 'transition' ? 'Transition' : 'Video'}`);
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
                model: mode === 'transition' ? "pixverse-transition" : "pixverse",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: {
                    mode,
                    resolution,
                    duration,
                    negative_prompt,
                    style: mode === 'i2v' ? style : undefined,
                    seed,
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
