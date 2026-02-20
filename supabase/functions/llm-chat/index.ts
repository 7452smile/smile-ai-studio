import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { getAuthenticatedUserId } from "../_shared/auth.ts";
import { deductUserCreditsById, refundUserCreditsById } from "../_shared/userCredits.ts";

const LLM_BASE_URL = Deno.env.get("LLM_BASE_URL") || "https://www.bytecatcode.org";
// TODO: 环境变量调通后改回 Deno.env.get("LLM_API_KEY")
const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "sk-3o7VxWgcWsXxm8PEKGoDsgHWtjExWQchAifWgjIKk2ZKrcUh";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// 模型价格表：每百万 token 的美元成本（来自 API 提供商）
// 积分 = 美元成本 × 200（$1=100积分，加价2倍）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 0.313, output: 2.5 },
  "gpt-5-codex": { input: 0.5, output: 4.0 },
  "gpt-5.1-codex": { input: 0.5, output: 4.0 },
  "gpt-5.2": { input: 0.5, output: 4.0 },
  "gpt-5.2-codex": { input: 0.5, output: 4.0 },
  "gpt-5.2-codex-high": { input: 0.5, output: 4.0 },
  "gpt-5.2-codex-xhigh": { input: 0.5, output: 4.0 },
  "gpt-5.3-codex": { input: 0.5, output: 4.0 },
  "gpt-5.3-codex-high": { input: 0.5, output: 4.0 },
  "gpt-5.3-codex-low": { input: 0.5, output: 4.0 },
  "gpt-5.3-codex-medium": { input: 0.5, output: 4.0 },
  "gpt-5.3-codex-xhigh": { input: 0.5, output: 4.0 },
  "claude-haiku-4-5-20251001": { input: 0.2, output: 1.0 },
  "claude-opus-4-1-20250805": { input: 19.5, output: 97.5 },
  "claude-opus-4-5-20251101": { input: 1.0, output: 5.0 },
  "claude-opus-4-5-20251101-thinking": { input: 1.0, output: 5.0 },
  "claude-opus-4-6": { input: 1.0, output: 5.0 },
  "claude-opus-4-6-thinking": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-5-20250929": { input: 0.6, output: 3.0 },
  "claude-sonnet-4-5-20250929-thinking": { input: 0.6, output: 3.0 },
  "claude-sonnet-4-6": { input: 0.6, output: 3.0 },
  "gemini-2.5-flash": { input: 0.165, output: 1.375 },
  "gemini-2.5-pro": { input: 0.688, output: 5.5 },
  "gemini-2.5-pro-thinking-128": { input: 0.688, output: 5.5 },
  "gemini-3-flash-preview": { input: 1.1, output: 4.4 },
  "gemini-3-pro-preview": { input: 1.1, output: 6.6 },
};

// 默认价格（未知模型兜底）
const DEFAULT_PRICING = { input: 1.0, output: 5.0 };
// 预扣积分上限（流式模式用，相当于约 $0.05 的调用）
const MAX_PRE_DEDUCT = 10;

/** 根据实际 token 用量计算积分（向上取整，最少 1） */
function calculateCredits(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  // 美元成本 = (input_tokens / 1M × input_price) + (output_tokens / 1M × output_price)
  const costUsd =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  // 积分 = 美元 × 200，向上取整，最少 1
  return Math.max(1, Math.ceil(costUsd * 200));
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return jsonResponse({ success: false, error: "未授权" }, 401);

    const body = await req.json();
    const {
      messages,
      model = DEFAULT_MODEL,
      stream = false,
      temperature,
      max_tokens,
      system,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return jsonResponse({ success: false, error: "缺少 messages 参数" }, 400);
    }

    // 构建请求体
    const finalMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;
    const reqBody: Record<string, unknown> = {
      model,
      messages: finalMessages,
      stream,
    };
    if (temperature !== undefined) reqBody.temperature = temperature;
    if (max_tokens !== undefined) reqBody.max_tokens = max_tokens;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========== 流式模式 ==========
    if (stream) {
      // 先预扣积分
      const deductResult = await deductUserCreditsById(userId, MAX_PRE_DEDUCT);
      if (!deductResult.success) {
        return jsonResponse({ success: false, error: deductResult.error }, 402);
      }

      const apiResp = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify(reqBody),
      });

      if (!apiResp.ok) {
        await refundUserCreditsById(userId, MAX_PRE_DEDUCT);
        const errText = await apiResp.text();
        console.error("[llm-chat] stream API error:", apiResp.status, errText);
        return jsonResponse({ success: false, error: `LLM API 错误: ${apiResp.status}` }, 502);
      }

      // 透传 SSE 流，同时拦截最后一个 chunk 拿 usage
      const reader = apiResp.body!.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let usageData: { prompt_tokens: number; completion_tokens: number } | null = null;

      const transformedStream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // 透传给客户端
              controller.enqueue(value);

              // 解析 chunk 尝试提取 usage
              const text = decoder.decode(value, { stream: true });
              const lines = text.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.usage?.prompt_tokens !== undefined) {
                    usageData = {
                      prompt_tokens: json.usage.prompt_tokens,
                      completion_tokens: json.usage.completion_tokens,
                    };
                  }
                } catch { /* 忽略解析错误 */ }
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          } finally {
            // 流结束后结算积分
            if (usageData) {
              const actual = calculateCredits(model, usageData.prompt_tokens, usageData.completion_tokens);
              const refund = MAX_PRE_DEDUCT - actual;
              if (refund > 0) {
                await refundUserCreditsById(userId, refund);
              } else if (refund < 0) {
                // 实际超出预扣，补扣差额
                await deductUserCreditsById(userId, -refund);
              }
              // 记录任务
              await supabase.from("generation_tasks").insert({
                user_id: userId,
                task_type: "text",
                model,
                prompt: finalMessages[finalMessages.length - 1]?.content?.slice(0, 500) || "",
                credits_cost: actual,
                status: "completed",
                request_params: {
                  input_tokens: usageData.prompt_tokens,
                  output_tokens: usageData.completion_tokens,
                  stream: true,
                },
              });
              console.log(`[llm-chat] stream done: model=${model} in=${usageData.prompt_tokens} out=${usageData.completion_tokens} credits=${actual}`);
            } else {
              // 没拿到 usage，扣最低 1 积分，退剩余
              await refundUserCreditsById(userId, MAX_PRE_DEDUCT - 1);
              console.warn("[llm-chat] stream ended without usage data");
            }
          }
        },
      });

      return new Response(transformedStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
        },
      });
    }

    // ========== 非流式模式 ==========
    // 先预扣积分
    const deductResult = await deductUserCreditsById(userId, MAX_PRE_DEDUCT);
    if (!deductResult.success) {
      return jsonResponse({ success: false, error: deductResult.error }, 402);
    }

    const apiResp = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!apiResp.ok) {
      await refundUserCreditsById(userId, MAX_PRE_DEDUCT);
      const errText = await apiResp.text();
      console.error("[llm-chat] API error:", apiResp.status, errText);
      return jsonResponse({ success: false, error: `LLM API 错误: ${apiResp.status}` }, 502);
    }

    const data = await apiResp.json();
    const usage = data.usage;
    const inputTokens = usage?.prompt_tokens || 0;
    const outputTokens = usage?.completion_tokens || 0;

    // 计算实际积分并结算
    const actualCredits = calculateCredits(model, inputTokens, outputTokens);
    const refund = MAX_PRE_DEDUCT - actualCredits;
    if (refund > 0) {
      await refundUserCreditsById(userId, refund);
    } else if (refund < 0) {
      await deductUserCreditsById(userId, -refund);
    }

    // 记录任务
    await supabase.from("generation_tasks").insert({
      user_id: userId,
      task_type: "text",
      model,
      prompt: finalMessages[finalMessages.length - 1]?.content?.slice(0, 500) || "",
      credits_cost: actualCredits,
      status: "completed",
      request_params: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        stream: false,
      },
    });

    console.log(`[llm-chat] done: model=${model} in=${inputTokens} out=${outputTokens} credits=${actualCredits}`);

    return jsonResponse({
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      credits_cost: actualCredits,
    });
  } catch (err: unknown) {
    console.error("[llm-chat] Error:", err);
    return jsonResponse({ success: false, error: "服务器内部错误" }, 500);
  }
});
