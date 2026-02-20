// R2 存储工具函数 - 使用原生 fetch + AWS Signature V4

const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_ENDPOINT = Deno.env.get("R2_ENDPOINT") || "";
const R2_BUCKET = Deno.env.get("R2_BUCKET") || "";
const R2_PUBLIC_URL = Deno.env.get("R2_PUBLIC_URL") || "";

// 获取 host（不含 https://）
function getHost(): string {
    return R2_ENDPOINT.replace("https://", "").replace(/\/$/, "");
}

// HMAC-SHA256
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

// SHA256 hash
async function sha256(data: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// AWS Signature V4
async function signRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: Uint8Array
): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";

    // Payload hash
    const payloadHash = await sha256(body);

    // Canonical headers - host 不含 https://
    const host = getHost();
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalHeaders = [
        `content-type:${headers["Content-Type"]}`,
        `host:${host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
    ].join("\n") + "\n";

    // Canonical request
    const canonicalRequest = [
        method,
        path,
        "", // query string
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join("\n");

    const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));

    // String to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        canonicalRequestHash
    ].join("\n");

    // Signing key
    const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + R2_SECRET_ACCESS_KEY), dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, "aws4_request");

    // Signature
    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
        ...headers,
        "Host": getHost(),
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorization
    };
}

/**
 * 生成 Presigned PUT URL（AWS Signature V4 Query String 方式）
 * 用于前端直传 R2，签名放在 URL 参数里
 */
export async function generatePresignedPutUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
        throw new Error("R2 configuration incomplete");
    }

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";
    const host = getHost();
    const path = `/${R2_BUCKET}/${key}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

    // Query parameters (must be sorted)
    const queryParams = [
        `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
        `X-Amz-Credential=${encodeURIComponent(credential)}`,
        `X-Amz-Date=${amzDate}`,
        `X-Amz-Expires=${expiresIn}`,
        `X-Amz-SignedHeaders=content-type%3Bhost`,
    ].join("&");

    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
    const canonicalRequest = [
        "PUT",
        path,
        queryParams,
        canonicalHeaders,
        "content-type;host",
        "UNSIGNED-PAYLOAD"
    ].join("\n");

    const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHash].join("\n");

    const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + R2_SECRET_ACCESS_KEY), dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, "aws4_request");

    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    return `${R2_ENDPOINT.replace(/\/$/, "")}${path}?${queryParams}&X-Amz-Signature=${signature}`;
}

/**
 * 上传图片到 R2
 */
export async function uploadImageToR2(base64Data: string, filename: string): Promise<string> {
    // 验证环境变量
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET || !R2_PUBLIC_URL) {
        throw new Error("R2 configuration incomplete");
    }

    // 移除 base64 前缀
    let pureBase64 = base64Data;
    let contentType = "image/png";

    if (base64Data.includes(",")) {
        const parts = base64Data.split(",");
        pureBase64 = parts[1];
        const match = parts[0].match(/data:([^;]+);/);
        if (match) {
            contentType = match[1];
        }
    }

    // 解码 base64
    let binaryData: Uint8Array;
    try {
        const binaryString = atob(pureBase64);
        binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            binaryData[i] = binaryString.charCodeAt(i);
        }
    } catch (e) {
        throw new Error("Invalid base64 data");
    }

    // 生成唯一文件路径
    const key = `temp/${Date.now()}_${filename}`;
    const path = `/${R2_BUCKET}/${key}`;

    // 签名请求
    const headers = await signRequest("PUT", path, { "Content-Type": contentType }, binaryData);

    // 上传
    const uploadUrl = `${R2_ENDPOINT.replace(/\/$/, "")}${path}`;
    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: binaryData
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("R2 upload failed:", response.status, text);
        throw new Error(`R2 upload failed: ${response.status}`);
    }

    return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * 从 R2 删除图片
 */
export async function deleteImageFromR2(url: string): Promise<void> {
    const key = url.replace(`${R2_PUBLIC_URL}/`, "");
    const path = `/${R2_BUCKET}/${key}`;

    try {
        const headers = await signRequest("DELETE", path, { "Content-Type": "application/octet-stream" }, new Uint8Array(0));

        const response = await fetch(`${R2_ENDPOINT.replace(/\/$/, "")}${path}`, {
            method: "DELETE",
            headers
        });

        if (response.ok) {
            console.log(`Deleted from R2: ${key}`);
        } else {
            console.error(`Failed to delete from R2: ${response.status}`);
        }
    } catch (err) {
        console.error(`Failed to delete from R2: ${key}`, err);
    }
}

/**
 * 如果是 URL 直接返回，否则走 base64 上传到 R2
 */
export async function ensureImageUrl(imageData: string, filename: string): Promise<string> {
    if (imageData.startsWith("http")) return imageData;
    return await uploadImageToR2(imageData, filename);
}

export async function downloadAndUploadToR2(sourceUrl: string, filename: string): Promise<string> {
    // 验证环境变量
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET || !R2_PUBLIC_URL) {
        throw new Error("R2 configuration incomplete");
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const binaryData = new Uint8Array(arrayBuffer);

    const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    const key = `results/${Date.now()}_${filename}.${ext}`;
    const path = `/${R2_BUCKET}/${key}`;

    const headers = await signRequest("PUT", path, { "Content-Type": contentType }, binaryData);
    const uploadUrl = `${R2_ENDPOINT.replace(/\/$/, "")}${path}`;

    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: binaryData
    });

    if (!uploadResponse.ok) {
        throw new Error(`R2 upload failed: ${uploadResponse.status}`);
    }

    return `${R2_PUBLIC_URL}/${key}`;
}
