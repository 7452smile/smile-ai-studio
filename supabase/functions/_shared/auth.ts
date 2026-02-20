// 用户身份验证模块 - 从 JWT 或请求体提取用户信息
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * 从请求中提取经过验证的用户 UUID (user_profiles.id)
 *
 * 必须通过 JWT 验证，不再 fallback 到请求体中的 user_id
 */
export async function getAuthenticatedUserId(
    reqOrHeader: Request | string | null,
    bodyUserId?: string
): Promise<string | null> {
    let token: string | null = null;

    if (reqOrHeader instanceof Request) {
        token = reqOrHeader.headers.get("x-user-token");
    } else if (typeof reqOrHeader === "string") {
        token = reqOrHeader.replace("Bearer ", "");
    }

    if (token) {
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (!error && user) {
                return user.id;
            }
        } catch {
            // JWT 验证失败
        }
    }

    return null;
}

/**
 * 从请求中提取手机号（仅供 admin 函数使用）
 */
export async function getAuthenticatedPhone(
    reqOrHeader: Request | string | null,
    bodyPhone?: string
): Promise<string | null> {
    let token: string | null = null;

    if (reqOrHeader instanceof Request) {
        token = reqOrHeader.headers.get("x-user-token");
    } else if (typeof reqOrHeader === "string") {
        token = reqOrHeader.replace("Bearer ", "");
    }

    if (token) {
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (!error && user?.user_metadata?.phone) {
                return user.user_metadata.phone;
            }
        } catch {
            // JWT 验证失败
        }
    }

    return bodyPhone || null;
}
