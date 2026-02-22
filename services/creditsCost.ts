// 前端积分消耗估算 - 镜像后端定价逻辑
import {
    ImageModelType,
    VideoModelType,
    UpscaleModelType,
    MinimaxResolution,
    MinimaxDuration,
    WanResolution,
    WanDuration,
    PixVerseResolution,
    PixVerseDuration,
    LtxResolution,
    LtxDuration,
    RunwayDuration,
    KlingModelVersion,
    KlingDuration,
    AppMode,
} from '../types';

// ============================================================
// 图片生成
// ============================================================

export const SEEDREAM_CREDITS_COST = 4;

// ============================================================
// 视频生成
// ============================================================

export function getMinimaxCreditsCost(resolution: MinimaxResolution, duration: MinimaxDuration): number {
    if (resolution === '1080p') return 40;
    return duration === 10 ? 47 : 24;
}

export function getWanCreditsCost(resolution: WanResolution, duration: WanDuration): number {
    if (resolution === '1080p') {
        if (duration === '15') return 189;
        if (duration === '10') return 126;
        return 63;
    }
    if (duration === '15') return 126;
    if (duration === '10') return 84;
    return 42;
}


export function getPixVerseCreditsCost(resolution: PixVerseResolution, duration: PixVerseDuration): number {
    let baseCost: number;
    switch (resolution) {
        case '360p':
        case '540p':
            baseCost = 14;
            break;
        case '720p':
            baseCost = 18;
            break;
        case '1080p':
            baseCost = 36;
            break;
        default:
            baseCost = 18;
    }
    return duration === 8 ? baseCost * 2 : baseCost;
}

export function getLtxCreditsCost(resolution: LtxResolution, duration: LtxDuration): number {
    const pricing: Record<string, Record<number, number>> = {
        '1080p': { 6: 30, 8: 40, 10: 50 },
        '1440p': { 6: 50, 8: 80, 10: 100 },
        '2160p': { 6: 68, 8: 108, 10: 135 }
    };
    return pricing[resolution]?.[duration] || 30;
}

export function getRunwayCreditsCost(duration: RunwayDuration): number {
    switch (duration) {
        case 5: return 60;
        case 8: return 96;
        case 10: return 120;
        default: return 60;
    }
}


export function getKlingCreditsCost(modelVersion: KlingModelVersion, duration: KlingDuration, generateAudio = true): number {
    const audioRates: Record<string, number> = {
        'kling-3-pro':          39,
        'kling-3-std':          31,
        'kling-3-omni-pro':     28,
        'kling-3-omni-pro-v2v': 28,
        'kling-3-omni-std':     22,
        'kling-3-omni-std-v2v': 22,
    };
    const noAudioRates: Record<string, number> = {
        'kling-3-pro':          23,
        'kling-3-std':          17,
        'kling-3-omni-pro':     22,
        'kling-3-omni-pro-v2v': 22,
        'kling-3-omni-std':     17,
        'kling-3-omni-std-v2v': 17,
    };
    const rates = generateAudio ? audioRates : noAudioRates;
    return Math.round(duration * (rates[modelVersion] || (generateAudio ? 39 : 23)));
}

// ============================================================
// 高清放大
// ============================================================

export function getUpscaleCreditsCost(imageWidth: number, imageHeight: number, scaleFactor: number): number {
    const finalWidth = imageWidth * scaleFactor;
    const finalHeight = imageHeight * scaleFactor;
    const maxDim = Math.max(finalWidth, finalHeight);
    if (maxDim <= 2048) return 10;
    if (maxDim <= 4096) return 20;
    return 120;
}

// ============================================================
// 一键抠图
// ============================================================

export const REMOVE_BG_CREDITS_COST = 2;

// ============================================================
// 通用估算入口
// ============================================================

export interface CreditsCostParams {
    mode: AppMode;
    // 图片
    imageModel?: ImageModelType;
    // 视频
    videoModel?: VideoModelType;
    minimaxResolution?: MinimaxResolution;
    minimaxDuration?: MinimaxDuration;
    wanResolution?: WanResolution;
    wanDuration?: WanDuration;
    pixverseResolution?: PixVerseResolution;
    pixverseDuration?: PixVerseDuration;
    ltxResolution?: LtxResolution;
    ltxDuration?: LtxDuration;
    runwayDuration?: RunwayDuration;
    klingModelVersion?: KlingModelVersion;
    klingDuration?: KlingDuration;
    klingGenerateAudio?: boolean;
    // 放大
    upscaleModel?: UpscaleModelType;
    imageWidth?: number;
    imageHeight?: number;
    scaleFactor?: number;
}

export function estimateCreditsCost(params: CreditsCostParams): number {
    const { mode } = params;

    if (mode === AppMode.ImageCreation) {
        return SEEDREAM_CREDITS_COST;
    }

    if (mode === AppMode.RemoveBg) {
        return REMOVE_BG_CREDITS_COST;
    }

    if (mode === AppMode.Upscale) {
        return getUpscaleCreditsCost(
            params.imageWidth || 0,
            params.imageHeight || 0,
            params.scaleFactor || 2
        );
    }

    if (mode === AppMode.VideoGeneration) {
        switch (params.videoModel) {
            case 'minimax':
                return getMinimaxCreditsCost(params.minimaxResolution || '768p', params.minimaxDuration || 6);
            case 'wan':
                return getWanCreditsCost(params.wanResolution || '720p', params.wanDuration || '5');
            case 'seedance':
                return 0;
            case 'pixverse':
                return getPixVerseCreditsCost(params.pixverseResolution || '720p', params.pixverseDuration || 5);
            case 'ltx':
                return getLtxCreditsCost(params.ltxResolution || '1080p', params.ltxDuration || 6);
            case 'runway':
                return getRunwayCreditsCost(params.runwayDuration || 5);
            case 'kling':
                return getKlingCreditsCost(params.klingModelVersion || 'kling-3-pro', params.klingDuration || 5, params.klingGenerateAudio ?? true);
            default:
                return 0;
        }
    }

    return 0;
}
