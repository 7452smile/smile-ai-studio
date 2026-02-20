// 管理员验证模块
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// 管理员白名单（与前端 constants.ts 保持一致）
const ADMIN_PHONES: string[] = [
    "18112521254",
];

const ADMIN_EMAILS: string[] = [
    "admin@smileai.studio",
];

export function isAdminPhone(phone: string): boolean {
    return ADMIN_PHONES.includes(phone);
}

export function isAdminEmail(email: string): boolean {
    return ADMIN_EMAILS.includes(email);
}

/**
 * 判断 UUID 用户是否是管理员（通过查 phone/email 再比对白名单）
 */
export async function isAdminUser(userId: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data } = await supabase
        .from("user_profiles")
        .select("phone, email")
        .eq("id", userId)
        .single();
    if (!data) return false;
    if (data.phone && ADMIN_PHONES.includes(data.phone)) return true;
    if (data.email && ADMIN_EMAILS.includes(data.email)) return true;
    return false;
}

export function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
