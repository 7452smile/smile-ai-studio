import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonResponse, handleCors } from "../_shared/response.ts";
import { callFreepikApi } from "../_shared/freepik.ts";

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
    const corsResp = handleCors(req);
    if (corsResp) return corsResp;

    try {
        const { image } = await req.json();

        if (!image || typeof image !== "string") {
            return jsonResponse({ success: false, error: "缺少 image 参数" }, 400);
        }

        // Step 1: POST 创建任务
        const createResult = await callFreepikApi("/v1/ai/image-to-prompt", "POST", {
            image,
        });

        console.log("[image-to-prompt] POST result:", JSON.stringify(createResult));

        if (!createResult.success) {
            return jsonResponse({ success: false, error: createResult.error || "API 调用失败" });
        }

        const taskData = createResult.data?.data;

        // 如果 POST 直接返回 COMPLETED
        if (taskData?.status === "COMPLETED" && taskData?.generated?.length > 0) {
            return jsonResponse({
                success: true,
                text: taskData.generated[0].text || taskData.generated[0],
            });
        }

        const taskId = taskData?.task_id;
        if (!taskId) {
            console.log("[image-to-prompt] No task_id, full data:", JSON.stringify(createResult.data));
            return jsonResponse({ success: false, error: "未获取到 task_id" });
        }

        console.log("[image-to-prompt] Task created:", taskId, "status:", taskData?.status);

        // Step 2: 轮询 GET 直到完成
        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
            await sleep(POLL_INTERVAL_MS);

            const pollResult = await callFreepikApi(`/v1/ai/image-to-prompt/${taskId}`, "GET");

            console.log(`[image-to-prompt] Poll #${i + 1} full:`, JSON.stringify(pollResult.data));

            if (!pollResult.success) continue;

            const pollData = pollResult.data?.data;

            if (pollData?.status === "COMPLETED") {
                const generated = pollData?.generated;
                console.log("[image-to-prompt] COMPLETED generated:", JSON.stringify(generated));
                if (generated?.length > 0) {
                    const text = generated[0].text || generated[0];
                    return jsonResponse({
                        success: true,
                        text: String(text),
                    });
                }
                return jsonResponse({ success: false, error: "分析完成但无结果" });
            }

            if (pollData?.status === "FAILED") {
                return jsonResponse({ success: false, error: "图片分析失败" });
            }
        }

        return jsonResponse({ success: false, error: "分析超时，请重试" });
    } catch (err: any) {
        console.error("[image-to-prompt] Error:", err);
        return jsonResponse({ success: false, error: "服务器错误" }, 500);
    }
});
