import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteImageFromR2 } from "../_shared/r2.ts";
import { refundUserCreditsById } from "../_shared/userCredits.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const MODEL_GET_ENDPOINTS: Record<string, string> = {
    "seedream": "/v1/ai/text-to-image/seedream-v4-5",
    "seedream-edit": "/v1/ai/text-to-image/seedream-v4-5-edit",
    "minimax-768p": "/v1/ai/image-to-video/minimax-hailuo-02-768p",
    "minimax-1080p": "/v1/ai/image-to-video/minimax-hailuo-02-1080p",
    // Wan T2V
    "wan-t2v-720p": "/v1/ai/text-to-video/wan-v2-6-720p",
    "wan-t2v-1080p": "/v1/ai/text-to-video/wan-v2-6-1080p",
    // Wan I2V
    "wan-i2v-720p": "/v1/ai/image-to-video/wan-v2-6-720p",
    "wan-i2v-1080p": "/v1/ai/image-to-video/wan-v2-6-1080p",
    // Seedance
    "seedance-1.5-pro": "/v1/ai/video/seedance-1-5-pro-1080p",
    "seedance-pro": "/v1/ai/image-to-video/seedance-pro-1080p",
    // PixVerse V5
    "pixverse": "/v1/ai/image-to-video/pixverse-v5",
    "pixverse-transition": "/v1/ai/image-to-video/pixverse-v5-transition",
    // LTX Video 2.0 Pro
    "ltx-t2v": "/v1/ai/text-to-video/ltx-2-pro",
    "ltx-i2v": "/v1/ai/image-to-video/ltx-2-pro",
    // RunWay Gen 4.5
    "runway-t2v": "/v1/ai/text-to-video/runway-4-5",
    "runway-i2v": "/v1/ai/image-to-video/runway-4-5",
    // Kling 3 Pro
    "kling-3-pro": "/v1/ai/video/kling-v3",
    "kling-3-pro-i2v": "/v1/ai/video/kling-v3",
    // Kling 3 Std
    "kling-3-std": "/v1/ai/video/kling-v3",
    "kling-3-std-i2v": "/v1/ai/video/kling-v3",
    // Kling 3 Omni Pro
    "kling-3-omni-pro": "/v1/ai/video/kling-v3-omni",
    "kling-3-omni-pro-i2v": "/v1/ai/video/kling-v3-omni",
    // Kling 3 Omni Std
    "kling-3-omni-std": "/v1/ai/video/kling-v3-omni",
    "kling-3-omni-std-i2v": "/v1/ai/video/kling-v3-omni",
    // Kling 3 Omni Pro V2V
    "kling-3-omni-pro-v2v": "/v1/ai/video/kling-v3-omni",
    // Kling 3 Omni Std V2V
    "kling-3-omni-std-v2v": "/v1/ai/video/kling-v3-omni",
    // Magnific 高清放大
    "magnific-creative": "/v1/ai/image-upscaler",
    "magnific-precision": "/v1/ai/image-upscaler-precision-v2"
};

// 根据任务获取正确的 GET 端点
function getEndpointForTask(task: any): string | null {
    if (task.model === "minimax") {
        const resolution = task.request_params?.resolution || "768p";
        return MODEL_GET_ENDPOINTS[`minimax-${resolution}`] || null;
    }
    if (task.model === "wan") {
        const resolution = task.request_params?.resolution || "720p";
        const isI2V = task.request_params?.is_image_to_video;
        const mode = isI2V ? "i2v" : "t2v";
        return MODEL_GET_ENDPOINTS[`wan-${mode}-${resolution}`] || null;
    }
    // Seedance 直接使用 model 字段
    if (task.model === "seedance-1.5-pro" || task.model === "seedance-pro") {
        return MODEL_GET_ENDPOINTS[task.model] || null;
    }
    // Kling 3 模型
    if (task.model.startsWith("kling-3-")) {
        return MODEL_GET_ENDPOINTS[task.model] || null;
    }
    return MODEL_GET_ENDPOINTS[task.model] || null;
}

// 清理临时上传的参考图片
async function cleanupTempImages(task: any) {
    try {
        const uploadedImageUrl = task.request_params?.uploaded_image_url;
        if (uploadedImageUrl) {
            await deleteImageFromR2(uploadedImageUrl);
        }
        // 清理 Minimax 的首帧和尾帧图片
        const uploadedFirstFrameUrl = task.request_params?.uploaded_first_frame_url;
        if (uploadedFirstFrameUrl) {
            await deleteImageFromR2(uploadedFirstFrameUrl);
        }
        const uploadedLastFrameUrl = task.request_params?.uploaded_last_frame_url;
        if (uploadedLastFrameUrl) {
            await deleteImageFromR2(uploadedLastFrameUrl);
        }
    } catch (e) {
        console.error("[freepik-webhook] cleanupTempImages failed:", e);
    }
}

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const payload = await req.json();
        const { task_id: freepikTaskId, status } = payload;

        console.log("[freepik-webhook] Received:", JSON.stringify({ freepikTaskId, status }));

        if (!freepikTaskId) {
            return jsonResponse({ error: "Missing task_id" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: task, error: findError } = await supabase
            .from("generation_tasks")
            .select("*, freepik_api_keys(api_key)")
            .eq("freepik_task_id", freepikTaskId)
            .single();

        if (findError || !task) {
            console.log("[freepik-webhook] Task not found for freepikTaskId:", freepikTaskId);
            return jsonResponse({ error: "Task not found" }, 404);
        }

        if (status === "COMPLETED") {
            const endpoint = getEndpointForTask(task);
            console.log("[freepik-webhook] Task model:", task.model, "Endpoint:", endpoint);
            if (!endpoint) {
                return jsonResponse({ error: "Unknown model" }, 400);
            }

            const apiKey = task.freepik_api_keys?.api_key;
            if (!apiKey) {
                return jsonResponse({ error: "API key not found" }, 500);
            }

            const getResponse = await fetch(`https://api.freepik.com${endpoint}/${freepikTaskId}`, {
                method: "GET",
                headers: { "x-freepik-api-key": apiKey }
            });

            const getResult = await getResponse.json();
            console.log("[freepik-webhook] GET result:", JSON.stringify(getResult));
            const resultUrl = getResult?.data?.generated?.[0] || null;

            await supabase
                .from("generation_tasks")
                .update({
                    status: "completed",
                    result_url: resultUrl,
                    completed_at: new Date().toISOString()
                })
                .eq("id", task.id);

            await cleanupTempImages(task);

        } else if (status === "FAILED") {
            await supabase
                .from("generation_tasks")
                .update({
                    status: "failed",
                    error_message: payload.error || "Generation failed",
                    completed_at: new Date().toISOString()
                })
                .eq("id", task.id);

            // 退还用户积分
            if (task.credits_cost && task.user_id) {
                console.log(`[freepik-webhook] Refunding ${task.credits_cost} credits to userId=${task.user_id}`);
                const refundResult = await refundUserCreditsById(task.user_id, task.credits_cost, task.id);
                if (!refundResult.success) {
                    console.error(`[freepik-webhook] Refund failed for task ${task.id}, credits may be lost!`);
                }
            }

            await cleanupTempImages(task);
        }

        return jsonResponse({ success: true });

    } catch (error) {
        console.error("Webhook error:", error);
        return jsonResponse({ error: "Server error" }, 500);
    }
});
