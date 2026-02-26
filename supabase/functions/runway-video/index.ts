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

// RunWay Gen 4.5 积分消耗计算
const getRunwayCreditsCost = (duration: number): number => {
    switch (duration) {
        case 5:
            return 60;
        case 8:
            return 96;
        case 10:
            return 120;
        default:
            return 60;
    }
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[runway-video] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            prompt: body.prompt?.slice(0, 50),
            ratio: body.ratio,
            duration: body.duration,
            has_first_frame: !!body.first_frame_image
        }));

        const {
            user_id: bodyUserId,
            prompt,
            ratio = "1280:720",
            duration = 5,
            seed,
            first_frame_image
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt) return jsonResponse({ error: "请输入提示词" }, 400);

        // 验证宽高比
        const validRatios = ['1280:720', '720:1280', '1104:832', '960:960', '832:1104'];
        if (!validRatios.includes(ratio)) {
            return jsonResponse({ error: "无效的宽高比" }, 400);
        }

        // 验证时长
        if (![5, 8, 10].includes(duration)) {
            return jsonResponse({ error: "无效的视频时长" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 根据是否有首帧图片选择 API 端点
        const isI2V = !!first_frame_image;
        const endpoint = isI2V
            ? "/v1/ai/image-to-video/runway-4-5"
            : "/v1/ai/text-to-video/runway-4-5";

        const requestBody: any = {
            prompt,
            ratio,
            duration
        };

        // 添加可选参数（seed 仅 I2V 支持）
        if (isI2V && seed !== undefined && seed !== null && seed !== -1) {
            requestBody.seed = seed;
        }

        // 上传首帧图片到 R2（如果有）
        let uploadedImageUrl: string | null = null;
        if (first_frame_image) {
            try {
                uploadedImageUrl = await ensureImageUrl(first_frame_image, "runway_first_frame.png");
                requestBody.image = uploadedImageUrl;
            } catch (uploadError) {
                console.error("First frame upload error:", uploadError);
                return jsonResponse({ error: "首帧图片上传失败" }, 500);
            }
        }

        // 添加 webhook URL
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
            console.log("[runway-video] Webhook URL:", requestBody.webhook_url);
        } else {
            console.warn("[runway-video] WEBHOOK_BASE_URL not set!");
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "video");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getRunwayCreditsCost(duration);
        const deductResult = await deductUserCreditsById(user_id, creditsCost, "RunWay Gen-4");
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[runway-video] Calling Freepik API:", endpoint);
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[runway-video] Freepik API result:", JSON.stringify({
            success: result.success,
            error: result.error,
            hasData: !!result.data,
            taskId: result.data?.data?.task_id
        }));

        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "RunWay Gen-4");
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, "RunWay Gen-4");
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
                model: isI2V ? "runway-i2v" : "runway-t2v",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: {
                    ratio,
                    duration,
                    seed: isI2V ? seed : undefined,
                    is_image_to_video: isI2V,
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
