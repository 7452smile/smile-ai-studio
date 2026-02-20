const ALLOWED_ORIGINS = [
    "https://smile-ai-studio.com",
    "https://www.smile-ai-studio.com",
];

// 本地开发时可临时改回 "*"
function getCorsOrigin(origin?: string | null): string {
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin && origin.startsWith("http://localhost:")) return origin;
    return ALLOWED_ORIGINS[0];
}

let _reqOrigin: string | null = null;

const baseCorsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
    _reqOrigin = req.headers.get("origin");
    const corsHeaders = { ...baseCorsHeaders, "Access-Control-Allow-Origin": getCorsOrigin(_reqOrigin) };
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    return null;
}

export function jsonResponse(data: unknown, status = 200): Response {
    const corsHeaders = { ...baseCorsHeaders, "Access-Control-Allow-Origin": getCorsOrigin(_reqOrigin) };
    return new Response(
        JSON.stringify(data),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
