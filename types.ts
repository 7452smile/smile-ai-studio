export enum AppMode {
  ImageCreation = 'image-creation',
  VideoGeneration = 'video-generation',
  Upscale = 'upscale',
  RemoveBg = 'remove-bg',
  Pricing = 'pricing',
  Admin = 'admin',
  ModelPricing = 'model-pricing',
  Referral = 'referral',
  ImageToPrompt = 'image-to-prompt',
  CreditsHistory = 'credits-history',
}

export type ImageModelType = 'seedream' | 'banana';
export type VideoModelType = 'kling' | 'minimax' | 'wan' | 'runway' | 'seedance' | 'pixverse' | 'ltx';
export type UpscaleModelType = 'creative' | 'precision';

// Magnific 创意放大参数
export type MagnificScaleFactor = '2x' | '4x' | '8x' | '16x';
export type MagnificOptimizedFor =
  | 'standard'
  | 'soft_portraits'
  | 'hard_portraits'
  | 'art_n_illustration'
  | 'videogame_assets'
  | 'nature_n_landscapes'
  | 'films_n_photography'
  | '3d_renders'
  | 'science_fiction_n_horror';
export type MagnificEngine = 'automatic' | 'magnific_illusio' | 'magnific_sharpy' | 'magnific_sparkle';

// Magnific 精准放大参数
export type PrecisionScaleFactor = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export type PrecisionFlavor = 'sublime' | 'photo' | 'photo_denoiser';

// Minimax（海螺）视频生成参数
export type MinimaxResolution = '768p' | '1080p';
export type MinimaxDuration = 6 | 10;
export type MinimaxModelVersion = 'hailuo-2.3' | 'hailuo-02' | 'minimax-live';

// Wan 视频生成参数
export type WanModelVersion = 'wan-2.6' | 'wan-2.5' | 'wan-2.2';
export type WanResolution = '720p' | '1080p';
export type WanDuration = '5' | '10' | '15';
export type WanSize720p = '1280*720' | '720*1280';
export type WanSize1080p = '1920*1080' | '1080*1920';
export type WanShotType = 'single' | 'multi';

// PixVerse V5 视频生成参数
export type PixVerseMode = 'i2v' | 'transition';
export type PixVerseResolution = '360p' | '540p' | '720p' | '1080p';
export type PixVerseDuration = 5 | 8;
export type PixVerseStyle = 'anime' | '3d_animation' | 'clay' | 'cyberpunk' | 'comic';

// LTX Video 2.0 Pro 视频生成参数
export type LtxResolution = '1080p' | '1440p' | '2160p';
export type LtxDuration = 6 | 8 | 10;
export type LtxFps = 25 | 50;

// RunWay Gen 4.5 视频生成参数
export type RunwayModelVersion = 'runway-4.5' | 'runway-4-turbo';
export type RunwayRatio = '1280:720' | '720:1280' | '1104:832' | '960:960' | '832:1104';
export type RunwayDuration = 5 | 8 | 10;

// Kling 3 视频生成参数
export type KlingModelVersion = 'kling-3-pro' | 'kling-3-std' | 'kling-3-omni-pro' | 'kling-3-omni-std' | 'kling-3-omni-pro-v2v' | 'kling-3-omni-std-v2v';
export type KlingAspectRatio = 'auto' | '16:9' | '9:16' | '1:1';
export type KlingDuration = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type KlingShotType = 'customize' | 'intelligent';

// Kling Multi-Prompt Item (Pro 版本)
export interface KlingMultiPromptItem {
  prompt: string;
  duration: string; // "3" - "15"
}

// Kling Element（角色/物体参考图）
export interface KlingElement {
  frontalImage: File | null;
  referenceImages: File[];
}

// Freepik API 支持的宽高比
export enum AspectRatio {
  Square = 'square_1_1',           // 1:1 (2048x2048)
  Landscape = 'widescreen_16_9',   // 16:9 (2730x1536)
  Portrait = 'social_story_9_16',  // 9:16 (1536x2730)
  Portrait_2_3 = 'portrait_2_3',   // 2:3 (1672x2508)
  Traditional_3_4 = 'traditional_3_4', // 3:4 (1774x2364)
  Standard_3_2 = 'standard_3_2',   // 3:2 (2508x1672)
  Classic_4_3 = 'classic_4_3',     // 4:3 (2364x1774)
  Cinematic = 'cinematic_21_9',    // 21:9 (3062x1312)
}

// 宽高比显示名称
export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  [AspectRatio.Square]: '1:1',
  [AspectRatio.Landscape]: '16:9',
  [AspectRatio.Portrait]: '9:16',
  [AspectRatio.Portrait_2_3]: '2:3',
  [AspectRatio.Traditional_3_4]: '3:4',
  [AspectRatio.Standard_3_2]: '3:2',
  [AspectRatio.Classic_4_3]: '4:3',
  [AspectRatio.Cinematic]: '21:9',
};

export enum GenerationStatus {
  Idle = 'idle',
  Generating = 'generating',
  Success = 'success',
  Error = 'error',
}

export interface GeneratedItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
  model: string;
  status?: 'processing' | 'completed' | 'failed';
  freepik_task_id?: string;
  // 保存生成参数，用于"使用此参数"功能
  params?: {
    aspectRatio?: AspectRatio;
    seed?: string;
    safetyChecker?: boolean;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// ============================================================
// 订阅系统类型
// ============================================================

export type SubscriptionTier = 'free' | 'starter' | 'advanced' | 'flagship' | 'studio';
export type BillingCycle = 'monthly' | 'annual';

export interface UserSubscription {
  tier: SubscriptionTier;
  tierName: string;
  billingCycle?: BillingCycle;
  periodEnd?: string;
  credits: number;
  maxConcurrentImage: number;
  maxConcurrentVideo: number;
  maxConcurrentTotal: number | null;
  historyHours: number;
  persistToR2: boolean;
  features: string[];
}

// ============================================================
// 邀请返利系统类型
// ============================================================

export interface ReferralReward {
  referee_phone: string;
  reward_type: 'signup' | 'commission';
  credits_amount: number;
  purchase_count?: number;
  created_at: string;
}

// ============================================================
// 积分流水类型
// ============================================================

export type CreditTransactionType = 'generation' | 'refund' | 'subscription' | 'referral_signup' | 'referral_commission' | 'redemption' | 'admin_adjust';

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ReferralInfo {
  referralCode: string;
  totalReferrals: number;
  totalSignupBonus: number;
  totalCommission: number;
  rewards: ReferralReward[];
}

// ============================================================
// 兑换码系统类型
// ============================================================

export interface RedemptionCode {
  id: string;
  code: string;
  credits_amount: number;
  max_uses: number;
  current_uses: number;
  description: string | null;
  code_type: 'promo' | 'new_user';
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}