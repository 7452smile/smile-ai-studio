import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // 从 x-user-token header 获取用户 token
    const authHeader = req.headers.get("x-user-token");
    if (!authHeader) {
      return jsonResponse({ error: "未登录" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 验证 token 获取用户信息
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      console.error("[ensure-profile] getUser error:", userError);
      return jsonResponse({ error: "无效的登录凭证" }, 401);
    }

    let referral_code: string | undefined;
    try {
      const body = await req.json();
      referral_code = body?.referral_code;
    } catch {}

    // 检查 profile 是否已存在（按 id 或 email）
    const { data: existingById } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingById) {
      // 如果 email 为空，补上
      if (!existingById.email && user.email) {
        await supabase.from("user_profiles").update({ email: user.email }).eq("id", user.id);
      }
      return jsonResponse({ success: true, isNewUser: false, profile: existingById });
    }

    // 检查是否有同 email 的 profile（手机号注册的用户后来用 Google 登录）
    if (user.email) {
      const { data: existingByEmail } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("email", user.email)
        .single();

      if (existingByEmail) {
        return jsonResponse({ success: true, isNewUser: false, profile: existingByEmail });
      }
    }

    // 新用户：创建 profile
    const email = user.email || "";
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const nickname = googleName || (email ? `用户${email.split("@")[0].slice(0, 4)}` : `用户${user.id.slice(0, 4)}`);

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: user.id,
        email: email || null,
        nickname,
        credits: 188,
      })
      .select()
      .single();

    if (profileError) {
      console.error("[ensure-profile] Create profile error:", profileError);
      return jsonResponse({ error: "创建用户资料失败: " + profileError.message }, 500);
    }

    // 生成邀请码
    try {
      await supabase.rpc("generate_referral_code_v2", { p_user_id: user.id });
    } catch (e) {
      console.error("[ensure-profile] generate_referral_code_v2 error:", e);
    }

    // 应用邀请码
    if (referral_code) {
      try {
        const { data: refResult } = await supabase.rpc("apply_referral_code_v2", {
          p_referee_id: user.id,
          p_code: referral_code,
        });
        if (refResult?.success) {
          console.log(`[ensure-profile] Referral applied for ${user.id}`);
        }
      } catch (e) {
        console.error("[ensure-profile] apply_referral_code_v2 error:", e);
      }
    }

    return jsonResponse({ success: true, isNewUser: true, profile });
  } catch (error: any) {
    console.error("[ensure-profile] error:", error);
    return jsonResponse({ error: error.message || "服务器错误" }, 500);
  }
});
