import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import i18next from 'i18next';
import {
    AppMode,
    AspectRatio,
    GenerationStatus,
    GeneratedItem,
    ImageModelType,
    VideoModelType,
    UpscaleModelType,
    Notification,
    UserSubscription,
    MinimaxResolution,
    MinimaxDuration,
    MinimaxModelVersion,
    WanModelVersion,
    WanResolution,
    WanDuration,
    WanSize720p,
    WanSize1080p,
    WanShotType,
    PixVerseMode,
    PixVerseResolution,
    PixVerseDuration,
    PixVerseStyle,
    LtxResolution,
    LtxDuration,
    LtxFps,
    RunwayModelVersion,
    RunwayRatio,
    RunwayDuration,
    KlingModelVersion,
    KlingAspectRatio,
    KlingDuration,
    KlingShotType,
    KlingMultiPromptItem,
    KlingElement,
    MagnificScaleFactor,
    MagnificOptimizedFor,
    MagnificEngine,
    PrecisionScaleFactor,
    PrecisionFlavor,
    AgentConfig
} from '../types';
import { generateSeedream, generateBanana, generateMinimaxVideo, generateWanVideo, generatePixVerseVideo, generateLtxVideo, generateRunwayVideo, generateKlingVideo, magnificUpscale, generateTTS, generateMusic, generateSoundEffect, uploadImageToR2, subscribeToTask, unsubscribeFromTask, getTaskStatus, getUserCredits, subscribeToUserCredits, unsubscribeFromUserCredits, getSubscription, ensureProfile, capturePaypalOrder, getHistory, deleteHistoryFromDB, supabase, getAgentConfig } from '../services/api';
import { RealtimeChannel } from '@supabase/supabase-js';
import { estimateCreditsCost } from '../services/creditsCost';
import { ADMIN_PHONES, ADMIN_EMAILS } from '../constants';

// 根据订阅等级获取历史过期时间
function getHistoryExpireMs(tier?: string): number {
    if (tier === 'studio') return 30 * 24 * 60 * 60 * 1000;
    if (tier === 'starter' || tier === 'advanced' || tier === 'flagship') return 7 * 24 * 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000; // 免费版 1 天
}

interface GenerationContextType {
    // State
    activeMode: AppMode;
    setActiveMode: (mode: AppMode) => void;
    status: GenerationStatus;
    result: GeneratedItem | null;
    logs: string[];
    history: GeneratedItem[];
    pendingTasks: GeneratedItem[];
    notifications: Notification[];

    // User Auth
    isLoggedIn: boolean;
    userPhone: string | null;
    userEmail: string | null;
    userId: string | null;
    isAdmin: boolean;
    isAgent: boolean;
    agentConfig: AgentConfig | null;
    logout: () => void;
    setLoginState: (phone: string | null, id?: string, email?: string | null) => void;

    // User Credits
    userCredits: number | null;
    estimatedCost: number;

    // Subscription
    userSubscription: UserSubscription | null;

    // Models
    imageModel: ImageModelType;
    setImageModel: (m: ImageModelType) => void;
    videoModel: VideoModelType;
    setVideoModel: (m: VideoModelType) => void;
    upscaleModel: UpscaleModelType;
    setUpscaleModel: (m: UpscaleModelType) => void;

    // 图片创作参数
    imagePrompt: string;
    setImagePrompt: (s: string) => void;
    imageSeed: string;
    setImageSeed: (s: string) => void;
    imageAspectRatio: AspectRatio;
    setImageAspectRatio: (r: AspectRatio) => void;
    imageReferenceImages: File[];
    setImageReferenceImages: React.Dispatch<React.SetStateAction<File[]>>;
    imageSafetyChecker: boolean;
    setImageSafetyChecker: (v: boolean) => void;

    // 视频生成参数
    videoPrompt: string;
    setVideoPrompt: (s: string) => void;
    videoFirstFrame: File | null;
    setVideoFirstFrame: (f: File | null) => void;
    // Minimax 参数
    minimaxModelVersion: MinimaxModelVersion;
    setMinimaxModelVersion: (v: MinimaxModelVersion) => void;
    minimaxResolution: MinimaxResolution;
    setMinimaxResolution: (r: MinimaxResolution) => void;
    minimaxDuration: MinimaxDuration;
    setMinimaxDuration: (d: MinimaxDuration) => void;
    minimaxPromptOptimizer: boolean;
    setMinimaxPromptOptimizer: (v: boolean) => void;
    minimaxLastFrameImage: File | null;
    setMinimaxLastFrameImage: (f: File | null) => void;
    // Wan 参数
    wanModelVersion: WanModelVersion;
    setWanModelVersion: (v: WanModelVersion) => void;
    wanResolution: WanResolution;
    setWanResolution: (r: WanResolution) => void;
    wanDuration: WanDuration;
    setWanDuration: (d: WanDuration) => void;
    wanSize: WanSize720p | WanSize1080p;
    setWanSize: (s: WanSize720p | WanSize1080p) => void;
    wanNegativePrompt: string;
    setWanNegativePrompt: (s: string) => void;
    wanEnablePromptExpansion: boolean;
    setWanEnablePromptExpansion: (v: boolean) => void;
    wanShotType: WanShotType;
    setWanShotType: (t: WanShotType) => void;
    wanSeed: string;
    setWanSeed: (s: string) => void;
    // PixVerse 参数
    pixverseMode: PixVerseMode;
    setPixverseMode: (m: PixVerseMode) => void;
    pixverseResolution: PixVerseResolution;
    setPixverseResolution: (r: PixVerseResolution) => void;
    pixverseDuration: PixVerseDuration;
    setPixverseDuration: (d: PixVerseDuration) => void;
    pixverseNegativePrompt: string;
    setPixverseNegativePrompt: (s: string) => void;
    pixverseStyle: PixVerseStyle | '';
    setPixverseStyle: (s: PixVerseStyle | '') => void;
    pixverseSeed: string;
    setPixverseSeed: (s: string) => void;
    pixverseLastFrameImage: File | null;
    setPixverseLastFrameImage: (f: File | null) => void;
    // LTX 参数
    ltxResolution: LtxResolution;
    setLtxResolution: (r: LtxResolution) => void;
    ltxDuration: LtxDuration;
    setLtxDuration: (d: LtxDuration) => void;
    ltxFps: LtxFps;
    setLtxFps: (f: LtxFps) => void;
    ltxGenerateAudio: boolean;
    setLtxGenerateAudio: (v: boolean) => void;
    ltxSeed: string;
    setLtxSeed: (s: string) => void;
    // RunWay 参数
    runwayModelVersion: RunwayModelVersion;
    setRunwayModelVersion: (v: RunwayModelVersion) => void;
    runwayRatio: RunwayRatio;
    setRunwayRatio: (r: RunwayRatio) => void;
    runwayDuration: RunwayDuration;
    setRunwayDuration: (d: RunwayDuration) => void;
    runwaySeed: string;
    setRunwaySeed: (s: string) => void;
    // Kling 参数
    klingModelVersion: KlingModelVersion;
    setKlingModelVersion: (v: KlingModelVersion) => void;
    klingDuration: KlingDuration;
    setKlingDuration: (d: KlingDuration) => void;
    klingAspectRatio: KlingAspectRatio;
    setKlingAspectRatio: (r: KlingAspectRatio) => void;
    klingNegativePrompt: string;
    setKlingNegativePrompt: (s: string) => void;
    klingCfgScale: number;
    setKlingCfgScale: (v: number) => void;
    klingShotType: KlingShotType;
    setKlingShotType: (t: KlingShotType) => void;
    klingSeed: string;
    setKlingSeed: (s: string) => void;
    klingEndImage: File | null;
    setKlingEndImage: (f: File | null) => void;
    klingReferenceVideo: File | null;
    setKlingReferenceVideo: (f: File | null) => void;
    klingElements: KlingElement[];
    setKlingElements: React.Dispatch<React.SetStateAction<KlingElement[]>>;
    klingImageUrls: File[];
    setKlingImageUrls: React.Dispatch<React.SetStateAction<File[]>>;
    klingMultiPromptEnabled: boolean;
    setKlingMultiPromptEnabled: (v: boolean) => void;
    klingMultiPrompts: KlingMultiPromptItem[];
    setKlingMultiPrompts: (p: KlingMultiPromptItem[]) => void;
    klingGenerateAudio: boolean;
    setKlingGenerateAudio: (v: boolean) => void;

    // 放大参数
    upscaleImage: File | null;
    setUpscaleImage: (f: File | null) => void;
    upscaleImageDimensions: { width: number; height: number } | null;
    upscalePrompt: string;
    setUpscalePrompt: (s: string) => void;
    // 创意放大参数
    magnificScaleFactor: MagnificScaleFactor;
    setMagnificScaleFactor: (s: MagnificScaleFactor) => void;
    magnificOptimizedFor: MagnificOptimizedFor;
    setMagnificOptimizedFor: (o: MagnificOptimizedFor) => void;
    magnificCreativity: number;
    setMagnificCreativity: (v: number) => void;
    magnificHdr: number;
    setMagnificHdr: (v: number) => void;
    magnificResemblance: number;
    setMagnificResemblance: (v: number) => void;
    magnificFractality: number;
    setMagnificFractality: (v: number) => void;
    magnificEngine: MagnificEngine;
    setMagnificEngine: (e: MagnificEngine) => void;
    // 精准放大参数
    precisionScaleFactor: PrecisionScaleFactor;
    setPrecisionScaleFactor: (s: PrecisionScaleFactor) => void;
    precisionFlavor: PrecisionFlavor | '';
    setPrecisionFlavor: (f: PrecisionFlavor | '') => void;
    precisionSharpen: number;
    setPrecisionSharpen: (v: number) => void;
    precisionSmartGrain: number;
    setPrecisionSmartGrain: (v: number) => void;
    precisionUltraDetail: number;
    setPrecisionUltraDetail: (v: number) => void;

    // TTS 参数
    ttsText: string;
    setTtsText: (s: string) => void;
    ttsVoiceId: string;
    setTtsVoiceId: (s: string) => void;
    ttsStability: number;
    setTtsStability: (v: number) => void;
    ttsSimilarityBoost: number;
    setTtsSimilarityBoost: (v: number) => void;
    ttsSpeed: number;
    setTtsSpeed: (v: number) => void;
    ttsSpeakerBoost: boolean;
    setTtsSpeakerBoost: (v: boolean) => void;

    // Music 参数
    musicPrompt: string;
    setMusicPrompt: (s: string) => void;
    musicLengthSeconds: number;
    setMusicLengthSeconds: (v: number) => void;

    // Sound Effect 参数
    sfxText: string;
    setSfxText: (s: string) => void;
    sfxDuration: number;
    setSfxDuration: (v: number) => void;
    sfxLoop: boolean;
    setSfxLoop: (v: boolean) => void;
    sfxPromptInfluence: number;
    setSfxPromptInfluence: (v: number) => void;
    sfxTranslatedText: string;
    setSfxTranslatedText: (s: string) => void;

    // Actions
    handleGenerate: () => Promise<void>;
    addNotification: (title: string, message: string, type: 'info' | 'success' | 'error') => void;
    removeNotification: (id: string) => void;
    setHistory: React.Dispatch<React.SetStateAction<GeneratedItem[]>>;
    goHome: () => void;
    showLanding: boolean;
    setShowLanding: (show: boolean) => void;
    lightboxItem: { url: string; type: 'image' | 'video' | 'audio' } | null;
    setLightboxItem: (item: { url: string; type: 'image' | 'video' | 'audio' } | null) => void;
    deleteHistoryItems: (ids: string[]) => void;
    applyHistoryParams: (item: GeneratedItem) => void;
    cancelPendingTask: (taskId: string) => void;
    refreshPendingTask: (taskId: string) => Promise<void>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const GenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 从 localStorage 恢复 showLanding 状态
    const [showLanding, setShowLandingState] = useState(() => {
        const saved = localStorage.getItem('ai-studio-show-landing');
        return saved === null ? true : saved === 'true';
    });

    const setShowLanding = useCallback((show: boolean) => {
        setShowLandingState(show);
        localStorage.setItem('ai-studio-show-landing', String(show));
    }, []);

    const [activeMode, setActiveMode] = useState<AppMode>(AppMode.ImageCreation);
    const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.Idle);

    // User Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Agent Config（代理站品牌配置）
    // 使用 lazy initialization 避免闪烁
    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(() => {
        // 在初始化时就检查是否是代理站
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname.includes('smile-ai-studio.com')) {
            return null;
        }
        // 返回 null，但会立即触发加载
        return null;
    });
    const [isAgent, setIsAgent] = useState(false);

    const LOGIN_PERSIST_DAYS = 30;

    useEffect(() => {
        try {
            const sessionStr = localStorage.getItem('supabase-session');
            const loginTime = localStorage.getItem('supabase-login-time');

            if (sessionStr && loginTime) {
                const session = JSON.parse(sessionStr);
                const loginTimestamp = parseInt(loginTime);
                const daysSinceLogin = (Date.now() - loginTimestamp) / (1000 * 60 * 60 * 24);

                if (daysSinceLogin < LOGIN_PERSIST_DAYS && (session?.user?.phone || session?.user?.email || session?.user?.id)) {
                    setIsLoggedIn(true);
                    setUserPhone(session.user.phone || null);
                    setUserEmail(session.user.email || null);
                    if (session.user.id) setUserId(session.user.id);
                } else {
                    localStorage.removeItem('supabase-session');
                    localStorage.removeItem('supabase-login-time');
                }
            }
        } catch (e) {
            console.error("Failed to restore session", e);
        }

        // Google OAuth 回调监听
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // 检查是否已经通过验证码登录（避免重复处理）
                if (localStorage.getItem('supabase-session')) return;

                const user = session.user;
                const referralCode = localStorage.getItem('referral_code') || undefined;

                // 存储 session
                localStorage.setItem('supabase-session', JSON.stringify({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    user: { id: user.id, email: user.email, phone: user.phone }
                }));
                localStorage.setItem('supabase-login-time', Date.now().toString());

                // 调用 ensure-profile
                const agentDomain = window.location.hostname;
                const res = await ensureProfile(referralCode, agentDomain);
                if (res.success) {
                    localStorage.removeItem('referral_code');
                }

                setIsLoggedIn(true);
                setUserId(user.id);
                setUserEmail(user.email || null);
                setUserPhone(user.phone || null);
                setShowLanding(false);
            }
        });

        // 主动检查：Supabase 可能已经从 URL hash 解析了 OAuth session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session && !localStorage.getItem('supabase-session')) {
                const user = session.user;
                const referralCode = localStorage.getItem('referral_code') || undefined;

                localStorage.setItem('supabase-session', JSON.stringify({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    user: { id: user.id, email: user.email, phone: user.phone }
                }));
                localStorage.setItem('supabase-login-time', Date.now().toString());

                const res = await ensureProfile(referralCode);
                if (res.success) {
                    localStorage.removeItem('referral_code');
                }

                setIsLoggedIn(true);
                setUserId(user.id);
                setUserEmail(user.email || null);
                setUserPhone(user.phone || null);
                setShowLanding(false);

                // 清除 URL hash
                if (window.location.hash.includes('access_token')) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        });

        return () => { subscription.unsubscribe(); };
    }, []);

    // 处理支付回调 URL 参数
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment_status');
        const refCode = params.get('ref');
        const paypalToken = params.get('paypal_token') || params.get('token');
        const outTradeNo = params.get('out_trade_no');

        // 捕获邀请码
        if (refCode) {
            localStorage.setItem('referral_code', refCode);
        }

        if (paymentStatus || refCode || paypalToken) {
            // 清除 URL 参数
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (paymentStatus) {
            if (paymentStatus === 'success') {
                addNotification(i18next.t('common:generation.paymentSuccess'), i18next.t('common:generation.paymentSuccessDesc'), 'success');
                setShowLanding(false);
                setActiveMode(AppMode.Pricing);
            } else if (paymentStatus === 'error') {
                addNotification(i18next.t('common:generation.paymentFailed'), i18next.t('common:generation.paymentFailedDesc'), 'error');
            }
        }

        // PayPal 支付返回：capture 订单
        if (paypalToken && outTradeNo && userId) {
            capturePaypalOrder(userId, paypalToken, outTradeNo)
                .then((result) => {
                    if (result.success) {
                        addNotification(i18next.t('common:generation.paymentSuccess'), i18next.t('common:generation.paymentSuccessDesc'), 'success');
                        setShowLanding(false);
                        setActiveMode(AppMode.Pricing);
                    } else {
                        addNotification(i18next.t('common:generation.paymentConfirmFailed'), result.error || i18next.t('common:generation.contactSupport'), 'error');
                    }
                })
                .catch(() => {
                    addNotification(i18next.t('common:generation.networkError'), i18next.t('common:generation.networkErrorDesc'), 'error');
                });
        }
    }, [userId]);

    const logout = useCallback(() => {
        localStorage.removeItem('supabase-session');
        localStorage.removeItem('supabase-login-time');
        localStorage.removeItem('ai-studio-history');
        localStorage.removeItem('ai-studio-pending-tasks');
        setHistory([]);
        setPendingTasks([]);
        setIsLoggedIn(false);
        setUserPhone(null);
        setUserEmail(null);
        setUserId(null);
        setUserCredits(null);
        setShowLanding(true);
        supabase.auth.signOut().catch(() => {});
    }, [setShowLanding]);

    const setLoginState = useCallback((phone: string | null, id?: string, email?: string | null) => {
        setIsLoggedIn(true);
        setUserPhone(phone);
        if (email) setUserEmail(email);
        if (id) setUserId(id);
    }, []);

    // ============================================================
    // 代理配置加载 - 优先级最高，避免闪烁
    // ============================================================
    useEffect(() => {
        const hostname = window.location.hostname;
        console.log('[AgentConfig] Loading for hostname:', hostname);
        if (hostname === 'localhost' || hostname.includes('smile-ai-studio.com')) {
            console.log('[AgentConfig] Main site detected, skipping');
            // 主站直接移除加载类
            document.documentElement.classList.remove('agent-loading');
            document.documentElement.classList.add('agent-loaded');
            return;
        }
        getAgentConfig(hostname).then(res => {
            console.log('[AgentConfig] Response:', res);
            if (res?.agent) {
                const config = res.agent;
                setAgentConfig(config);

                // 立即更新页面标题
                document.title = config.brand_name;

                // 立即更新 favicon
                if (config.logo_url) {
                    // 更新所有 favicon 链接
                    const links = document.querySelectorAll("link[rel*='icon']");
                    links.forEach(link => {
                        (link as HTMLLinkElement).href = config.logo_url;
                    });

                    // 如果没有 favicon，创建一个
                    if (links.length === 0) {
                        const link = document.createElement('link');
                        link.type = 'image/png';
                        link.rel = 'icon';
                        link.href = config.logo_url;
                        document.head.appendChild(link);
                    }
                }

                console.log('[AgentConfig] Loaded:', config);
            } else {
                console.log('[AgentConfig] No agent config found');
            }

            // 配置加载完成，移除加载类，显示内容
            document.documentElement.classList.remove('agent-loading');
            document.documentElement.classList.add('agent-loaded');
        }).catch(err => {
            console.error('[AgentConfig] Error:', err);
            // 即使出错也要显示内容
            document.documentElement.classList.remove('agent-loading');
            document.documentElement.classList.add('agent-loaded');
        });
    }, []);

    // 检查当前用户是否是代理
    useEffect(() => {
        if (!isLoggedIn || !userId) { setIsAgent(false); return; }
        supabase.from('agents').select('id').eq('user_id', userId).eq('status', 'active').single()
            .then(({ data }) => setIsAgent(!!data))
            .catch(() => setIsAgent(false));
    }, [isLoggedIn, userId]);

    // ============================================================
    // 用户积分
    // ============================================================
    const [userCredits, setUserCredits] = useState<number | null>(null);

    // 登录后获取积分 + 订阅 Realtime 变化
    useEffect(() => {
        if (isLoggedIn && userId) {
            getUserCredits(userId!).then(credits => {
                if (credits >= 0) setUserCredits(credits);
            });
            subscribeToUserCredits(userId!, (credits) => {
                setUserCredits(credits);
            });
        } else {
            setUserCredits(null);
            unsubscribeFromUserCredits();
        }
        return () => {
            unsubscribeFromUserCredits();
        };
    }, [isLoggedIn, userPhone, userId]);

    // ============================================================
    // 用户订阅
    // ============================================================
    const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

    useEffect(() => {
        if (isLoggedIn && userId) {
            getSubscription(userId!).then(sub => {
                if (sub) setUserSubscription(sub);
            });
        } else {
            setUserSubscription(null);
        }
    }, [isLoggedIn, userPhone, userId]);

    // Realtime 更新订阅状态（当 user_profiles.subscription_tier 变化时）
    useEffect(() => {
        if (!isLoggedIn || !userId) return;
        const filterStr = `id=eq.${userId}`;
        const channel = supabase
            .channel(`user-sub-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: filterStr
                },
                (payload) => {
                    if (payload.new?.subscription_tier) {
                        // 重新获取完整订阅信息
                        getSubscription(userId!).then(sub => {
                            if (sub) setUserSubscription(sub);
                        });
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isLoggedIn, userId]);

    // 登录后从数据库加载历史记录
    useEffect(() => {
        if (!isLoggedIn || !userId) return;
        getHistory(userId, 50).then(items => {
            if (!items.length) return;
            const dbItems: GeneratedItem[] = items.map(item => ({
                id: item.id,
                type: item.task_type as 'image' | 'video',
                url: item.result_url,
                prompt: item.prompt,
                model: item.model,
                timestamp: new Date(item.created_at).getTime(),
                status: 'completed' as const,
            }));
            setHistory(prev => {
                const existingIds = new Set(prev.map(h => h.id));
                const newItems = dbItems.filter(item => !existingIds.has(item.id));
                if (!newItems.length) return prev;
                return [...newItems, ...prev].sort((a, b) => b.timestamp - a.timestamp);
            });
        });
    }, [isLoggedIn, userId]);

    // ============================================================
    // 图片创作参数
    // ============================================================
    const [imagePrompt, setImagePrompt] = useState(() => localStorage.getItem('ai-studio-image-prompt') || '');
    const [imageSeed, setImageSeed] = useState(() => localStorage.getItem('ai-studio-image-seed') || '');
    const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatio>(AspectRatio.Square);
    const [imageReferenceImages, setImageReferenceImages] = useState<File[]>([]);
    const [imageSafetyChecker, setImageSafetyChecker] = useState(true);

    // Auto-save image prompt
    useEffect(() => {
        try {
            localStorage.setItem('ai-studio-image-prompt', imagePrompt);
        } catch (e) {
            console.error("Failed to save image prompt", e);
        }
    }, [imagePrompt]);

    useEffect(() => {
        try {
            localStorage.setItem('ai-studio-image-seed', imageSeed);
        } catch (e) {
            console.error("Failed to save image seed", e);
        }
    }, [imageSeed]);

    // ============================================================
    // 视频生成参数
    // ============================================================
    const [videoPrompt, setVideoPrompt] = useState(() => localStorage.getItem('ai-studio-video-prompt') || '');
    const [videoFirstFrame, setVideoFirstFrame] = useState<File | null>(null);
    // Minimax 参数
    const [minimaxModelVersion, setMinimaxModelVersion] = useState<MinimaxModelVersion>('hailuo-2.3');
    const [minimaxResolution, setMinimaxResolution] = useState<MinimaxResolution>('768p');
    const [minimaxDuration, setMinimaxDuration] = useState<MinimaxDuration>(6);
    const [minimaxPromptOptimizer, setMinimaxPromptOptimizer] = useState(true);
    const [minimaxLastFrameImage, setMinimaxLastFrameImage] = useState<File | null>(null);
    // Wan 参数
    const [wanModelVersion, setWanModelVersion] = useState<WanModelVersion>('wan-2.6');
    const [wanResolution, setWanResolution] = useState<WanResolution>('720p');
    const [wanDuration, setWanDuration] = useState<WanDuration>('5');
    const [wanSize, setWanSize] = useState<WanSize720p | WanSize1080p>('1280*720');
    const [wanNegativePrompt, setWanNegativePrompt] = useState('');
    const [wanEnablePromptExpansion, setWanEnablePromptExpansion] = useState(false);
    const [wanShotType, setWanShotType] = useState<WanShotType>('single');
    const [wanSeed, setWanSeed] = useState('');
    // PixVerse 参数
    const [pixverseMode, setPixverseMode] = useState<PixVerseMode>('i2v');
    const [pixverseResolution, setPixverseResolution] = useState<PixVerseResolution>('720p');
    const [pixverseDuration, setPixverseDuration] = useState<PixVerseDuration>(5);
    const [pixverseNegativePrompt, setPixverseNegativePrompt] = useState('');
    const [pixverseStyle, setPixverseStyle] = useState<PixVerseStyle | ''>('');
    const [pixverseSeed, setPixverseSeed] = useState('');
    const [pixverseLastFrameImage, setPixverseLastFrameImage] = useState<File | null>(null);
    // LTX 参数
    const [ltxResolution, setLtxResolution] = useState<LtxResolution>('1080p');
    const [ltxDuration, setLtxDuration] = useState<LtxDuration>(6);
    const [ltxFps, setLtxFps] = useState<LtxFps>(25);
    const [ltxGenerateAudio, setLtxGenerateAudio] = useState(false);
    const [ltxSeed, setLtxSeed] = useState('');
    // RunWay 参数
    const [runwayModelVersion, setRunwayModelVersion] = useState<RunwayModelVersion>('runway-4.5');
    const [runwayRatio, setRunwayRatio] = useState<RunwayRatio>('1280:720');
    const [runwayDuration, setRunwayDuration] = useState<RunwayDuration>(5);
    const [runwaySeed, setRunwaySeed] = useState('');
    // Kling 参数
    const [klingModelVersion, setKlingModelVersion] = useState<KlingModelVersion>('kling-3-pro');
    const [klingDuration, setKlingDuration] = useState<KlingDuration>(5);
    const [klingAspectRatio, setKlingAspectRatio] = useState<KlingAspectRatio>('16:9');
    const [klingNegativePrompt, setKlingNegativePrompt] = useState('');
    const [klingCfgScale, setKlingCfgScale] = useState(0.5);
    const [klingShotType, setKlingShotType] = useState<KlingShotType>('customize');
    const [klingSeed, setKlingSeed] = useState('');
    const [klingEndImage, setKlingEndImage] = useState<File | null>(null);
    const [klingReferenceVideo, setKlingReferenceVideo] = useState<File | null>(null);
    const [klingElements, setKlingElements] = useState<KlingElement[]>([]);
    const [klingImageUrls, setKlingImageUrls] = useState<File[]>([]);
    const [klingMultiPromptEnabled, setKlingMultiPromptEnabled] = useState(false);
    const [klingMultiPrompts, setKlingMultiPrompts] = useState<KlingMultiPromptItem[]>([
        { prompt: '', duration: '5' }
    ]);
    const [klingGenerateAudio, setKlingGenerateAudio] = useState(true);

    // TTS 参数
    const [ttsText, setTtsText] = useState('');
    const [ttsVoiceId, setTtsVoiceId] = useState('');
    const [ttsStability, setTtsStability] = useState(0.5);
    const [ttsSimilarityBoost, setTtsSimilarityBoost] = useState(0.2);
    const [ttsSpeed, setTtsSpeed] = useState(1.0);
    const [ttsSpeakerBoost, setTtsSpeakerBoost] = useState(true);

    // Music 参数
    const [musicPrompt, setMusicPrompt] = useState('');
    const [musicLengthSeconds, setMusicLengthSeconds] = useState(60);

    // Sound Effect
    const [sfxText, setSfxText] = useState('');
    const [sfxDuration, setSfxDuration] = useState(5);
    const [sfxLoop, setSfxLoop] = useState(false);
    const [sfxPromptInfluence, setSfxPromptInfluence] = useState(0.3);
    const [sfxTranslatedText, setSfxTranslatedText] = useState('');

    // Auto-save video prompt
    useEffect(() => {
        try {
            localStorage.setItem('ai-studio-video-prompt', videoPrompt);
        } catch (e) {
            console.error("Failed to save video prompt", e);
        }
    }, [videoPrompt]);

    // ============================================================
    // 放大参数
    // ============================================================
    const [upscaleImageFile, setUpscaleImageRaw] = useState<File | null>(null);
    const [upscaleImageDimensions, setUpscaleImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [upscalePrompt, setUpscalePrompt] = useState('');

    // 上传图片时自动读取尺寸
    const setUpscaleImage = useCallback((file: File | null) => {
        setUpscaleImageRaw(file);
        if (file) {
            const img = new Image();
            img.onload = () => {
                setUpscaleImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        } else {
            setUpscaleImageDimensions(null);
        }
    }, []);
    // 创意放大参数
    const [magnificScaleFactor, setMagnificScaleFactor] = useState<MagnificScaleFactor>('2x');
    const [magnificOptimizedFor, setMagnificOptimizedFor] = useState<MagnificOptimizedFor>('standard');
    const [magnificCreativity, setMagnificCreativity] = useState(0);
    const [magnificHdr, setMagnificHdr] = useState(0);
    const [magnificResemblance, setMagnificResemblance] = useState(0);
    const [magnificFractality, setMagnificFractality] = useState(0);
    const [magnificEngine, setMagnificEngine] = useState<MagnificEngine>('automatic');
    // 精准放大参数
    const [precisionScaleFactor, setPrecisionScaleFactor] = useState<PrecisionScaleFactor>(2);
    const [precisionFlavor, setPrecisionFlavor] = useState<PrecisionFlavor | ''>('');
    const [precisionSharpen, setPrecisionSharpen] = useState(7);
    const [precisionSmartGrain, setPrecisionSmartGrain] = useState(7);
    const [precisionUltraDetail, setPrecisionUltraDetail] = useState(30);

    const [result, setResult] = useState<GeneratedItem | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // 标记是否已完成初始化加载
    const historyInitializedRef = useRef(false);

    // 历史记录初始化
    const [history, setHistory] = useState<GeneratedItem[]>(() => {
        try {
            const savedHistory = localStorage.getItem('ai-studio-history');
            if (savedHistory) {
                const parsed: GeneratedItem[] = JSON.parse(savedHistory);
                const now = Date.now();
                const filtered = parsed.filter(item =>
                    (!item.status || item.status === 'completed') && (now - item.timestamp) < 30 * 24 * 60 * 60 * 1000
                );
                historyInitializedRef.current = true;
                return filtered;
            }
        } catch (e) {
            console.error("[History] Failed to load:", e);
        }
        historyInitializedRef.current = true;
        return [];
    });

    // 标记 pendingTasks 是否已初始化
    const pendingInitializedRef = useRef(false);

    // 从 localStorage 恢复 pendingTasks
    const [pendingTasks, setPendingTasks] = useState<GeneratedItem[]>(() => {
        try {
            const savedPending = localStorage.getItem('ai-studio-pending-tasks');
            if (savedPending) {
                const parsed: GeneratedItem[] = JSON.parse(savedPending);
                // 过滤掉超过1小时的任务（可能已经失效）
                const now = Date.now();
                const filtered = parsed.filter(item => (now - item.timestamp) < 30 * 24 * 60 * 60 * 1000);
                pendingInitializedRef.current = true;
                return filtered;
            }
        } catch (e) {
            console.error("[PendingTasks] Failed to load:", e);
        }
        pendingInitializedRef.current = true;
        return [];
    });
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Model States
    const [imageModel, setImageModel] = useState<ImageModelType>('seedream');
    const [videoModel, setVideoModel] = useState<VideoModelType>('kling');
    const [upscaleModel, setUpscaleModel] = useState<UpscaleModelType>('creative');

    const [lightboxItem, setLightboxItem] = useState<{ url: string; type: 'image' | 'video' | 'audio' } | null>(null);

    // Realtime 订阅引用 - 改为 Map 支持多任务（纯 Realtime，无轮询）
    const subscriptionsRef = useRef<Map<string, { channel: RealtimeChannel }>>(new Map());

    // Save History to LocalStorage - 只在初始化完成后才保存
    useEffect(() => {
        if (!historyInitializedRef.current) return;
        try {
            localStorage.setItem('ai-studio-history', JSON.stringify(history));
        } catch (e) {
            console.error("[History] Failed to save:", e);
        }
    }, [history]);

    // Save PendingTasks to LocalStorage
    useEffect(() => {
        if (!pendingInitializedRef.current) return;
        try {
            localStorage.setItem('ai-studio-pending-tasks', JSON.stringify(pendingTasks));
        } catch (e) {
            console.error("[PendingTasks] Failed to save:", e);
        }
    }, [pendingTasks]);

    // 定时清理过期的历史记录（每分钟检查一次）
    useEffect(() => {
        const expireMs = getHistoryExpireMs(userSubscription?.tier);
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            setHistory(prev => prev.filter(item => (now - item.timestamp) < expireMs));
        }, 60000);
        return () => clearInterval(cleanupInterval);
    }, [userSubscription?.tier]);

    // 定时检查卡住的任务（每2分钟检查一次超过3分钟的任务）
    useEffect(() => {
        const checkStuckTasks = setInterval(async () => {
            const now = Date.now();
            const stuckThreshold = 3 * 60 * 1000; // 3分钟

            for (const task of pendingTasks) {
                const waitTime = now - task.timestamp;

                // 超过3分钟，检查状态
                if (waitTime > stuckThreshold) {
                    const currentStatus = await getTaskStatus(task.id);

                    if (currentStatus?.status === 'completed' && currentStatus.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                        const completedItem: GeneratedItem = {
                            ...task,
                            url: currentStatus.result_url!,
                            status: 'completed',
                            timestamp: Date.now()
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === task.id)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);

                        const sub = subscriptionsRef.current.get(task.id);
                        if (sub) {
                            unsubscribeFromTask(sub);
                            subscriptionsRef.current.delete(task.id);
                        }
                    } else if (currentStatus?.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== task.id));

                        const sub = subscriptionsRef.current.get(task.id);
                        if (sub) {
                            unsubscribeFromTask(sub);
                            subscriptionsRef.current.delete(task.id);
                        }
                    }
                }
            }
        }, 2 * 60 * 1000); // 每2分钟检查一次

        return () => clearInterval(checkStuckTasks);
    }, [pendingTasks]);

    // 组件卸载时清理所有订阅
    useEffect(() => {
        return () => {
            subscriptionsRef.current.forEach((sub) => {
                unsubscribeFromTask(sub);
            });
            subscriptionsRef.current.clear();
        };
    }, []);

    // Reset status on mode change
    useEffect(() => {
        setStatus(GenerationStatus.Idle);
        setResult(null);
        setLogs([]);
    }, [activeMode]);

    const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const id = Date.now().toString() + Math.random().toString();
        setNotifications(prev => [...prev, { id, title, message, type }]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev, message]);
    }, []);

    const deleteHistoryItems = useCallback((ids: string[]) => {
        setHistory(prev => prev.filter(item => !ids.includes(item.id)));
        deleteHistoryFromDB(ids);
        addNotification(i18next.t('common:generation.deleteSuccess'), i18next.t('common:generation.deleteSuccessDesc', { count: ids.length }), 'success');
    }, [addNotification]);

    // 重新订阅未完成的任务（页面刷新后恢复）
    // 使用 ref 来存储 addNotification 以避免依赖循环
    const addNotificationRef = useRef(addNotification);
    addNotificationRef.current = addNotification;

    useEffect(() => {
        // 延迟执行，确保组件完全挂载
        const timer = setTimeout(() => {
            const currentPendingTasks = JSON.parse(localStorage.getItem('ai-studio-pending-tasks') || '[]') as GeneratedItem[];
            if (currentPendingTasks.length === 0) return;

            const resubscribeTasks = async () => {
                for (const task of currentPendingTasks) {
                    // 跳过已经订阅的任务
                    if (subscriptionsRef.current.has(task.id)) continue;

                    // 先检查任务当前状态
                    const currentStatus = await getTaskStatus(task.id);

                    if (currentStatus?.status === 'completed' && currentStatus.result_url) {
                        // 任务已完成，直接移到历史记录
                        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                        const completedItem: GeneratedItem = {
                            ...task,
                            url: currentStatus.result_url!,
                            status: 'completed',
                            timestamp: Date.now()
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === task.id)) return prev;
                            return [completedItem, ...prev];
                        });
                        addNotificationRef.current(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.workReady'), 'success');
                    } else if (currentStatus?.status === 'failed') {
                        // 任务失败，从队列移除
                        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                        addNotificationRef.current(i18next.t('common:generation.generateFailed'), currentStatus.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                    } else {
                        // 任务仍在进行中，重新订阅
                        const subscription = subscribeToTask(task.id, (updatedTask) => {
                            if (updatedTask.status === 'completed' && updatedTask.result_url) {
                                setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                                const completedItem: GeneratedItem = {
                                    ...task,
                                    url: updatedTask.result_url,
                                    status: 'completed',
                                    timestamp: Date.now()
                                };
                                setHistory(prev => {
                                    if (prev.some(item => item.id === task.id)) return prev;
                                    return [completedItem, ...prev];
                                });
                                setResult(completedItem);
                                addNotificationRef.current(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.workReady'), 'success');

                                const sub = subscriptionsRef.current.get(task.id);
                                if (sub) {
                                    unsubscribeFromTask(sub);
                                    subscriptionsRef.current.delete(task.id);
                                }
                            } else if (updatedTask.status === 'failed') {
                                setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                                addNotificationRef.current(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                                const sub = subscriptionsRef.current.get(task.id);
                                if (sub) {
                                    unsubscribeFromTask(sub);
                                    subscriptionsRef.current.delete(task.id);
                                }
                            }
                        });
                        subscriptionsRef.current.set(task.id, subscription);
                    }
                }
            };

            resubscribeTasks();
        }, 100);

        return () => clearTimeout(timer);
    }, []); // 只在组件挂载时执行一次

    // 应用历史记录的参数到当前设置
    const applyHistoryParams = useCallback((item: GeneratedItem) => {
        // 切换到对应的模式和模型，并设置参数
        if (item.type === 'image') {
            setActiveMode(AppMode.ImageCreation);
            setImagePrompt(item.prompt);
            if (item.model === 'seedream' || item.model === 'seedream-edit') {
                setImageModel('seedream');
            } else if (item.model === 'banana' || item.model === 'banana-edit') {
                setImageModel('banana');
            }
            // 设置图片参数
            if (item.params) {
                if (item.params.aspectRatio) setImageAspectRatio(item.params.aspectRatio);
                if (item.params.seed) setImageSeed(item.params.seed);
                if (item.params.safetyChecker !== undefined) setImageSafetyChecker(item.params.safetyChecker);
            }
        } else if (item.type === 'video') {
            setActiveMode(AppMode.VideoGeneration);
            setVideoPrompt(item.prompt);
            setVideoModel(item.model as VideoModelType);
        } else if (item.type === 'audio') {
            setActiveMode(AppMode.TextToSpeech);
            setTtsText(item.prompt);
        }

        if (item.model === 'creative' || item.model === 'faithful') {
            setActiveMode(AppMode.Upscale);
            setUpscaleModel(item.model as UpscaleModelType);
        }

        addNotification(i18next.t('common:generation.paramsLoaded'), i18next.t('common:generation.paramsLoadedDesc'), 'success');
    }, [addNotification]);

    // 取消待处理任务
    const cancelPendingTask = useCallback((taskId: string) => {
        // 取消订阅
        const sub = subscriptionsRef.current.get(taskId);
        if (sub) {
            unsubscribeFromTask(sub);
            subscriptionsRef.current.delete(taskId);
        }
        // 从队列移除
        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
        addNotification(i18next.t('common:generation.cancelled'), i18next.t('common:generation.cancelledDesc'), 'info');
    }, [addNotification]);

    // 手动刷新检查任务状态
    const refreshPendingTask = useCallback(async (taskId: string) => {
        const task = pendingTasks.find(t => t.id === taskId);
        if (!task) return;

        addNotification(i18next.t('common:generation.checking'), i18next.t('common:generation.checkingDesc'), 'info');

        const currentStatus = await getTaskStatus(taskId);

        if (currentStatus?.status === 'completed' && currentStatus.result_url) {
            // 任务已完成
            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
            const completedItem: GeneratedItem = {
                ...task,
                url: currentStatus.result_url!,
                status: 'completed',
                timestamp: Date.now()
            };
            setHistory(prev => {
                if (prev.some(item => item.id === taskId)) return prev;
                return [completedItem, ...prev];
            });
            setResult(completedItem);
            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.workReady'), 'success');

            const sub = subscriptionsRef.current.get(taskId);
            if (sub) {
                unsubscribeFromTask(sub);
                subscriptionsRef.current.delete(taskId);
            }
        } else if (currentStatus?.status === 'failed') {
            // 任务失败
            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
            addNotification(i18next.t('common:generation.generateFailed'), currentStatus.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
            // 失败退款后主动刷新积分
            if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

            const sub = subscriptionsRef.current.get(taskId);
            if (sub) {
                unsubscribeFromTask(sub);
                subscriptionsRef.current.delete(taskId);
            }
        } else {
            // 仍在处理中
            addNotification(i18next.t('common:generation.processing'), i18next.t('common:generation.processingDesc'), 'info');
        }
    }, [pendingTasks, addNotification]);

    // 估算当前操作的积分消耗
    const estimatedCost = useMemo(() => {
        const scaleFactor = upscaleModel === 'creative'
            ? parseInt(String(magnificScaleFactor).replace('x', ''))
            : (typeof precisionScaleFactor === 'number' ? precisionScaleFactor : parseInt(String(precisionScaleFactor)));
        return estimateCreditsCost({
            mode: activeMode,
            imageModel,
            videoModel,
            minimaxResolution,
            minimaxDuration,
            wanResolution,
            wanDuration,
            pixverseResolution,
            pixverseDuration,
            ltxResolution,
            ltxDuration,
            runwayDuration,
            klingModelVersion,
            klingDuration,
            klingGenerateAudio,
            upscaleModel,
            imageWidth: upscaleImageDimensions?.width || 0,
            imageHeight: upscaleImageDimensions?.height || 0,
            scaleFactor,
            ttsTextLength: ttsText.replace(/\n/g, '').length,
            musicLengthSeconds,
            soundEffectDuration: sfxDuration,
        });
    }, [activeMode, imageModel, videoModel, minimaxResolution, minimaxDuration, wanResolution, wanDuration, pixverseResolution, pixverseDuration, ltxResolution, ltxDuration, runwayDuration, klingModelVersion, klingDuration, klingGenerateAudio, upscaleModel, upscaleImageDimensions, magnificScaleFactor, precisionScaleFactor, ttsText, musicLengthSeconds, sfxDuration]);

    const handleGenerate = useCallback(async () => {
        // 检查登录状态
        if (!isLoggedIn || !userId) {
            addNotification(i18next.t('common:generation.loginFirst'), i18next.t('common:generation.loginFirstDesc'), 'error');
            return;
        }

        // 检查积分余额
        if (userCredits !== null && estimatedCost > 0 && userCredits < estimatedCost) {
            addNotification(i18next.t('common:generation.insufficientCredits'), i18next.t('common:generation.insufficientCreditsDesc', { cost: estimatedCost, balance: userCredits }), 'error');
            return;
        }

        // 根据模式获取对应的参数
        const currentPrompt = activeMode === AppMode.ImageCreation ? imagePrompt
            : activeMode === AppMode.VideoGeneration ? videoPrompt
            : activeMode === AppMode.TextToSpeech ? ttsText
            : activeMode === AppMode.MusicGeneration ? musicPrompt
            : activeMode === AppMode.SoundEffect ? sfxText
            : upscalePrompt;

        // Basic validations
        if (activeMode === AppMode.TextToSpeech) {
            if (!ttsText.trim()) {
                addNotification(i18next.t('common:generation.emptyPrompt'), i18next.t('common:generation.enterTtsText'), 'error');
                return;
            }
            if (!ttsVoiceId) {
                addNotification(i18next.t('common:generation.emptyPrompt'), i18next.t('common:generation.selectVoice'), 'error');
                return;
            }
        } else if (activeMode !== AppMode.Upscale && !currentPrompt) {
            addNotification(i18next.t('common:generation.emptyPrompt'), i18next.t('common:generation.emptyPromptDesc'), 'error');
            return;
        }
        if (activeMode === AppMode.Upscale && !upscaleImageFile) {
            addNotification(i18next.t('common:generation.imageMissing'), i18next.t('common:generation.imageMissingDesc'), 'error');
            return;
        }

        setStatus(GenerationStatus.Generating);
        setLogs([i18next.t('common:generation.taskInit')]);

        const seedNum = imageSeed ? parseInt(imageSeed) : undefined;
        const currentParams = { aspectRatio: imageAspectRatio, seed: imageSeed, safetyChecker: imageSafetyChecker };

        try {
            // Seedream 图片生成（真实 API）
            if (activeMode === AppMode.ImageCreation && imageModel === 'seedream') {
                addLog(i18next.t('common:generation.callingModel', { model: 'Seedream 4.5' }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                // 准备参考图片（如果有）
                let referenceImageUrl: string | undefined;
                if (imageReferenceImages.length > 0) {
                    addLog(i18next.t('common:generation.uploadingRefImages', { count: imageReferenceImages.length }));
                    referenceImageUrl = await uploadImageToR2(imageReferenceImages[0]);
                }

                // 调用 API
                const result = await generateSeedream({
                    user_id: userId || undefined,
                    prompt: imagePrompt,
                    aspect_ratio: imageAspectRatio,
                    seed: seedNum,
                    enable_safety_checker: imageSafetyChecker,
                    reference_image: referenceImageUrl
                });

                if (!result.success) {
                    throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                }

                if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.imageGenerating'), 'success');

                const taskId = result.task_id!;
                const taskModel = imageReferenceImages.length > 0 ? 'seedream-edit' : 'seedream';
                const taskPrompt = imagePrompt;
                const taskParams = { ...currentParams };

                // 添加到待处理队列
                const pendingItem: GeneratedItem = {
                    id: taskId,
                    type: 'image',
                    url: '',
                    prompt: taskPrompt,
                    timestamp: Date.now(),
                    model: taskModel,
                    status: 'processing',
                    params: taskParams
                };
                setPendingTasks(prev => [...prev, pendingItem]);

                // 任务提交成功后立即恢复 Idle 状态，允许用户继续提交新任务
                setStatus(GenerationStatus.Idle);
                setLogs([]);

                // 订阅 Realtime 获取结果（每个任务独立订阅）
                const subscription = subscribeToTask(taskId, (updatedTask) => {
                    if (updatedTask.status === 'completed' && updatedTask.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                        const completedItem: GeneratedItem = {
                            id: taskId,
                            type: 'image',
                            url: updatedTask.result_url,
                            prompt: taskPrompt,
                            timestamp: Date.now(),
                            model: taskModel,
                            status: 'completed',
                            params: taskParams
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === taskId)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);
                        addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.workReady'), 'success');

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) {
                            unsubscribeFromTask(sub);
                            subscriptionsRef.current.delete(taskId);
                        }
                    } else if (updatedTask.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                        // 失败退款后主动刷新积分
                        if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) {
                            unsubscribeFromTask(sub);
                            subscriptionsRef.current.delete(taskId);
                        }
                    }
                });

                // 保存订阅引用
                subscriptionsRef.current.set(taskId, subscription);

                return;
            }

            // Banana Pro 图片生成
            if (activeMode === AppMode.ImageCreation && imageModel === 'banana') {
                addLog(i18next.t('common:generation.callingModel', { model: 'Banana Pro' }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                let referenceImageUrl: string | undefined;
                if (imageReferenceImages.length > 0) {
                    addLog(i18next.t('common:generation.uploadingRefImages', { count: imageReferenceImages.length }));
                    referenceImageUrl = await uploadImageToR2(imageReferenceImages[0]);
                }

                const result = await generateBanana({
                    user_id: userId || undefined,
                    prompt: imagePrompt,
                    aspect_ratio: imageAspectRatio,
                    seed: seedNum,
                    enable_safety_checker: imageSafetyChecker,
                    reference_image: referenceImageUrl
                });

                if (!result.success) {
                    throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                }

                if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.imageGenerating'), 'success');

                const taskId = result.task_id!;
                const taskModel = imageReferenceImages.length > 0 ? 'banana-edit' : 'banana';
                const taskPrompt = imagePrompt;
                const taskParams = { ...currentParams };

                const pendingItem: GeneratedItem = {
                    id: taskId, type: 'image', url: '', prompt: taskPrompt,
                    timestamp: Date.now(), model: taskModel, status: 'processing', params: taskParams
                };
                setPendingTasks(prev => [...prev, pendingItem]);
                setStatus(GenerationStatus.Idle);
                setLogs([]);

                const subscription = subscribeToTask(taskId, (updatedTask) => {
                    if (updatedTask.status === 'completed' && updatedTask.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        const completedItem: GeneratedItem = {
                            id: taskId, type: 'image', url: updatedTask.result_url, prompt: taskPrompt,
                            timestamp: Date.now(), model: taskModel, status: 'completed', params: taskParams
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === taskId)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);
                        addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.workReady'), 'success');
                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    } else if (updatedTask.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                        if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });
                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    }
                });
                subscriptionsRef.current.set(taskId, subscription);

                return;
            }

            // 未实现的图片模型
            if (activeMode === AppMode.ImageCreation) {
                throw new Error(i18next.t('common:generation.modelNotAvailable', { model: imageModel }));
            }
            else if (activeMode === AppMode.VideoGeneration) {
                // Minimax（海螺）视频生成（真实 API）
                if (videoModel === 'minimax') {
                    addLog(i18next.t('common:generation.callingModel', { model: 'Minimax' }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // 准备首帧图片（如果有）
                    let firstFrameUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        firstFrameUrl = await uploadImageToR2(videoFirstFrame);
                    }

                    // 准备尾帧图片（如果有）
                    let lastFrameUrl: string | undefined;
                    if (minimaxLastFrameImage) {
                        addLog(i18next.t('common:generation.uploadingLastFrame'));
                        lastFrameUrl = await uploadImageToR2(minimaxLastFrameImage);
                    }

                    // 调用 API
                    const result = await generateMinimaxVideo({
                        user_id: userId || undefined,
                        prompt: videoPrompt,
                        resolution: minimaxResolution,
                        duration: minimaxDuration,
                        prompt_optimizer: minimaxPromptOptimizer,
                        first_frame_image: firstFrameUrl,
                        last_frame_image: lastFrameUrl
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: 'minimax',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: 'minimax',
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // Wan 视频生成（真实 API）
                if (videoModel === 'wan') {
                    addLog(i18next.t('common:generation.callingModel', { model: 'Wan 2.6' }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // 准备首帧图片（如果有）
                    let firstFrameUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        firstFrameUrl = await uploadImageToR2(videoFirstFrame);
                    }

                    // 调用 API
                    const result = await generateWanVideo({
                        user_id: userId || undefined,
                        prompt: videoPrompt,
                        resolution: wanResolution,
                        duration: wanDuration,
                        size: wanSize,
                        negative_prompt: wanNegativePrompt || undefined,
                        enable_prompt_expansion: wanEnablePromptExpansion,
                        shot_type: wanShotType,
                        seed: wanSeed ? parseInt(wanSeed) : undefined,
                        first_frame_image: firstFrameUrl
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: 'wan',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: 'wan',
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // PixVerse V5 视频生成（真实 API）
                if (videoModel === 'pixverse') {
                    addLog(i18next.t('common:generation.callingModel', { model: `PixVerse V5` }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // 准备首帧图片（必需）
                    let firstFrameUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        firstFrameUrl = await uploadImageToR2(videoFirstFrame);
                    } else {
                        throw new Error(i18next.t('common:generation.pixverseFirstFrameRequired'));
                    }

                    // 准备尾帧图片（仅 transition 模式）
                    let lastFrameUrl: string | undefined;
                    if (pixverseMode === 'transition') {
                        if (pixverseLastFrameImage) {
                            addLog(i18next.t('common:generation.uploadingLastFrame'));
                            lastFrameUrl = await uploadImageToR2(pixverseLastFrameImage);
                        } else {
                            throw new Error(i18next.t('common:generation.pixverseLastFrameRequired'));
                        }
                    }

                    // 调用 API
                    const result = await generatePixVerseVideo({
                        user_id: userId || undefined,
                        prompt: videoPrompt,
                        mode: pixverseMode,
                        resolution: pixverseResolution,
                        duration: pixverseDuration,
                        negative_prompt: pixverseNegativePrompt || undefined,
                        style: pixverseMode === 'i2v' && pixverseStyle ? pixverseStyle : undefined,
                        seed: pixverseSeed ? parseInt(pixverseSeed) : undefined,
                        first_frame_image: firstFrameUrl,
                        last_frame_image: lastFrameUrl
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: 'pixverse',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: 'pixverse',
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // LTX Video 2.0 Pro 视频生成（真实 API）
                if (videoModel === 'ltx') {
                    const isI2V = !!videoFirstFrame;
                    addLog(i18next.t('common:generation.callingModel', { model: `LTX Video 2.0 Pro` }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // 准备首帧图片（如果有）
                    let firstFrameUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        firstFrameUrl = await uploadImageToR2(videoFirstFrame);
                    }

                    // 调用 API
                    const result = await generateLtxVideo({
                        user_id: userId || undefined,
                        prompt: videoPrompt,
                        resolution: ltxResolution,
                        duration: ltxDuration,
                        fps: ltxFps,
                        generate_audio: ltxGenerateAudio,
                        seed: ltxSeed ? parseInt(ltxSeed) : undefined,
                        first_frame_image: firstFrameUrl
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: 'ltx',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: 'ltx',
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // RunWay Gen 4.5 视频生成（真实 API）
                if (videoModel === 'runway') {
                    if (runwayModelVersion !== 'runway-4.5') {
                        throw new Error(i18next.t('common:generation.runwayDeprecated'));
                    }

                    const isI2V = !!videoFirstFrame;
                    addLog(i18next.t('common:generation.callingModel', { model: `RunWay Gen 4.5` }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // 准备首帧图片（如果有）
                    let firstFrameUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        firstFrameUrl = await uploadImageToR2(videoFirstFrame);
                    }

                    // 调用 API
                    const result = await generateRunwayVideo({
                        user_id: userId || undefined,
                        prompt: videoPrompt,
                        ratio: runwayRatio,
                        duration: runwayDuration,
                        seed: runwaySeed ? parseInt(runwaySeed) : undefined,
                        first_frame_image: firstFrameUrl
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: 'runway',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: 'runway',
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // Kling 3 视频生成（真实 API）
                if (videoModel === 'kling') {
                    const modelNameMap: Record<string, string> = {
                        'kling-3-pro': 'Kling 3 Pro',
                        'kling-3-std': 'Kling 3 Std',
                        'kling-3-omni-pro': 'Kling 3 Omni Pro',
                        'kling-3-omni-std': 'Kling 3 Omni Std',
                        'kling-3-omni-pro-v2v': 'Kling 3 Omni Pro V2V',
                        'kling-3-omni-std-v2v': 'Kling 3 Omni Std V2V',
                    };
                    const modelName = modelNameMap[klingModelVersion] || 'Kling 3 Pro';
                    addLog(i18next.t('common:generation.callingModel', { model: modelName }));
                    addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                    // V2V 模式验证
                    const isKlingV2V = klingModelVersion === 'kling-3-omni-pro-v2v' || klingModelVersion === 'kling-3-omni-std-v2v';
                    if (isKlingV2V && !klingReferenceVideo) {
                        throw new Error(i18next.t('common:generation.klingV2VRequired'));
                    }

                    // 准备首帧图片（如果有）
                    let startImageUrl: string | undefined;
                    if (videoFirstFrame) {
                        addLog(i18next.t('common:generation.uploadingFirstFrame'));
                        startImageUrl = await uploadImageToR2(videoFirstFrame);
                    }

                    // 准备尾帧图片（如果有，V2V 不支持）
                    let endImageUrl: string | undefined;
                    if (klingEndImage && !isKlingV2V) {
                        addLog(i18next.t('common:generation.uploadingLastFrame'));
                        endImageUrl = await uploadImageToR2(klingEndImage);
                    }

                    // 上传 elements 图片到 R2（V2V 不支持）
                    let uploadedElements: { reference_image_urls?: string[]; frontal_image_url?: string }[] = [];
                    if (klingElements.length > 0 && !isKlingV2V) {
                        addLog(i18next.t('common:generation.uploadingElements'));
                        for (const el of klingElements) {
                            const item: { reference_image_urls?: string[]; frontal_image_url?: string } = {};
                            if (el.frontalImage) {
                                item.frontal_image_url = await uploadImageToR2(el.frontalImage);
                            }
                            if (el.referenceImages.length > 0) {
                                item.reference_image_urls = await Promise.all(el.referenceImages.map(f => uploadImageToR2(f)));
                            }
                            uploadedElements.push(item);
                        }
                    }

                    // 上传 image_urls 图片到 R2（仅 Omni Pro/Std）
                    const isKlingOmni = klingModelVersion === 'kling-3-omni-pro' || klingModelVersion === 'kling-3-omni-std';
                    let uploadedImageUrls: string[] = [];
                    if (klingImageUrls.length > 0 && isKlingOmni) {
                        addLog(i18next.t('common:generation.uploadingImageUrls'));
                        uploadedImageUrls = await Promise.all(klingImageUrls.map(f => uploadImageToR2(f)));
                    }

                    // 上传参考视频到 R2（V2V 模式）
                    let uploadedReferenceVideoUrl: string | undefined;
                    if (isKlingV2V && klingReferenceVideo) {
                        addLog(i18next.t('common:generation.uploadingReferenceVideo'));
                        uploadedReferenceVideoUrl = await uploadImageToR2(klingReferenceVideo);
                    }

                    // 准备 multi_prompt（如果启用）
                    let multiPromptData: KlingMultiPromptItem[] | string[] | undefined;
                    if (klingMultiPromptEnabled && klingMultiPrompts.length > 0 && !isKlingV2V) {
                        // 过滤掉空的提示词
                        const validPrompts = klingMultiPrompts.filter(p => p.prompt.trim());
                        if (validPrompts.length > 0) {
                            if (klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std') {
                                // Pro/Std 版本使用对象数组
                                multiPromptData = validPrompts;
                            } else {
                                // Omni 版本使用字符串数组
                                multiPromptData = validPrompts.map(p => p.prompt);
                            }
                            addLog(i18next.t('common:generation.multiShotCount', { count: validPrompts.length }));
                        }
                    }

                    // 准备请求参数
                    // 调用 API（根据模型版本传递正确的参数）
                    const result = await generateKlingVideo({
                        user_id: userId || undefined,
                        // 使用 multi_prompt 时 prompt 可选
                        prompt: multiPromptData ? undefined : videoPrompt,
                        model_version: klingModelVersion,
                        duration: klingMultiPromptEnabled ? undefined : klingDuration, // 使用 multi_prompt 时不传 duration
                        aspect_ratio: klingAspectRatio,
                        // negative_prompt 和 cfg_scale: Pro/Std 和 V2V 支持
                        negative_prompt: (klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std' || isKlingV2V) ? (klingNegativePrompt || undefined) : undefined,
                        cfg_scale: (klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std' || isKlingV2V) ? klingCfgScale : undefined,
                        // shot_type: Pro/Std 支持
                        shot_type: ((klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std') && !multiPromptData) ? klingShotType : undefined,
                        seed: klingSeed ? parseInt(klingSeed) : undefined,
                        start_image: startImageUrl,
                        end_image: endImageUrl,
                        reference_video: isKlingV2V ? uploadedReferenceVideoUrl : undefined,
                        multi_prompt: multiPromptData,
                        generate_audio: klingGenerateAudio,
                        elements: uploadedElements.length > 0 ? uploadedElements : undefined,
                        image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
                    });

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.videoGenerating'), 'success');

                    const taskId = result.task_id!;
                    const taskPrompt = videoPrompt;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'video',
                        url: '',
                        prompt: taskPrompt,
                        timestamp: Date.now(),
                        model: klingModelVersion,
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 任务提交成功后立即恢复 Idle 状态
                    setStatus(GenerationStatus.Idle);
                    setLogs([]);

                    // 订阅 Realtime 获取结果
                    const subscription = subscribeToTask(taskId, (updatedTask) => {
                        if (updatedTask.status === 'completed' && updatedTask.result_url) {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));

                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'video',
                                url: updatedTask.result_url,
                                prompt: taskPrompt,
                                timestamp: Date.now(),
                                model: klingModelVersion,
                                status: 'completed'
                            };
                            setHistory(prev => {
                                if (prev.some(item => item.id === taskId)) return prev;
                                return [completedItem, ...prev];
                            });
                            setResult(completedItem);
                            addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.videoReady'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (updatedTask.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    return;
                }

                // 未实现的视频模型
                throw new Error(i18next.t('common:generation.videoModelNotAvailable', { model: videoModel }));
            }
            // TTS 文字转语音
            else if (activeMode === AppMode.TextToSpeech) {
                addLog(i18next.t('common:generation.callingModel', { model: 'ElevenLabs TTS' }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                const result = await generateTTS({
                    user_id: userId || undefined,
                    text: ttsText,
                    voice_id: ttsVoiceId,
                    stability: ttsStability,
                    similarity_boost: ttsSimilarityBoost,
                    speed: ttsSpeed,
                    use_speaker_boost: ttsSpeakerBoost
                });

                if (!result.success) {
                    throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                }

                if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.ttsGenerating'), 'success');

                const taskId = result.task_id!;
                const pendingItem: GeneratedItem = {
                    id: taskId,
                    type: 'audio',
                    url: '',
                    prompt: ttsText.slice(0, 200),
                    timestamp: Date.now(),
                    model: 'elevenlabs-tts',
                    status: 'processing'
                };
                setPendingTasks(prev => [...prev, pendingItem]);
                setStatus(GenerationStatus.Idle);
                setLogs([]);

                const subscription = subscribeToTask(taskId, (updatedTask) => {
                    if (updatedTask.status === 'completed' && updatedTask.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        const completedItem: GeneratedItem = {
                            id: taskId,
                            type: 'audio',
                            url: updatedTask.result_url,
                            prompt: ttsText.slice(0, 200),
                            timestamp: Date.now(),
                            model: 'elevenlabs-tts',
                            status: 'completed'
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === taskId)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);
                        addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.ttsReady'), 'success');

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    } else if (updatedTask.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                        if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    }
                });
                subscriptionsRef.current.set(taskId, subscription);
                return;
            }
            // 音乐生成
            else if (activeMode === AppMode.MusicGeneration) {
                addLog(i18next.t('common:generation.callingModel', { model: 'Music Generation' }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                const result = await generateMusic({
                    user_id: userId || undefined,
                    prompt: musicPrompt,
                    music_length_seconds: musicLengthSeconds
                });

                if (!result.success) {
                    throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                }

                if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.musicGenerating'), 'success');

                const taskId = result.task_id!;
                const pendingItem: GeneratedItem = {
                    id: taskId,
                    type: 'audio',
                    url: '',
                    prompt: musicPrompt.slice(0, 200),
                    timestamp: Date.now(),
                    model: 'music-generation',
                    status: 'processing'
                };
                setPendingTasks(prev => [...prev, pendingItem]);
                setStatus(GenerationStatus.Idle);
                setLogs([]);

                const subscription = subscribeToTask(taskId, (updatedTask) => {
                    if (updatedTask.status === 'completed' && updatedTask.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        const completedItem: GeneratedItem = {
                            id: taskId,
                            type: 'audio',
                            url: updatedTask.result_url,
                            prompt: musicPrompt.slice(0, 200),
                            timestamp: Date.now(),
                            model: 'music-generation',
                            status: 'completed'
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === taskId)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);
                        addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.musicReady'), 'success');

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    } else if (updatedTask.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                        if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    }
                });
                subscriptionsRef.current.set(taskId, subscription);
                return;
            }
            // 音效生成
            else if (activeMode === AppMode.SoundEffect) {
                addLog(i18next.t('common:generation.callingModel', { model: 'Sound Effect' }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                const result = await generateSoundEffect({
                    user_id: userId || undefined,
                    text: sfxText,
                    duration_seconds: sfxDuration,
                    loop: sfxLoop,
                    prompt_influence: sfxPromptInfluence
                });

                if (!result.success) {
                    throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                }

                if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                if (result.translated_text) setSfxTranslatedText(result.translated_text);
                addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.soundEffectGenerating'), 'success');

                const taskId = result.task_id!;
                const pendingItem: GeneratedItem = {
                    id: taskId,
                    type: 'audio',
                    url: '',
                    prompt: sfxText.slice(0, 200),
                    timestamp: Date.now(),
                    model: 'sound-effect',
                    status: 'processing'
                };
                setPendingTasks(prev => [...prev, pendingItem]);
                setStatus(GenerationStatus.Idle);
                setLogs([]);

                const subscription = subscribeToTask(taskId, (updatedTask) => {
                    if (updatedTask.status === 'completed' && updatedTask.result_url) {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        const completedItem: GeneratedItem = {
                            id: taskId,
                            type: 'audio',
                            url: updatedTask.result_url,
                            prompt: sfxText.slice(0, 200),
                            timestamp: Date.now(),
                            model: 'sound-effect',
                            status: 'completed'
                        };
                        setHistory(prev => {
                            if (prev.some(item => item.id === taskId)) return prev;
                            return [completedItem, ...prev];
                        });
                        setResult(completedItem);
                        addNotification(i18next.t('common:generation.generateSuccess'), i18next.t('common:generation.soundEffectReady'), 'success');

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    } else if (updatedTask.status === 'failed') {
                        setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                        addNotification(i18next.t('common:generation.generateFailed'), updatedTask.error_message || i18next.t('common:generation.pleaseRetry'), 'error');
                        if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                        const sub = subscriptionsRef.current.get(taskId);
                        if (sub) { unsubscribeFromTask(sub); subscriptionsRef.current.delete(taskId); }
                    }
                });
                subscriptionsRef.current.set(taskId, subscription);
                return;
            }
            else if (activeMode === AppMode.Upscale) {
                const modeName = upscaleModel === 'creative' ? i18next.t('common:generation.creativeMagnific') : i18next.t('common:generation.precisionMagnific');
                addLog(i18next.t('common:generation.usingModel', { model: modeName }));
                addNotification(i18next.t('common:generation.submitting'), i18next.t('common:generation.connectingAI'), 'info');

                if (!upscaleImageFile) {
                    throw new Error(i18next.t('common:generation.uploadImage'));
                }

                // 上传图片到 R2
                const imageUrl = await uploadImageToR2(upscaleImageFile);

                if (upscaleModel === 'creative') {
                    // 创意放大
                    const result = await magnificUpscale({
                        user_id: userId || undefined,
                        image: imageUrl,
                        image_width: upscaleImageDimensions?.width || 0,
                        image_height: upscaleImageDimensions?.height || 0,
                        scale_factor: magnificScaleFactor,
                        optimized_for: magnificOptimizedFor,
                        prompt: upscalePrompt || undefined,
                        creativity: magnificCreativity,
                        hdr: magnificHdr,
                        resemblance: magnificResemblance,
                        fractality: magnificFractality,
                        engine: magnificEngine
                    }, 'creative');

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.upscaleProcessing'), 'success');

                    const taskId = result.task_id!;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'image',
                        url: '',
                        prompt: upscalePrompt || i18next.t('common:generation.creativeMagnific'),
                        timestamp: Date.now(),
                        model: 'magnific-creative',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 订阅任务状态
                    const subscription = subscribeToTask(taskId, (payload) => {
                        if (payload.status === 'completed' && payload.result_url) {
                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'image',
                                url: payload.result_url,
                                prompt: upscalePrompt || i18next.t('common:generation.creativeMagnific'),
                                timestamp: Date.now(),
                                model: 'magnific-creative',
                                status: 'completed'
                            };
                            setHistory(prev => [completedItem, ...prev]);
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.upscaleComplete'), i18next.t('common:generation.upscaleCompleteDesc'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (payload.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.upscaleFailed'), payload.error_message || i18next.t('common:generation.upscaleFailedDesc'), 'error');
                            if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    setStatus(GenerationStatus.Idle);
                    return;
                } else {
                    // 精准放大
                    const result = await magnificUpscale({
                        user_id: userId || undefined,
                        image: imageUrl,
                        image_width: upscaleImageDimensions?.width || 0,
                        image_height: upscaleImageDimensions?.height || 0,
                        scale_factor: precisionScaleFactor,
                        flavor: precisionFlavor || undefined,
                        sharpen: precisionSharpen,
                        smart_grain: precisionSmartGrain,
                        ultra_detail: precisionUltraDetail
                    }, 'precision');

                    if (!result.success) {
                        throw new Error(result.error || i18next.t('common:generation.submitFailed'));
                    }

                    if (result.remaining_credits !== undefined) setUserCredits(result.remaining_credits);
                    addLog(i18next.t('common:generation.taskSubmittedId', { id: result.task_id?.slice(0, 8) }));
                    addNotification(i18next.t('common:generation.submitted'), i18next.t('common:generation.upscaleProcessing'), 'success');

                    const taskId = result.task_id!;

                    // 添加到待处理队列
                    const pendingItem: GeneratedItem = {
                        id: taskId,
                        type: 'image',
                        url: '',
                        prompt: i18next.t('common:generation.precisionMagnific'),
                        timestamp: Date.now(),
                        model: 'magnific-precision',
                        status: 'processing'
                    };
                    setPendingTasks(prev => [...prev, pendingItem]);

                    // 订阅任务状态
                    const subscription = subscribeToTask(taskId, (payload) => {
                        if (payload.status === 'completed' && payload.result_url) {
                            const completedItem: GeneratedItem = {
                                id: taskId,
                                type: 'image',
                                url: payload.result_url,
                                prompt: i18next.t('common:generation.precisionMagnific'),
                                timestamp: Date.now(),
                                model: 'magnific-precision',
                                status: 'completed'
                            };
                            setHistory(prev => [completedItem, ...prev]);
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.upscaleComplete'), i18next.t('common:generation.upscaleCompleteDesc'), 'success');

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        } else if (payload.status === 'failed') {
                            setPendingTasks(prev => prev.filter(t => t.id !== taskId));
                            addNotification(i18next.t('common:generation.upscaleFailed'), payload.error_message || i18next.t('common:generation.upscaleFailedDesc'), 'error');
                            if (userId) getUserCredits(userId!).then(c => { if (c >= 0) setUserCredits(c); });

                            const sub = subscriptionsRef.current.get(taskId);
                            if (sub) {
                                unsubscribeFromTask(sub);
                                subscriptionsRef.current.delete(taskId);
                            }
                        }
                    });

                    subscriptionsRef.current.set(taskId, subscription);
                    setStatus(GenerationStatus.Idle);
                    return;
                }
            }

        } catch (error: any) {
            console.error(error);
            setStatus(GenerationStatus.Idle);
            setLogs([]);
            addNotification(i18next.t('common:generation.generateFailed'), error.message || i18next.t('common:generation.unknownError'), 'error');
        }
    }, [isLoggedIn, userId, userCredits, estimatedCost, activeMode, imageModel, imagePrompt, imageReferenceImages, imageSeed, imageAspectRatio, imageSafetyChecker, videoModel, videoPrompt, videoFirstFrame, minimaxModelVersion, minimaxResolution, minimaxDuration, minimaxPromptOptimizer, minimaxLastFrameImage, wanModelVersion, wanResolution, wanDuration, wanSize, wanNegativePrompt, wanEnablePromptExpansion, wanShotType, wanSeed, pixverseMode, pixverseResolution, pixverseDuration, pixverseNegativePrompt, pixverseStyle, pixverseSeed, pixverseLastFrameImage, ltxResolution, ltxDuration, ltxFps, ltxGenerateAudio, ltxSeed, runwayModelVersion, runwayRatio, runwayDuration, runwaySeed, klingModelVersion, klingDuration, klingAspectRatio, klingNegativePrompt, klingCfgScale, klingShotType, klingSeed, klingEndImage, klingReferenceVideo, klingElements, klingImageUrls, klingMultiPromptEnabled, klingMultiPrompts, klingGenerateAudio, upscaleModel, upscaleImageFile, upscaleImageDimensions, upscalePrompt, magnificScaleFactor, magnificOptimizedFor, magnificCreativity, magnificHdr, magnificResemblance, magnificFractality, magnificEngine, precisionScaleFactor, precisionFlavor, precisionSharpen, precisionSmartGrain, precisionUltraDetail, ttsText, ttsVoiceId, ttsStability, ttsSimilarityBoost, ttsSpeed, ttsSpeakerBoost, musicPrompt, musicLengthSeconds, sfxText, sfxDuration, sfxLoop, sfxPromptInfluence, addNotification, addLog]);

    const isAdmin = useMemo(() => {
        const phone = userPhone?.replace(/^\+86/, '') || '';
        if (phone && ADMIN_PHONES.includes(phone)) return true;
        if (userPhone && ADMIN_PHONES.includes(userPhone)) return true;
        // 兼容手机号以 @phone.local 邮箱格式存储的情况
        const phoneFromEmail = userEmail?.match(/^(\d+)@phone\.local$/)?.[1];
        if (phoneFromEmail && ADMIN_PHONES.includes(phoneFromEmail)) return true;
        if (userEmail && ADMIN_EMAILS.includes(userEmail)) return true;
        return false;
    }, [userPhone, userEmail]);

    const goHome = useCallback(() => setShowLanding(true), [setShowLanding]);

    // 使用 useMemo 缓存 context value
    const contextValue = useMemo(() => ({
        activeMode, setActiveMode,
        status, result, logs, history, pendingTasks, notifications,
        isLoggedIn, userPhone, userEmail, userId, isAdmin, isAgent, agentConfig, logout, setLoginState,
        userCredits, estimatedCost,
        userSubscription,
        imageModel, setImageModel,
        videoModel, setVideoModel,
        upscaleModel, setUpscaleModel,
        // 图片创作参数
        imagePrompt, setImagePrompt,
        imageSeed, setImageSeed,
        imageAspectRatio, setImageAspectRatio,
        imageReferenceImages, setImageReferenceImages,
        imageSafetyChecker, setImageSafetyChecker,
        // 视频生成参数
        videoPrompt, setVideoPrompt,
        videoFirstFrame, setVideoFirstFrame,
        minimaxModelVersion, setMinimaxModelVersion,
        minimaxResolution, setMinimaxResolution,
        minimaxDuration, setMinimaxDuration,
        minimaxPromptOptimizer, setMinimaxPromptOptimizer,
        minimaxLastFrameImage, setMinimaxLastFrameImage,
        wanModelVersion, setWanModelVersion,
        wanResolution, setWanResolution,
        wanDuration, setWanDuration,
        wanSize, setWanSize,
        wanNegativePrompt, setWanNegativePrompt,
        wanEnablePromptExpansion, setWanEnablePromptExpansion,
        wanShotType, setWanShotType,
        wanSeed, setWanSeed,
        // PixVerse 参数
        pixverseMode, setPixverseMode,
        pixverseResolution, setPixverseResolution,
        pixverseDuration, setPixverseDuration,
        pixverseNegativePrompt, setPixverseNegativePrompt,
        pixverseStyle, setPixverseStyle,
        pixverseSeed, setPixverseSeed,
        pixverseLastFrameImage, setPixverseLastFrameImage,
        // LTX 参数
        ltxResolution, setLtxResolution,
        ltxDuration, setLtxDuration,
        ltxFps, setLtxFps,
        ltxGenerateAudio, setLtxGenerateAudio,
        ltxSeed, setLtxSeed,
        // RunWay 参数
        runwayModelVersion, setRunwayModelVersion,
        runwayRatio, setRunwayRatio,
        runwayDuration, setRunwayDuration,
        runwaySeed, setRunwaySeed,
        // Kling 参数
        klingModelVersion, setKlingModelVersion,
        klingDuration, setKlingDuration,
        klingAspectRatio, setKlingAspectRatio,
        klingNegativePrompt, setKlingNegativePrompt,
        klingCfgScale, setKlingCfgScale,
        klingShotType, setKlingShotType,
        klingSeed, setKlingSeed,
        klingEndImage, setKlingEndImage,
        klingReferenceVideo, setKlingReferenceVideo,
        klingElements, setKlingElements,
        klingImageUrls, setKlingImageUrls,
        klingMultiPromptEnabled, setKlingMultiPromptEnabled,
        klingMultiPrompts, setKlingMultiPrompts,
        klingGenerateAudio, setKlingGenerateAudio,
        // 放大参数
        upscaleImage: upscaleImageFile, setUpscaleImage,
        upscaleImageDimensions,
        upscalePrompt, setUpscalePrompt,
        // 创意放大参数
        magnificScaleFactor, setMagnificScaleFactor,
        magnificOptimizedFor, setMagnificOptimizedFor,
        magnificCreativity, setMagnificCreativity,
        magnificHdr, setMagnificHdr,
        magnificResemblance, setMagnificResemblance,
        magnificFractality, setMagnificFractality,
        magnificEngine, setMagnificEngine,
        // 精准放大参数
        precisionScaleFactor, setPrecisionScaleFactor,
        precisionFlavor, setPrecisionFlavor,
        precisionSharpen, setPrecisionSharpen,
        precisionSmartGrain, setPrecisionSmartGrain,
        precisionUltraDetail, setPrecisionUltraDetail,
        // TTS 参数
        ttsText, setTtsText,
        ttsVoiceId, setTtsVoiceId,
        ttsStability, setTtsStability,
        ttsSimilarityBoost, setTtsSimilarityBoost,
        ttsSpeed, setTtsSpeed,
        ttsSpeakerBoost, setTtsSpeakerBoost,
        // Music
        musicPrompt, setMusicPrompt,
        musicLengthSeconds, setMusicLengthSeconds,
        sfxText, setSfxText,
        sfxDuration, setSfxDuration,
        sfxLoop, setSfxLoop,
        sfxPromptInfluence, setSfxPromptInfluence,
        sfxTranslatedText, setSfxTranslatedText,
        // Actions
        handleGenerate,
        addNotification, removeNotification,
        setHistory, deleteHistoryItems,
        applyHistoryParams,
        cancelPendingTask, refreshPendingTask,
        goHome,
        showLanding, setShowLanding,
        lightboxItem, setLightboxItem
    }), [
        activeMode, status, result, logs, history, pendingTasks, notifications,
        isLoggedIn, userPhone, userEmail, userId, isAdmin, isAgent, agentConfig, logout, setLoginState,
        userCredits, estimatedCost,
        userSubscription,
        imageModel, videoModel, upscaleModel,
        imagePrompt, imageSeed, imageAspectRatio, imageReferenceImages, imageSafetyChecker,
        videoPrompt, videoFirstFrame,
        minimaxModelVersion, minimaxResolution, minimaxDuration, minimaxPromptOptimizer, minimaxLastFrameImage,
        wanModelVersion, wanResolution, wanDuration, wanSize, wanNegativePrompt, wanEnablePromptExpansion, wanShotType, wanSeed,
        pixverseMode, pixverseResolution, pixverseDuration, pixverseNegativePrompt, pixverseStyle, pixverseSeed, pixverseLastFrameImage,
        ltxResolution, ltxDuration, ltxFps, ltxGenerateAudio, ltxSeed,
        runwayModelVersion, runwayRatio, runwayDuration, runwaySeed,
        klingModelVersion, klingDuration, klingAspectRatio, klingNegativePrompt, klingCfgScale, klingShotType, klingSeed, klingEndImage, klingReferenceVideo, klingElements, klingImageUrls, klingMultiPromptEnabled, klingMultiPrompts, klingGenerateAudio,
        upscaleImageFile, upscaleImageDimensions, upscalePrompt,
        magnificScaleFactor, magnificOptimizedFor, magnificCreativity, magnificHdr, magnificResemblance, magnificFractality, magnificEngine,
        precisionScaleFactor, precisionFlavor, precisionSharpen, precisionSmartGrain, precisionUltraDetail,
        ttsText, ttsVoiceId, ttsStability, ttsSimilarityBoost, ttsSpeed, ttsSpeakerBoost,
        musicPrompt, musicLengthSeconds,
        sfxText, sfxDuration, sfxLoop, sfxPromptInfluence, sfxTranslatedText,
        handleGenerate, addNotification, removeNotification,
        deleteHistoryItems, applyHistoryParams, cancelPendingTask, refreshPendingTask,
        goHome, showLanding, setShowLanding, lightboxItem
    ]);

    return (
        <GenerationContext.Provider value={contextValue}>
            {children}
        </GenerationContext.Provider>
    );
};

export const useGeneration = () => {
    const context = useContext(GenerationContext);
    if (context === undefined) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
};
