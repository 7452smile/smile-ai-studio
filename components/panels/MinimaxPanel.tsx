import React, { memo, useRef, useCallback, useMemo, useEffect } from 'react';
import { Film, Monitor, Clock, Sparkles, ImageIcon, UploadCloud, X, HelpCircle } from 'lucide-react';
import { useGeneration } from '../../context/GenerationContext';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MinimaxPanel: React.FC = memo(() => {
  const { t } = useTranslation('controlPanel');
  const { t: tc } = useTranslation('common');
  const {
    minimaxModelVersion, setMinimaxModelVersion,
    minimaxResolution, setMinimaxResolution,
    minimaxDuration, setMinimaxDuration,
    minimaxPromptOptimizer, setMinimaxPromptOptimizer,
    minimaxLastFrameImage, setMinimaxLastFrameImage,
    videoFirstFrame, addNotification,
  } = useGeneration();

  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  const lastFramePreviewUrl = useMemo(() => {
    return minimaxLastFrameImage ? URL.createObjectURL(minimaxLastFrameImage) : null;
  }, [minimaxLastFrameImage]);

  useEffect(() => {
    return () => {
      if (lastFramePreviewUrl) URL.revokeObjectURL(lastFramePreviewUrl);
    };
  }, [lastFramePreviewUrl]);

  const handleLastFrameUpload = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 20 }), 'error');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = url;
      });
      const minSide = Math.min(img.width, img.height);
      const ratio = img.width / img.height;
      URL.revokeObjectURL(url);

      if (minSide <= 300) {
        addNotification(tc('file.tooLarge'), 'Minimax: min 300px short side', 'error');
        return;
      }
      if (ratio < 0.4 || ratio > 2.5) {
        addNotification(tc('file.typeError'), 'Minimax: aspect ratio must be 2:5 ~ 5:2', 'error');
        return;
      }
    } catch {
      URL.revokeObjectURL(url);
      addNotification(tc('status.failed'), tc('status.loadFailed'), 'error');
      return;
    }

    setMinimaxLastFrameImage(file);
  }, [addNotification, setMinimaxLastFrameImage, tc]);

  const removeLastFrameImage = useCallback(() => {
    setMinimaxLastFrameImage(null);
  }, [setMinimaxLastFrameImage]);

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('minimax.title')}</div>

      {/* 模型版本选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Film className="w-3 h-3" />
          <span>{t('video.modelVersion')}</span>
        </label>
        <div className="space-y-2">
          <button
            onClick={() => setMinimaxModelVersion('hailuo-2.3')}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
              minimaxModelVersion === 'hailuo-2.3'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            {t('minimax.hailuo23')}
          </button>
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
          >
            {t('minimax.hailuo02')}
          </button>
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
          >
            {t('minimax.live')}
          </button>
        </div>
      </div>

      {/* 分辨率选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Monitor className="w-3 h-3" />
          <span>{t('video.resolution')}</span>
          <Tooltip text={t('minimax.res768Note')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMinimaxResolution('768p')}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              minimaxResolution === '768p'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            768p
          </button>
          <button
            onClick={() => {
              setMinimaxResolution('1080p');
              setMinimaxDuration(6); // 1080p 只支持 6 秒
            }}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              minimaxResolution === '1080p'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            1080p
          </button>
        </div>
      </div>

      {/* 时长选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{t('video.duration')}</span>
          <Tooltip text={t('minimax.durationNote')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMinimaxDuration(6)}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              minimaxDuration === 6
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            6s
          </button>
          <button
            onClick={() => setMinimaxDuration(10)}
            disabled={minimaxResolution === '1080p'}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              minimaxDuration === 10
                ? 'border-accent bg-accent-subtle text-accent'
                : minimaxResolution === '1080p'
                  ? 'border-surface-border text-content-muted cursor-not-allowed opacity-50'
                  : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            10s
          </button>
        </div>
        {minimaxResolution === '1080p' && (
          <p className="text-xs text-content-tertiary">{t('minimax.res1080Note')}</p>
        )}
      </div>

      {/* 提示词优化开关 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>{t('video.promptOptimizer')}</span>
          <Tooltip text={t('video.promptOptimizerDesc')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <button
          onClick={() => setMinimaxPromptOptimizer(!minimaxPromptOptimizer)}
          className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
            minimaxPromptOptimizer
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>{minimaxPromptOptimizer ? t('video.on') : t('video.off')}</span>
          </div>
        </button>
      </div>

      {/* 尾帧图片上传 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <ImageIcon className="w-3 h-3" />
          <span>{t('video.lastFrame')}</span>
          <Tooltip text={t('video.lastFrameDesc')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>

        {minimaxLastFrameImage && lastFramePreviewUrl ? (
          <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
            <img
              src={lastFramePreviewUrl}
              alt="last frame"
              className="w-full h-full object-cover"
            />
            <button
              onClick={removeLastFrameImage}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => lastFrameInputRef.current?.click()}
            className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
          >
            <input
              type="file"
              ref={lastFrameInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files) handleLastFrameUpload(e.target.files);
                e.target.value = ''; // 重置以允许重新选择相同文件
              }}
            />
            <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
            <span className="text-xs text-content-tertiary">{t('video.firstFrameDesc')}</span>
          </div>
        )}
        {!videoFirstFrame && minimaxLastFrameImage && (
          <p className="text-xs text-orange-400">{t('video.lastFrameDesc')}</p>
        )}
      </div>
    </div>
  );
});

MinimaxPanel.displayName = 'MinimaxPanel';

export default MinimaxPanel;
