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
const BANANA_CREDITS_COST = 20;
const ENDPOINT = "/v1/ai/text-to-image/nano-banana-pro";

// Seedream 格式 → Banana Pro 格式
const ASPECT_RATIO_MAP: Record<string, string> = {
    "square_1_1": "1:1",
    "widescreen_16_9": "16:9",
    "social_story_9_16": "9:16",
    "portrait_2_3": "2:3",
    "traditional_3_4": "3:4",
    "standard_3_2": "3:2",
    "classic_4_3": "4:3",
    "cinematic_21_9": "21:9",
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, prompt, aspect_ratio = "square_1_1", seed, enable_safety_checker = true, reference_image } = await req.json();

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!prompt) return jsonResponse({ error: "请输入提示词" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const isImageToImage = !!reference_image;

        const requestBody: any = { prompt, aspect_ratio: ASPECT_RATIO_MAP[aspect_ratio] || "1:1" };

        // 图生图：上传参考图片到 R2，构造 reference_images 数组
        let uploadedImageUrl: string | null = null;
        if (isImageToImage) {
            try {
                uploadedImageUrl = await ensureImageUrl(reference_image, "ref.png");
                const mimeType = uploadedImageUrl.endsWith(".jpg") || uploadedImageUrl.endsWith(".jpeg")
                    ? "image/jpeg" : uploadedImageUrl.endsWith(".webp") ? "image/webp" : "image/png";
                requestBody.reference_images = [{ image: uploadedImageUrl, mime_type: mimeType }];
            } catch (uploadError) {
                return jsonResponse({ error: "图片上传失败" }, 500);
            }
        }

        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 预扣用户积分
        const modelDesc = isImageToImage ? "Banana Pro Edit" : "Banana Pro";
        const deductResult = await deductUserCreditsById(user_id, BANANA_CREDITS_COST, modelDesc);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        const result = await callFreepikApi(ENDPOINT, "POST", requestBody);
        if (!result.success) {
            await refundUserCreditsById(user_id, BANANA_CREDITS_COST, undefined, modelDesc);
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, BANANA_CREDITS_COST, undefined, modelDesc);
            return jsonResponse({ error: "未获取到任务 ID" }, 500);
        }

        if (result.apiKeyId) {
            await deductCredits(result.apiKeyId, BANANA_CREDITS_COST);
        }

        const { data: taskData, error: insertError } = await supabase
            .from("generation_tasks")
            .insert({
                user_id,
                task_type: "image",
                model: isImageToImage ? "banana-edit" : "banana",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: BANANA_CREDITS_COST,
                status: "processing",
                request_params: {
                    aspect_ratio,
                    seed: requestBody.seed,
                    enable_safety_checker,
                    is_image_to_image: isImageToImage,
                    uploaded_image_url: uploadedImageUrl
                }
            })
            .select()
            .single();

        if (insertError) return jsonResponse({ error: "保存任务失败" }, 500);

        return jsonResponse({
            success: true,
            task_id: taskData.id,
            freepik_task_id: freepikTaskId,
            status: "processing",
            credits_cost: BANANA_CREDITS_COST,
            remaining_credits: deductResult.remaining
        });

    } catch (error) {
        console.error("Handler error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});