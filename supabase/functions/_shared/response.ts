const ALLOWED_ORIGINS = [
    "https://smile-ai-studio.com",
    "https://www.smile-ai-studio.com",
];

// 代理域名缓存（由 agent-config 等函数调用 addAgentOrigin 注入）
const _dynamicOrigins: Set<string> = new Set();

export function addAgentOrigin(domain: string) {
    _dynamicOrigins.add(`https://${domain}`);
}

function getCorsOrigin(origin?: string | null): string {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin.startsWith("http://localhost:")) return origin;
    // 允许已注册的代理域名
    if (_dynamicOrigins.has(origin)) return origin;
    // 宽松模式：允许任何 https 来源（代理站 CNAME 绑定的域名）
    // 因为所有 API 都有 auth 保护，CORS 仅防浏览器限制
    if (origin.startsWith("https://")) return origin;
    return ALLOWED_ORIGINS[0];
}

let _reqOrigin: string | null = null;

const baseCorsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
