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

// Kling 3 积分消耗计算
const getKlingCreditsCost = (modelVersion: string, duration: number, generateAudio = true): number => {
    const audioRates: Record<string, number> = {
        'kling-3-pro':          39,
        'kling-3-std':          31,
        'kling-3-omni-pro':     28,
        'kling-3-omni-pro-v2v': 28,
        'kling-3-omni-std':     22,
        'kling-3-omni-std-v2v': 22,
    };
    const noAudioRates: Record<string, number> = {
        'kling-3-pro':          23,
        'kling-3-std':          17,
        'kling-3-omni-pro':     22,
        'kling-3-omni-pro-v2v': 22,
        'kling-3-omni-std':     17,
        'kling-3-omni-std-v2v': 17,
    };
    const rates = generateAudio ? audioRates : noAudioRates;
    return Math.round(duration * (rates[modelVersion] || (generateAudio ? 39 : 23)));
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const body = await req.json();
        console.log("[kling-video] Request body:", JSON.stringify({
            user_phone: body.user_phone,
            prompt: body.prompt?.slice(0, 50),
            model_version: body.model_version,
            duration: body.duration,
            aspect_ratio: body.aspect_ratio,
            has_start_image: !!body.start_image,
            has_end_image: !!body.end_image,
            has_reference_video: !!body.reference_video,
            has_elements: !!body.elements?.length,
            has_multi_prompt: !!body.multi_prompt?.length
        }));

        const {
            user_id: bodyUserId,
            prompt,
            model_version = "kling-3-pro",
            duration = 5,
            aspect_ratio = "16:9",
            negative_prompt,
            cfg_scale = 0.5,
            shot_type = "customize",
            seed,
            start_image,
            end_image,
            reference_video,
            multi_prompt,
            generate_audio = true
        } = body;

        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);

        // 验证提示词：使用 multi_prompt 时 prompt 可选
        if (!prompt && (!multi_prompt || multi_prompt.length === 0)) {
            return jsonResponse({ error: "请输入提示词或多镜头提示词" }, 400);
        }

        // 验证模型版本
        const validModels = ['kling-3-pro', 'kling-3-std', 'kling-3-omni-pro', 'kling-3-omni-std', 'kling-3-omni-pro-v2v', 'kling-3-omni-std-v2v'];
        if (!validModels.includes(model_version)) {
            return jsonResponse({ error: "无效的模型版本" }, 400);
        }

        // 验证时长 (3-15秒)
        if (duration < 3 || duration > 15) {
            return jsonResponse({ error: "视频时长必须在 3-15 秒之间" }, 400);
        }

        // V2V 模式必须有参考视频
        const isV2V = model_version === 'kling-3-omni-pro-v2v' || model_version === 'kling-3-omni-std-v2v';
        if (isV2V && !reference_video) {
            return jsonResponse({ error: "视频参考模式需要提供参考视频 URL" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 根据模型版本选择 API 端点
        let endpoint: string;
        if (model_version === 'kling-3-omni-pro-v2v') {
            endpoint = "/v1/ai/reference-to-video/kling-v3-omni-pro";
        } else if (model_version === 'kling-3-omni-std-v2v') {
            endpoint = "/v1/ai/reference-to-video/kling-v3-omni-std";
        } else if (model_version === 'kling-3-omni-pro') {
            endpoint = "/v1/ai/video/kling-v3-omni-pro";
        } else if (model_version === 'kling-3-omni-std') {
            endpoint = "/v1/ai/video/kling-v3-omni-std";
        } else if (model_version === 'kling-3-std') {
            endpoint = "/v1/ai/video/kling-v3-std";
        } else {
            endpoint = "/v1/ai/video/kling-v3-pro";
        }

        // 构建请求体
        const requestBody: any = {
            duration: String(duration),
            aspect_ratio,
            generate_audio
        };

        // prompt 或 multi_prompt（二选一）
        if (multi_prompt && multi_prompt.length > 0) {
            // 验证多镜头数量
            if (multi_prompt.length > 6) {
                return jsonResponse({ error: "多镜头最多支持 6 个" }, 400);
            }
            requestBody.multi_prompt = multi_prompt;
            // 使用 multi_prompt 时，shot_type 应为 customize
            if (model_version === 'kling-3-pro' || model_version === 'kling-3-std') {
                requestBody.shot_type = 'customize';
            }
        } else if (prompt) {
            requestBody.prompt = prompt;
        }

        // 添加可选参数（根据模型版本）
        // negative_prompt: Pro/Std 和 V2V 支持
        if (negative_prompt && (model_version === 'kling-3-pro' || model_version === 'kling-3-std' || isV2V)) {
            requestBody.negative_prompt = negative_prompt;
        }
        // cfg_scale: Pro/Std 和 V2V 支持
        if (cfg_scale !== undefined && cfg_scale !== 0.5 && (model_version === 'kling-3-pro' || model_version === 'kling-3-std' || isV2V)) {
            requestBody.cfg_scale = cfg_scale;
        }
        // shot_type: Pro/Std 支持 customize/intelligent
        if (shot_type && (model_version === 'kling-3-pro' || model_version === 'kling-3-std') && !multi_prompt?.length) {
            requestBody.shot_type = shot_type;
        }

        // 上传首帧图片到 R2（如果有）
        let uploadedStartImageUrl: string | null = null;
        if (start_image) {
            try {
                uploadedStartImageUrl = await ensureImageUrl(start_image, "kling_start_frame.png");
                // Kling 3 Pro 使用 start_image_url，Omni 使用 image_url
                if (model_version === 'kling-3-pro' || model_version === 'kling-3-std') {
                    requestBody.start_image_url = uploadedStartImageUrl;
                } else {
                    requestBody.image_url = uploadedStartImageUrl;
                }
            } catch (uploadError) {
                console.error("Start image upload error:", uploadError);
                return jsonResponse({ error: "首帧图片上传失败" }, 500);
            }
        }

        // 上传尾帧图片到 R2（如果有，V2V 不支持）
        let uploadedEndImageUrl: string | null = null;
        if (end_image && !isV2V) {
            try {
                uploadedEndImageUrl = await ensureImageUrl(end_image, "kling_end_frame.png");
                requestBody.end_image_url = uploadedEndImageUrl;
            } catch (uploadError) {
                console.error("End image upload error:", uploadError);
                return jsonResponse({ error: "尾帧图片上传失败" }, 500);
            }
        }

        // V2V 模式添加参考视频 URL
        if (isV2V && reference_video) {
            requestBody.video_url = reference_video;
        }

        // 添加 webhook URL
        if (WEBHOOK_BASE_URL) {
            requestBody.webhook_url = `${WEBHOOK_BASE_URL}/freepik-webhook`;
            console.log("[kling-video] Webhook URL:", requestBody.webhook_url);
        } else {
            console.warn("[kling-video] WEBHOOK_BASE_URL not set!");
        }

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "video");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 计算积分并预扣用户积分
        const creditsCost = getKlingCreditsCost(model_version, duration, generate_audio);
        const deductResult = await deductUserCreditsById(user_id, creditsCost);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        console.log("[kling-video] Calling Freepik API:", endpoint);
        const result = await callFreepikApi(endpoint, "POST", requestBody);
        console.log("[kling-video] Freepik API result:", JSON.stringify({
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

        // 确定保存的模型标识
        let savedModel = model_version;
        if (start_image && !isV2V) {
            savedModel = `${model_version}-i2v`;
        }

        // 保存任务记录
        const { data: taskData, error: insertError } = await supabase
            .from("generation_tasks")
            .insert({
                user_id,
                task_type: "video",
                model: savedModel,
                prompt: prompt || (multi_prompt ? JSON.stringify(multi_prompt) : ''),
                freepik_task_id: freepikTaskId,
                api_key_id: result.apiKeyId,
                credits_cost: creditsCost,
                status: "processing",
                request_params: {
                    model_version,
                    duration,
                    aspect_ratio,
                    negative_prompt,
                    cfg_scale,
                    shot_type,
                    seed,
                    is_image_to_video: !!start_image,
                    has_end_image: !!end_image,
                    is_video_to_video: isV2V,
                    uploaded_start_image_url: uploadedStartImageUrl,
                    uploaded_end_image_url: uploadedEndImageUrl,
                    has_multi_prompt: !!multi_prompt?.length,
                    multi_prompt_count: multi_prompt?.length || 0
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
