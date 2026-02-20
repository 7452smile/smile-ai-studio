import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserCreditsById } from "../_shared/userCredits.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);

        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);

        const credits = await getUserCreditsById(user_id);

        if (credits === -1) {
            return jsonResponse({ error: "用户不存在" }, 404);
        }

        return jsonResponse({ success: true, credits });

    } catch (error) {
        console.error("Get user credits error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
