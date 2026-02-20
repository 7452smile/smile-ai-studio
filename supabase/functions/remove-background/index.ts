import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAvailableApiKey, deductCredits } from "../_shared/freepik.ts";
import { ensureImageUrl, deleteImageFromR2 } from "../_shared/r2.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";
import { checkConcurrencyById } from "../_shared/subscription.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

// 一键抠图固定消耗 2 积分
const REMOVE_BG_CREDITS_COST = 2;

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, image } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);

        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);
        if (!image) return jsonResponse({ error: "请上传图片" }, 400);

        // 并发检查
        const concurrency = await checkConcurrencyById(user_id, "image");
        if (!concurrency.allowed) return jsonResponse({ error: concurrency.reason }, 429);

        // 预扣用户积分
        const deductResult = await deductUserCreditsById(user_id, REMOVE_BG_CREDITS_COST);
        if (!deductResult.success) return jsonResponse({ error: deductResult.error }, 402);

        // 获取可用的 API Key
        const apiKey = await getAvailableApiKey();
        if (!apiKey) {
            await refundUserCreditsById(user_id, REMOVE_BG_CREDITS_COST);
            return jsonResponse({ error: "服务暂时不可用" }, 500);
        }

        // 上传图片到 R2 获取公开 URL
        let imageUrl: string;
        try {
            imageUrl = await ensureImageUrl(image, "removebg.png");
        } catch (uploadError) {
            return jsonResponse({ error: "图片上传失败" }, 500);
        }

        try {
            // 调用 Freepik 抠图 API
            const response = await fetch("https://api.freepik.com/v1/ai/beta/remove-background", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-freepik-api-key": apiKey.api_key
                },
                body: new URLSearchParams({ image_url: imageUrl })
            });

            const result = await response.json();

            // 清理 R2 临时图片
            await deleteImageFromR2(imageUrl);

            if (!response.ok) {
                await refundUserCreditsById(user_id, REMOVE_BG_CREDITS_COST);
                return jsonResponse({ error: result.message || "抠图失败" }, 500);
            }

            // 扣减积分
            if (apiKey.id) {
                await deductCredits(apiKey.id, REMOVE_BG_CREDITS_COST);
            }

            // 返回高清下载链接
            return jsonResponse({
                success: true,
                url: result.high_resolution || result.url,
                preview: result.preview,
                credits_cost: REMOVE_BG_CREDITS_COST,
                remaining_credits: deductResult.remaining
            });

        } catch (apiError) {
            // 确保清理 R2 临时图片
            await deleteImageFromR2(imageUrl);
            await refundUserCreditsById(user_id, REMOVE_BG_CREDITS_COST);
            throw apiError;
        }

    } catch (error) {
        console.error("Remove background error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
