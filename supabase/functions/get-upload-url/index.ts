import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generatePresignedPutUrl } from "../_shared/r2.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { content_type, user_id: bodyUserId } = await req.json();
        const userId = await getAuthenticatedUserId(req, bodyUserId);
        if (!userId) return jsonResponse({ error: "未登录" }, 401);
        if (!content_type || !EXT_MAP[content_type]) {
            return jsonResponse({ error: "不支持的图片格式" }, 400);
        }

        const ext = EXT_MAP[content_type];
        const rand = Math.random().toString(36).slice(2, 10);
        const key = `temp/${Date.now()}_${rand}.${ext}`;

        const upload_url = await generatePresignedPutUrl(key, content_type);
        const public_url = `${R2_PUBLIC_URL}/${key}`;

        return jsonResponse({ upload_url, public_url });
    } catch (error) {
        console.error("[get-upload-url] Error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
