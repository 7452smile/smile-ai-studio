import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { phone, email, code, referral_code, agent_domain } = await req.json();

    // 验证参数：phone 或 email 二选一
    if ((!phone && !email) || !code) {
      return jsonResponse({ error: "请输入手机号/邮箱和验证码" }, 400);
    }

    const isEmailLogin = !!email && !phone;
    const identifier = isEmailLogin ? email : phone;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 查找有效的验证码
    let findQuery = supabase
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (isEmailLogin) findQuery = findQuery.eq("email", email);
    else findQuery = findQuery.eq("phone", phone);

    const { data: verificationCode, error: findError } = await findQuery.single();

    if (findError || !verificationCode) {
      return jsonResponse({ error: "验证码错误或已过期" }, 400);
    }

    // 标记验证码为已使用
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verificationCode.id);

    // 检查用户是否存在
    let existingQuery = supabase.from("user_profiles").select("id");
    if (isEmailLogin) existingQuery = existingQuery.eq("email", email);
    else existingQuery = existingQuery.eq("phone", phone);

    const { data: existingProfile } = await existingQuery.single();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      userId = existingProfile.id;

    } else {
      // 新用户，创建 auth 用户
      const authEmail = isEmailLogin ? email : `${phone}@phone.local`;
      const password = crypto.randomUUID();

      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: isEmailLogin ? { email } : { phone },
      });

      if (createError || !authUser.user) {
        console.error("Create user error:", createError);
        return jsonResponse({ error: "创建用户失败" }, 500);
      }

      userId = authUser.user.id;
      isNewUser = true;

      // 创建用户资料
      const profileData: Record<string, any> = {
        id: userId,
        credits: 188,
      };
      if (isEmailLogin) {
        profileData.email = email;
        profileData.nickname = `用户${email.split("@")[0].slice(0, 4)}`;
      } else {
        profileData.phone = phone;
        profileData.nickname = `用户${phone.slice(-4)}`;
      }

      // 代理归属
      if (agent_domain) {
        try {
          // 标准化域名：去掉协议和尾部斜杠
          const normalizedDomain = agent_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const { data: agent } = await supabase
            .from("agents")
            .select("id, domain")
            .eq("status", "active");

          // 查找匹配的代理（容错处理）
          const matchedAgent = agent?.find(a => {
            const dbDomain = a.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            return dbDomain === normalizedDomain;
          });

          if (matchedAgent) profileData.agent_id = matchedAgent.id;
        } catch (e) {
          console.error("[verify-code] agent lookup error:", e);
        }
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert(profileData);

      if (profileError) {
        console.error("Create profile error:", profileError);
      }

      // 为新用户生成邀请码
      try {
        await supabase.rpc("generate_referral_code_v2", { p_user_id: userId });
      } catch (e) {
        console.error("[verify-code] generate_referral_code_v2 error:", e);
      }

      // 应用邀请码（如果有）
      if (referral_code) {
        try {
          const { data: refResult } = await supabase.rpc("apply_referral_code_v2", {
            p_referee_id: userId,
            p_code: referral_code,
          });
          if (refResult?.success) {
            console.log(`[verify-code] Referral applied: ${identifier} invited by code ${referral_code}`);
          } else {
            console.log(`[verify-code] Referral not applied: ${refResult?.error || 'unknown'}`);
          }
        } catch (e) {
          console.error("[verify-code] apply_referral_code_v2 error:", e);
        }
      }
    }

    // 生成登录 token
    const authEmail = isEmailLogin ? email : `${phone}@phone.local`;
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    const makeSessionResponse = (session: any) => ({
      success: true,
      isNewUser,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: userId,
          phone: phone || null,
          email: email || null,
        },
      },
    });

    if (sessionError) {
      console.error("Generate link error:", sessionError);
      const { data: { session }, error: signInError } = await supabase.auth.admin.createSession({
        userId,
      });

      if (signInError || !session) {
        return jsonResponse({ error: "登录失败，请重试" }, 500);
      }

      return jsonResponse(makeSessionResponse(session));
    }

    // 使用 magic link 登录
    const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: sessionData.properties?.hashed_token || "",
      type: "magiclink",
    });

    if (verifyError || !session) {
      const { data: { session: backupSession } } = await supabase.auth.admin.createSession({
        userId,
      });

      return jsonResponse(backupSession ? makeSessionResponse(backupSession) : {
        success: true,
        isNewUser,
        session: null,
      });
    }

    return jsonResponse(makeSessionResponse(session));

  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: "服务器错误" }, 500);
  }
});
