import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { user_id: bodyUserId, code } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);
        if (!user_id || !code) {
            return jsonResponse({ success: false, error: "缺少用户信息或兑换码" }, 400);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data, error } = await supabase.rpc("redeem_code_v2", {
            p_user_id: user_id,
            p_code: code,
        });

        if (error) {
            console.error("[redeem-code] RPC error:", error);
            return jsonResponse({ success: false, error: error.message || "兑换失败" }, 500);
        }

        // RPC 返回 JSONB
        return jsonResponse(data);
    } catch (err: any) {
        console.error("[redeem-code] Error:", err);
        return jsonResponse({ success: false, error: "服务器错误" }, 500);
    }
});
