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
        const { user_id: bodyUserId, limit = 20, offset = 0, type } = await req.json();
        const user_id = await getAuthenticatedUserId(req, bodyUserId);

        if (!user_id) return jsonResponse({ error: "缺少用户信息" }, 400);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let query = supabase
            .from("credit_transactions")
            .select("*", { count: "exact" })
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq("transaction_type", type);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("get-credit-transactions error:", error);
            return jsonResponse({ error: "查询失败" }, 500);
        }

        return jsonResponse({ success: true, items: data || [], total: count || 0 });

    } catch (error) {
        console.error("get-credit-transactions error:", error);
        return jsonResponse({ error: "服务器错误" }, 500);
    }
});
