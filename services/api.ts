// Supabase API 服务
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import i18next from 'i18next';
import { AspectRatio, MinimaxResolution, MinimaxDuration, WanResolution, WanDuration, WanSize720p, WanSize1080p, WanShotType, PixVerseMode, PixVerseResolution, PixVerseDuration, PixVerseStyle, LtxResolution, LtxDuration, LtxFps, RunwayRatio, RunwayDuration, KlingModelVersion, KlingAspectRatio, KlingDuration, KlingShotType, KlingMultiPromptItem, MagnificScaleFactor, MagnificOptimizedFor, MagnificEngine, PrecisionScaleFactor, PrecisionFlavor, SubscriptionTier, BillingCycle, UserSubscription, ReferralInfo, CreditTransaction } from '../types';

const SUPABASE_URL = 'https://ncdlejeiqyhfauxkwred.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZGxlamVpcXloZmF1eGt3cmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjA1MzQsImV4cCI6MjA4NTkzNjUzNH0.wznPXmHM-oVtuFy6PYS6ELy4GMr1k7_EDNkZJLhOXLw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

function getUserIdFromSession(): string | undefined {
    try {
        const s = localStorage.getItem('supabase-session');
        if (s) return JSON.parse(s)?.user?.id;
    } catch {}
    return undefined;
}

// 解析 JWT 过期时间（秒）
function getTokenExp(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp || 0;
    } catch { return 0; }
}

// 用 refresh_token 刷新 session，更新 localStorage（不影响 supabase 客户端状态）
async function refreshSessionToken(session: { access_token: string; refresh_token: string; user: any }): Promise<string | null> {
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (!res.ok) {
            // refresh_token 也过期了，清除登录态让用户重新登录
            localStorage.removeItem('supabase-session');
            localStorage.removeItem('supabase-login-time');
            window.location.reload();
            return null;
        }
        const data = await res.json();
        if (data.access_token) {
            localStorage.setItem('supabase-session', JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token || session.refresh_token,
                user: data.user || session.user,
            }));
            return data.access_token;
        }
    } catch {}
    return null;
}

// 后台定时刷新 token（每 10 分钟检查一次，token 剩余不足 15 分钟时刷新）
// 页面从后台恢复时主动刷新 token（浏览器会节流后台 setInterval，长时间挂着 token 会过期）
if (!(window as any).__smileTokenRefreshInit) {
    (window as any).__smileTokenRefreshInit = true;

    setInterval(async () => {
        try {
            const sessionStr = localStorage.getItem('supabase-session');
            if (!sessionStr) return;
            const session = JSON.parse(sessionStr);
            if (!session?.access_token || !session?.refresh_token) return;
            const exp = getTokenExp(session.access_token);
            if (!exp || exp - Date.now() / 1000 < 900) {
                await refreshSessionToken(session);
            }
        } catch {}
    }, 10 * 60 * 1000);

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'visible') return;
        try {
            const sessionStr = localStorage.getItem('supabase-session');
            if (!sessionStr) return;
            const session = JSON.parse(sessionStr);
            if (!session?.access_token || !session?.refresh_token) return;
            const exp = getTokenExp(session.access_token);
            if (!exp || exp - Date.now() / 1000 < 900) {
                await refreshSessionToken(session);
            }
        } catch {}
    });
}

// 获取带认证的请求头
// Authorization 始终用 anon key（Supabase 网关要求），用户 JWT 通过 x-user-token 传递
// 注意：不使用 supabase.auth.getSession()，避免 setSession 改变客户端认证状态影响 Realtime
async function getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    };

    try {
        const sessionStr = localStorage.getItem('supabase-session');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session?.access_token) {
                // 如果 token 无法解析或已过期/将在 5 分钟内过期，主动刷新
                const exp = getTokenExp(session.access_token);
                if ((!exp || exp - Date.now() / 1000 < 300) && session.refresh_token) {
                    const newToken = await refreshSessionToken(session);
                    if (newToken) {
                        headers['x-user-token'] = newToken;
                    } else {
                        // 刷新失败，refreshSessionToken 内部会 reload，这里抛错阻止后续请求
                        throw new Error(i18next.t('common:api.sessionExpired'));
                    }
                } else if (!exp) {
                    // token 无法解析且没有 refresh_token
                    localStorage.removeItem('supabase-session');
                    localStorage.removeItem('supabase-login-time');
                    window.location.reload();
                    throw new Error(i18next.t('common:api.sessionExpired'));
                } else {
                    headers['x-user-token'] = session.access_token;
                }
            }
        }
    } catch (e) {
        if (e instanceof Error && e.message === i18next.t('common:api.sessionExpired')) throw e;
    }

    return headers;
}

// ============================================================
// 用户积分
// ============================================================

/**
 * 查询用户积分余额
 */
export async function getUserCredits(userId: string): Promise<number> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/get-user-credits`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();
        if (data.success) return data.credits;
        return -1;
    } catch {
        return -1;
    }
}

let userCreditsChannel: RealtimeChannel | null = null;

/**
 * 订阅用户积分变化（Realtime）
 */
export function subscribeToUserCredits(userId: string, callback: (credits: number) => void) {
    // 先清理旧订阅
    unsubscribeFromUserCredits();

    userCreditsChannel = supabase
        .channel(`user-credits-${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_profiles',
                filter: `id=eq.${userId}`
            },
            (payload) => {
                if (payload.new && typeof payload.new.credits === 'number') {
                    callback(payload.new.credits);
                }
            }
        )
        .subscribe();
}

/**
 * 取消用户积分订阅
 */
export function unsubscribeFromUserCredits() {
    if (userCreditsChannel) {
        supabase.removeChannel(userCreditsChannel);
        userCreditsChannel = null;
    }
}

/**
 * 前端直传图片到 R2（通过 presigned URL）
 * 返回 public URL
 */
export async function uploadImageToR2(file: File): Promise<string> {
    // 1. 获取 presigned URL
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/get-upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content_type: file.type, user_id: getUserIdFromSession() })
    });
    const data = await res.json();
    if (!res.ok || !data.upload_url) {
        throw new Error(data.error || i18next.t('common:api.uploadUrlFailed'));
    }

    // 2. 直传 R2
    const uploadRes = await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });
    if (!uploadRes.ok) {
        throw new Error(i18next.t('common:api.uploadFailed'));
    }

    return data.public_url;
}

// ============================================================
// Seedream 图片生成
// ============================================================

export interface SeedreamParams {
    user_id?: string;

    prompt: string;
    aspect_ratio?: AspectRatio;
    seed?: number;
    enable_safety_checker?: boolean;
    reference_image?: string;
}

export async function generateSeedream(params: SeedreamParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/seedream-generate`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// Minimax（海螺）视频生成
// ============================================================

export interface MinimaxVideoParams {
    user_id?: string;

    prompt: string;
    resolution: MinimaxResolution;
    duration: MinimaxDuration;
    prompt_optimizer: boolean;
    first_frame_image?: string;
    last_frame_image?: string;
}

export async function generateMinimaxVideo(params: MinimaxVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/minimax-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// Wan 视频生成
// ============================================================

export interface WanVideoParams {
    user_id?: string;

    prompt: string;
    resolution: WanResolution;
    duration: WanDuration;
    size: WanSize720p | WanSize1080p;
    negative_prompt?: string;
    enable_prompt_expansion?: boolean;
    shot_type?: WanShotType;
    seed?: number;
    first_frame_image?: string;
}

export async function generateWanVideo(params: WanVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/wan-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// PixVerse V5 视频生成
// ============================================================

export interface PixVerseVideoParams {
    user_id?: string;

    prompt: string;
    mode: PixVerseMode;
    resolution?: PixVerseResolution;
    duration?: PixVerseDuration;
    negative_prompt?: string;
    style?: PixVerseStyle; // 仅 i2v 模式
    seed?: number;
    first_frame_image?: string; // i2v 模式的首帧图片
    last_frame_image?: string; // transition 模式的尾帧图片
}

export async function generatePixVerseVideo(params: PixVerseVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/pixverse-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// LTX Video 2.0 Pro 视频生成
// ============================================================

export interface LtxVideoParams {
    user_id?: string;

    prompt: string;
    resolution?: LtxResolution;
    duration?: LtxDuration;
    fps?: LtxFps;
    generate_audio?: boolean;
    seed?: number;
    first_frame_image?: string; // I2V 模式的首帧图片
}

export async function generateLtxVideo(params: LtxVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/ltx-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// RunWay Gen 4.5 视频生成
// ============================================================

export interface RunwayVideoParams {
    user_id?: string;

    prompt: string;
    ratio?: RunwayRatio;
    duration?: RunwayDuration;
    seed?: number;
    first_frame_image?: string; // I2V 模式的首帧图片
}

export async function generateRunwayVideo(params: RunwayVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/runway-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// Kling 3 视频生成
// ============================================================

export interface KlingVideoParams {
    user_id?: string;

    prompt?: string; // 使用 multi_prompt 时可选
    model_version: KlingModelVersion;
    duration?: KlingDuration;
    aspect_ratio?: KlingAspectRatio;
    negative_prompt?: string;
    cfg_scale?: number;
    generate_audio?: boolean;
    shot_type?: KlingShotType;
    seed?: number;
    start_image?: string; // I2V 首帧图片
    end_image?: string; // I2V 尾帧图片
    reference_video?: string; // V2V 参考视频 URL
    multi_prompt?: KlingMultiPromptItem[] | string[]; // 多镜头提示词
    elements?: { reference_image_urls?: string[]; frontal_image_url?: string }[];
    image_urls?: string[];
}

export async function generateKlingVideo(params: KlingVideoParams): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/kling-video`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(params)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 任务状态查询与订阅（纯 Realtime，无轮询）
// ============================================================

export async function getTaskStatus(taskId: string): Promise<{
    status: string;
    result_url?: string;
    error_message?: string;
} | null> {
    const { data, error } = await supabase
        .from('generation_tasks')
        .select('status, result_url, error_message')
        .eq('id', taskId)
        .single();

    if (error) {
        console.error('Failed to get task status:', error);
        return null;
    }
    return data;
}

/**
 * 订阅任务状态变化（纯 Supabase Realtime）
 */
export function subscribeToTask(
    taskId: string,
    onUpdate: (payload: any) => void
): { channel: RealtimeChannel } {
    const channel = supabase
        .channel(`task-${taskId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'generation_tasks',
                filter: `id=eq.${taskId}`
            },
            (payload) => {
                onUpdate(payload.new);
            }
        )
        .subscribe();

    return { channel };
}

/**
 * 取消订阅
 */
export function unsubscribeFromTask(subscription: { channel: RealtimeChannel }) {
    supabase.removeChannel(subscription.channel);
}

// ============================================================
// 一键抠图（同步接口）
// ============================================================

export async function removeBackground(userId: string, file: File): Promise<{
    success: boolean;
    url?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const imageUrl = await uploadImageToR2(file);

        const response = await fetch(`${FUNCTIONS_URL}/remove-background`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                user_id: userId,
                image: imageUrl
            })
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.removeBgFailed') };
        }

        return { success: true, url: data.url, remaining_credits: data.remaining_credits };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// Magnific 高清放大
// ============================================================

// 创意放大参数
export interface MagnificCreativeParams {
    user_id?: string;

    image: string; // Base64 或 URL
    image_width: number;
    image_height: number;
    scale_factor?: MagnificScaleFactor;
    optimized_for?: MagnificOptimizedFor;
    prompt?: string;
    creativity?: number; // -10 to 10
    hdr?: number; // -10 to 10
    resemblance?: number; // -10 to 10
    fractality?: number; // -10 to 10
    engine?: MagnificEngine;
}

// 精准放大参数
export interface MagnificPrecisionParams {
    user_id?: string;

    image: string; // Base64 或 URL
    image_width: number;
    image_height: number;
    scale_factor?: PrecisionScaleFactor;
    flavor?: PrecisionFlavor;
    sharpen?: number; // 0-100
    smart_grain?: number; // 0-100
    ultra_detail?: number; // 0-100
}

export async function magnificUpscale(params: MagnificCreativeParams | MagnificPrecisionParams, mode: 'creative' | 'precision'): Promise<{
    success: boolean;
    task_id?: string;
    freepik_task_id?: string;
    error?: string;
    remaining_credits?: number;
}> {
    try {
        const body = mode === 'creative'
            ? { ...params, mode: 'creative' }
            : {
                user_id: (params as MagnificPrecisionParams).user_id,
                image: (params as MagnificPrecisionParams).image,
                image_width: (params as MagnificPrecisionParams).image_width,
                image_height: (params as MagnificPrecisionParams).image_height,
                mode: 'precision',
                precision_scale_factor: (params as MagnificPrecisionParams).scale_factor,
                flavor: (params as MagnificPrecisionParams).flavor,
                sharpen: (params as MagnificPrecisionParams).sharpen,
                smart_grain: (params as MagnificPrecisionParams).smart_grain,
                ultra_detail: (params as MagnificPrecisionParams).ultra_detail
            };

        const response = await fetch(`${FUNCTIONS_URL}/magnific-upscale`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || i18next.t('common:api.requestFailed') };
        }

        return {
            success: true,
            task_id: data.task_id,
            freepik_task_id: data.freepik_task_id,
            remaining_credits: data.remaining_credits
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 订阅系统
// ============================================================

/**
 * 获取用户订阅信息
 */
export async function getSubscription(userId: string): Promise<UserSubscription | null> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/get-subscription`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();
        if (!data.success) return null;
        return {
            tier: data.tier as SubscriptionTier,
            tierName: data.tier_name,
            billingCycle: data.billing_cycle || undefined,
            periodEnd: data.period_end || undefined,
            credits: data.credits,
            maxConcurrentImage: data.max_concurrent_image,
            maxConcurrentVideo: data.max_concurrent_video,
            maxConcurrentTotal: data.max_concurrent_total,
            historyHours: data.history_hours,
            persistToR2: data.persist_to_r2,
            features: data.features || [],
        };
    } catch {
        return null;
    }
}

/**
 * 创建支付订单
 */
export async function createPayment(
    userId: string,
    tierId: SubscriptionTier,
    billingCycle: BillingCycle,
    payType: string = 'alipay'
): Promise<{ success: boolean; paymentUrl?: string; qrcodeUrl?: string; orderId?: string; error?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/create-payment`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                user_id: userId,
                tier_id: tierId,
                billing_cycle: billingCycle,
                pay_type: payType
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            return { success: false, error: data.error || i18next.t('common:api.createOrderFailed') };
        }
        return {
            success: true,
            paymentUrl: data.payment_url,
            qrcodeUrl: data.qrcode_url,
            orderId: data.order_id,
        };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

/**
 * PayPal 订单 capture（用户从 PayPal 返回后调用）
 */
export async function capturePaypalOrder(
    userId: string,
    paypalOrderId: string,
    outTradeNo: string
): Promise<{ success: boolean; already_paid?: boolean; error?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/paypal-capture`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                user_id: userId,
                paypal_order_id: paypalOrderId,
                out_trade_no: outTradeNo,
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            return { success: false, error: data.error || i18next.t('common:api.paypalConfirmFailed') };
        }
        return { success: true, already_paid: data.already_paid };
    } catch (err: any) {
        return { success: false, error: err.message || i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 管理后台
// ============================================================

export async function adminQuery(adminPhone: string, queryType: string, params: Record<string, any> = {}): Promise<any> {
    const response = await fetch(`${FUNCTIONS_URL}/admin-query`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ admin_phone: adminPhone, query_type: queryType, params })
    });
    return response.json();
}

export async function adminAction(adminPhone: string, actionType: string, params: Record<string, any> = {}): Promise<any> {
    const response = await fetch(`${FUNCTIONS_URL}/admin-action`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ admin_phone: adminPhone, action_type: actionType, params })
    });
    return response.json();
}

// ============================================================
// 兑换码
// ============================================================

export async function redeemCode(userId: string, code: string): Promise<{ success: boolean; credits_granted?: number; remaining_credits?: number; error?: string; type?: string; tier_id?: string; period_end?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/redeem-code`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId, code })
        });
        return response.json();
    } catch {
        return { success: false, error: i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 提示词优化
// ============================================================

export async function improvePrompt(prompt: string, modality: 'image' | 'video'): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/improve-prompt`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ prompt, modality })
        });
        return response.json();
    } catch {
        return { success: false, error: i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 图片反推提示词
// ============================================================

export async function imageToPrompt(image: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/image-to-prompt`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ image })
        });
        return response.json();
    } catch {
        return { success: false, error: i18next.t('common:api.networkError') };
    }
}

// ============================================================
// Google OAuth ensure-profile
// ============================================================

export async function ensureProfile(referralCode?: string): Promise<{ success: boolean; isNewUser?: boolean; profile?: any; error?: string }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/ensure-profile`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ referral_code: referralCode || undefined })
        });
        return response.json();
    } catch {
        return { success: false, error: i18next.t('common:api.networkError') };
    }
}

// ============================================================
// 邀请返利
// ============================================================

export async function getReferralInfo(userId: string): Promise<ReferralInfo | null> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/referral-info`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId })
        });
        const data = await response.json();
        if (!data.success) return null;
        return {
            referralCode: data.referral_code,
            totalReferrals: data.total_referrals,
            totalSignupBonus: data.total_signup_bonus,
            totalCommission: data.total_commission,
            rewards: data.rewards,
        };
    } catch {
        return null;
    }
}

// ============================================================
// 历史记录
// ============================================================

export async function getHistory(userId: string, limit = 50, offset = 0): Promise<{ id: string; task_type: string; result_url: string; prompt: string; model: string; created_at: string; credits_cost: number }[]> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/get-history`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId, limit, offset })
        });
        const data = await response.json();
        return data.success ? data.items : [];
    } catch {
        return [];
    }
}

/**
 * 删除历史记录（软删除：清空 result_url 使其不再出现在历史列表）
 */
export async function deleteHistoryFromDB(ids: string[]): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('generation_tasks')
            .update({ result_url: null })
            .in('id', ids);
        return !error;
    } catch {
        return false;
    }
}

// ============================================================
// 积分流水
// ============================================================

export async function getCreditTransactions(userId: string, limit = 20, offset = 0, type?: string): Promise<{ items: CreditTransaction[]; total: number }> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/get-credit-transactions`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ user_id: userId, limit, offset, type: type || undefined })
        });
        const data = await response.json();
        return data.success ? { items: data.items, total: data.total } : { items: [], total: 0 };
    } catch {
        return { items: [], total: 0 };
    }
}

/**
 * 获取 R2 文件的下载 URL（presigned，带 Content-Disposition: attachment）
 */
export async function getDownloadUrl(url: string, filename: string): Promise<string> {
    try {
        const response = await fetch(`${FUNCTIONS_URL}/get-download-url`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ url, filename, user_id: getUserIdFromSession() })
        });
        const data = await response.json();
        return data.download_url || url;
    } catch {
        return url;
    }
}
