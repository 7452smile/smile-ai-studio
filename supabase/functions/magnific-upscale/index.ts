import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callFreepikApi, deductCredits } from "../_shared/freepik.ts";
import { ensureImageUrl, deleteImageFromR2 } from "../_shared/r2.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_BASE_URL = Deno.env.get("WEBHOOK_BASE_URL") || "";

// 积分消耗计算 - 基于最终图像分辨率
// ≤2K: 10积分, ≤4K: 20积分, ≥8K: 120积分
const getUpscaleCreditsCost = (finalWidth: number, finalHeight: number): number => {
    const maxDim = Math.max(finalWidth, finalHeight);
    if (maxDim <= 2048) return 10;
    if (maxDim <= 4096) return 20;
    return 120;
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[magnific-upscale] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            mode: body.mode,
            scale_factor: body.scale_factor,
            image_width: body.image_width,
            image_height: body.image_height,
            has_image: !!body.image,
            // 创意放大参数
            creativity: body.creativity,
            hdr: body.hdr,
            resemblance: body.resemblance,
            fractality: body.fractality,
            engine: body.engine,
            optimized_for: body.optimized_for,
            prompt: body.prompt ? '(provided)' : undefined,
            // 精准放大参数
            precision_scale_factor: body.precision_scale_factor,
            flavor: body.flavor,
            sharpen: body.sharpen,
            smart_grain: body.smart_grain,
            ultra_detail: body.ultra_detail
        }));

        const {
            user_id: bodyUserId,
            image,
            mode = "creative", // creative 或 precision
            image_width = 0,
            image_height = 0,
            // 创意放大参数
            scale_factor = "2x",
            optimized_for = "standard",
            prompt,
            creativity = 0,
            hdr = 0,
            resemblance = 0,
            fractality = 0,
            engine = "automatic",
            // 精准放大参数
            precision_scale_factor = 2,
            flavor,
            sharpen = 7,
            smart_grain = 7,
            ultra_detail = 30
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!image) return jsonResponse({ error: "请上传图片" }, 400);

        // 计算最终图像尺寸并验证像素限制
        const factor = mode === 'creative'
            ? parseInt(String(scale_factor).replace('x', ''))
            : (typeof precision_scale_factor === 'number' ? precision_scale_factor : parseInt(precision_scale_factor));
        const finalWidth = image_width * factor;
        const finalHeight = image_height * factor;
        const totalPixels = finalWidth * finalHeight;

        if (totalPixels > 100_000_000) {
            return jsonResponse({ error: `最终图像尺寸 ${finalWidth}x${finalHeight} (${(totalPixels / 1_000_000).toFixed(0)}M像素) 超过1亿像素限制，请降低放大倍数` }, 400);
        }

        // 上传图片到 R2 获取公开 URL
        let uploadedImageUrl: string;
        try {
            uploadedImageUrl = await ensureImageUrl(image, "magnific_upscale.png");
            console.log("[magnific-upscale] Uploaded image URL:", uploadedImageUrl);
        } catch (uploadError) {
            console.error("[magnific-upscale] Image upload error:", uploadError);
            return jsonResponse({ error: "图片上传失败" }, 500);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let endpoint: string;
        let requestBody: any;

        if (mode === 'creative') {
            // 创意放大 API - 使用 image URL
            endpoint = "/v1/ai/image-upscaler";
            requestBody = {
                image: uploadedImageUrl,
                scale_factor,
                optimized_for,
                creativity,
                hdr,
                resemblance,
                fractality,
                engine
            };
            if (prompt) {
                requestBody.prompt = prompt;
            }
        } else {
            // 精准放大 API - 使用 image URL
            endpoint = "/v1/ai/image-upscaler-precision-v2";
            requestBody = {
                image: uploadedImageUrl,
                scale_factor: precision_scale_factor,
                sharpen,
                smart_grain,
                ultra_detail
            };
            if (flavor) {
                requestBody.flavor = flavor;
            }
        }

        // 添加 webhook URL
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
            console.log("[magnific-upscale] Webhook URL:", requestBody.webhook_url);
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getUpscaleCreditsCost(finalWidth, finalHeight);
        const modelDesc = mode === 'creative' ? 'Magnific Creative' : 'Magnific Precision';
        const deductResult = await deductUserCreditsById(user_id, creditsCost, modelDesc);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[magnific-upscale] Calling Freepik API:", endpoint);
        console.log("[magnific-upscale] Request body to Freepik:", JSON.stringify(requestBody));
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[magnific-upscale] Freepik API result:", JSON.stringify({
            success: result.success,
            error: result.error,
            hasData: !!result.data,
            taskId: result.data?.data?.task_id
        }));

        if (!result.success) {
            await refundUserCreditsById(user_id, creditsCost, undefined, modelDesc);
            return jsonResponse({ error: result.error }, 500);
        }

        const freepikTaskId = result.data?.data?.task_id;
        if (!freepikTaskId) {
            await refundUserCreditsById(user_id, creditsCost, undefined, modelDesc);
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
                task_type: "image",  // 使用 image 类型，因为放大结果是图片
                model: mode === 'creative' ? 'magnific-creative' : 'magnific-precision',
                prompt: prompt || '',
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: mode === 'creative' ? {
                    mode,
                    scale_factor,
                    optimized_for,
                    creativity,
                    hdr,
                    resemblance,
                    fractality,
                    engine,
                    uploaded_image_url: uploadedImageUrl
                } : {
                    mode,
                    scale_factor: precision_scale_factor,
                    flavor,
                    sharpen,
                    smart_grain,
                    ultra_detail,
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
