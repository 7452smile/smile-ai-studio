import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    return jsonResponse({ error: "Seedance 所有旧版模型渠道维护中，Seedance 2.0 将于北京时间 2 月 24 日上线" }, 503);
});
