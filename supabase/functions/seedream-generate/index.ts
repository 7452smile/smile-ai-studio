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
const SEEDREAM_CREDITS_COST = 4;

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

        let endpoint = "/v1/ai/text-to-image/seedream-v4-5";
        const requestBody: any = { prompt, aspect_ratio, enable_safety_checker };

        if (seed !== undefined && seed !== null && seed !== "") {
            requestBody.seed = parseInt(seed);
        }

        // 图生图：上传参考图片到 R2
        let uploadedImageUrl: string | null = null;
        if (isImageToImage) {
            try {
                endpoint = "/v1/ai/text-to-image/seedream-v4-5-edit";
                uploadedImageUrl = await ensureImageUrl(reference_image, "ref.png");
                requestBody.reference_images = [uploadedImageUrl];
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
        const modelDesc = isImageToImage ? "Seedream 4.5 Edit" : "Seedream 4.5";
        const deductResult = await deductUserCreditsById(user_id, SEEDREAM_CREDITS_COST, modelDesc);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        const result = await callFreepikApi(endpoint, "POST", requestBody);
        if (!result.success) {
            await refundUserCreditsById(user_id, SEEDREAM_CREDITS_COST, undefined, modelDesc);
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, SEEDREAM_CREDITS_COST, undefined, modelDesc);
            return jsonResponse({ error: "未获取到任务 ID" }, 500);
        }

        // 扣减积分
        if (result.apiKeyId) {
            await deductCredits(result.apiKeyId, SEEDREAM_CREDITS_COST);
        }

        // 保存任务记录
        const { data: taskData, error: insertError } = await supabase
            .from("generation_tasks")
            .insert({
                user_id,
                task_type: "image",
                model: isImageToImage ? "seedream-edit" : "seedream",
                prompt,
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: SEEDREAM_CREDITS_COST,
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
            credits_cost: SEEDREAM_CREDITS_COST,
            remaining_credits: deductResult.remaining
        });

    } catch (error) {
        console.error("Handler error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
