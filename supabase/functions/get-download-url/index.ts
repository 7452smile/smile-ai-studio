import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generatePresignedGetUrl } from "../_shared/r2.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { url, filename, user_id: bodyUserId } = await req.json();
        const userId = await getAuthenticatedUserId(req, bodyUserId);
        if (!userId) return jsonResponse({ error: "未登录" }, 401);

        if (!url || !url.startsWith(R2_PUBLIC_URL)) {
            // 非 R2 URL（如 Freepik 原始链接），直接返回原 URL
            return jsonResponse({ download_url: url });
        }

        const key = url.replace(`${R2_PUBLIC_URL}/`, "");
        const downloadFilename = filename || key.split("/").pop() || "download";
        const downloadUrl = await generatePresignedGetUrl(key, downloadFilename);

        return jsonResponse({ download_url: downloadUrl });
    } catch (error) {
        console.error("[get-download-url] Error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
