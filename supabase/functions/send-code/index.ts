import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";

const ALIYUN_ACCESS_KEY_ID = Deno.env.get("ALIYUN_ACCESS_KEY_ID") || "";
const ALIYUN_ACCESS_KEY_SECRET = Deno.env.get("ALIYUN_ACCESS_KEY_SECRET") || "";
// 硬编码签名名称（避免 Supabase secrets 的中文编码问题）
const ALIYUN_SIGN_NAME = "四川星源艺界网络科技";
const ALIYUN_TEMPLATE_CODE = "SMS_501630346";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 特殊 URL 编码（阿里云要求）
function specialUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

// HMAC-SHA1
async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function sendAliyunSms(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();

  // 构建参数（按字母排序）
  const params: Record<string, string> = {
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: ALIYUN_SIGN_NAME,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: nonce,
    SignatureVersion: "1.0",
    TemplateCode: ALIYUN_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: timestamp,
    Version: "2017-05-25",
  };

  // 按 key 排序
  const sortedKeys = Object.keys(params).sort();

  // 构建规范化查询字符串
  const canonicalizedQueryString = sortedKeys
    .map(key => `${specialUrlEncode(key)}=${specialUrlEncode(params[key])}`)
    .join("&");

  // 构建待签名字符串
  const stringToSign = `POST&${specialUrlEncode("/")}&${specialUrlEncode(canonicalizedQueryString)}`;

  // 计算签名
  const signature = await hmacSha1Base64(ALIYUN_ACCESS_KEY_SECRET + "&", stringToSign);

  // 构建请求体
  const requestBody = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&") + `&Signature=${encodeURIComponent(signature)}`;

  try {
    const response = await fetch("https://dysmsapi.aliyuncs.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    const result = await response.json();

    if (result.Code === "OK") {
      return { success: true };
    } else {
      return { success: false, error: result.Message || result.Code };
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, error: String(error) };
  }
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") || "";

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true; // 未配置则跳过
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendResendEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Smile AI Studio <onboarding@resend.dev>",
        to: [email],
        subject: `您的验证码：${code}`,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px"><h2 style="color:#6366f1">Smile AI Studio</h2><p>您的验证码是：</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#6366f1;padding:16px 0">${code}</div><p style="color:#666;font-size:14px">验证码5分钟内有效，请勿泄露给他人。</p></div>`,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { phone, email, turnstile_token } = await req.json();

    // Turnstile 人机验证
    if (TURNSTILE_SECRET_KEY && !turnstile_token) {
      return jsonResponse({ error: "请完成人机验证" }, 400);
    }
    if (turnstile_token) {
      const valid = await verifyTurnstile(turnstile_token);
      if (!valid) {
        return jsonResponse({ error: "人机验证失败，请重试" }, 403);
      }
    }

    // 必须提供 phone 或 email 之一
    if (!phone && !email) {
      return jsonResponse({ error: "请输入手机号或邮箱" }, 400);
    }

    if (phone && !isValidPhone(phone)) {
      return jsonResponse({ error: "请输入正确的手机号" }, 400);
    }

    if (email && !isValidEmail(email)) {
      return jsonResponse({ error: "请输入正确的邮箱地址" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 检查频率限制（60秒内）
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    let rateQuery = supabase.from("verification_codes").select("id").gte("created_at", sixtySecondsAgo);
    if (phone) rateQuery = rateQuery.eq("phone", phone);
    else rateQuery = rateQuery.eq("email", email);

    const { data: recentCodes } = await rateQuery;

    if (recentCodes && recentCodes.length > 0) {
      return jsonResponse({ error: "发送太频繁，请60秒后重试" }, 429);
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 存储验证码
    const insertData: Record<string, string> = { code, expires_at: expiresAt };
    if (phone) insertData.phone = phone;
    else insertData.email = email;

    const { error: insertError } = await supabase
      .from("verification_codes")
      .insert(insertData);

    if (insertError) {
      console.error("DB insert error:", insertError);
      return jsonResponse({ error: "系统错误，请重试" }, 500);
    }

    // 发送验证码
    if (phone) {
      const smsResult = await sendAliyunSms(phone, code);
      if (!smsResult.success) {
        console.error("SMS failed:", smsResult.error);
        return jsonResponse({ error: `短信发送失败: ${smsResult.error}` }, 500);
      }
    } else {
      const emailResult = await sendResendEmail(email, code);
      if (!emailResult.success) {
        console.error("Email failed:", emailResult.error);
        return jsonResponse({ error: `邮件发送失败: ${emailResult.error}` }, 500);
      }
    }

    return jsonResponse({ success: true, message: "验证码已发送" });

  } catch (error) {
    console.error("Handler error:", error);
    return jsonResponse({ error: "服务器错误", detail: String(error) }, 500);
  }
});
