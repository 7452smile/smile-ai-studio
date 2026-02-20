import React, { memo, useRef, useCallback, useMemo, useEffect } from 'react';
import { Film, Monitor, Clock, Palette, ImageIcon, ArrowRightLeft, UploadCloud, X, Hash, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../../context/GenerationContext';
import { PixVerseStyle, PixVerseResolution } from '../../types';
import Tooltip from './Tooltip';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const PixVersePanel: React.FC = memo(() => {
  const { t } = useTranslation('controlPanel');
  const { t: tc } = useTranslation('common');
  const {
    pixverseMode, setPixverseMode,
    pixverseResolution, setPixverseResolution,
    pixverseDuration, setPixverseDuration,
    pixverseNegativePrompt, setPixverseNegativePrompt,
    pixverseStyle, setPixverseStyle,
    pixverseSeed, setPixverseSeed,
    pixverseLastFrameImage, setPixverseLastFrameImage,
    videoFirstFrame,
    addNotification,
  } = useGeneration();

  const pixverseLastFrameInputRef = useRef<HTMLInputElement>(null);

  const pixverseLastFramePreviewUrl = useMemo(() => {
    return pixverseLastFrameImage ? URL.createObjectURL(pixverseLastFrameImage) : null;
  }, [pixverseLastFrameImage]);

  useEffect(() => {
    return () => {
      if (pixverseLastFramePreviewUrl) URL.revokeObjectURL(pixverseLastFramePreviewUrl);
    };
  }, [pixverseLastFramePreviewUrl]);

  const handlePixverseLastFrameUpload = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 10 }), 'error');
      return;
    }
    setPixverseLastFrameImage(file);
  }, [addNotification, setPixverseLastFrameImage, tc]);

  const removePixverseLastFrameImage = useCallback(() => {
    setPixverseLastFrameImage(null);
  }, [setPixverseLastFrameImage]);

  // 风格选项（仅 i2v 模式）
  const styleOptions: { value: PixVerseStyle | ''; label: string }[] = [
    { value: '', label: t('video.styleNone') },
    { value: 'anime', label: t('video.styleAnime') },
    { value: '3d_animation', label: t('video.style3d') },
    { value: 'clay', label: t('video.styleClay') },
    { value: 'cyberpunk', label: t('video.styleCyberpunk') },
    { value: 'comic', label: t('video.styleComic') },
  ];

  // 分辨率选项
  const resolutionOptions: { value: PixVerseResolution; label: string }[] = [
    { value: '360p', label: '360p' },
    { value: '540p', label: '540p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p' },
  ];

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('pixverse.title')}</div>

      {/* 模式选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Film className="w-3 h-3" />
          <span>{t('video.mode')}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPixverseMode('i2v')}
            className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center space-x-1 ${
              pixverseMode === 'i2v'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>{t('video.modeI2v')}</span>
          </button>
          <button
            onClick={() => setPixverseMode('transition')}
            className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center space-x-1 ${
              pixverseMode === 'transition'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>{t('video.modeTransition')}</span>
          </button>
        </div>
        <p className="text-xs text-content-tertiary">
          {pixverseMode === 'i2v' ? t('pixverse.i2vDesc') : t('pixverse.transitionDesc')}
        </p>
      </div>

      {/* 分辨率选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Monitor className="w-3 h-3" />
          <span>{t('video.resolution')}</span>
          <Tooltip text={t('pixverse.resolutionTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {resolutionOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                setPixverseResolution(option.value);
                // 1080p 只支持 5s
                if (option.value === '1080p') {
                  setPixverseDuration(5);
                }
              }}
              className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                pixverseResolution === option.value
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 时长选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{t('video.duration')}</span>
          <Tooltip text={t('pixverse.durationTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPixverseDuration(5)}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              pixverseDuration === 5
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            5s
          </button>
          <button
            onClick={() => setPixverseDuration(8)}
            disabled={pixverseResolution === '1080p'}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              pixverseDuration === 8
                ? 'border-accent bg-accent-subtle text-accent'
                : pixverseResolution === '1080p'
                  ? 'border-surface-border text-content-muted cursor-not-allowed opacity-50'
                  : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            8s (2x)
          </button>
        </div>
      </div>

      {/* 风格选择 - 仅 i2v 模式 */}
      {pixverseMode === 'i2v' && (
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Palette className="w-3 h-3" />
            <span>{t('video.style')}</span>
            <Tooltip text={t('pixverse.styleTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {styleOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setPixverseStyle(option.value)}
                className={`px-2 py-2 rounded-lg border text-xs transition-all ${
                  pixverseStyle === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 尾帧图片上传 - 仅 transition 模式 */}
      {pixverseMode === 'transition' && (
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <ImageIcon className="w-3 h-3" />
            <span>{t('video.endImage')}</span>
            <Tooltip text={t('pixverse.lastFrameTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>

          {pixverseLastFrameImage && pixverseLastFramePreviewUrl ? (
            <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
              <img
                src={pixverseLastFramePreviewUrl}
                alt="last frame"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removePixverseLastFrameImage}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => pixverseLastFrameInputRef.current?.click()}
              className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
            >
              <input
                type="file"
                ref={pixverseLastFrameInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) handlePixverseLastFrameUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
              <span className="text-xs text-content-tertiary">{t('video.firstFrameDesc')}</span>
            </div>
          )}
        </div>
      )}

      {/* 负面提示词 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <span>{t('prompt.negative')}</span>
          <Tooltip text={t('pixverse.negativeTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <textarea
          defaultValue={pixverseNegativePrompt}
          onBlur={(e) => setPixverseNegativePrompt(e.target.value)}
          placeholder="blurry, low quality, watermark..."
          className="input w-full h-16 resize-none text-sm"
        />
      </div>

      {/* 随机种子 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Hash className="w-3 h-3" />
          <span>{t('image.seed')}</span>
          <Tooltip text={t('kling.seedTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <input
          type="number"
          defaultValue={pixverseSeed}
          onBlur={(e) => setPixverseSeed(e.target.value)}
          placeholder={t('image.seedPlaceholder')}
          min="-1"
          className="input w-full text-xs"
        />
      </div>

      {/* 首帧图片提示 */}
      {!videoFirstFrame && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-xs text-orange-400">
            Please upload first frame above
          </p>
        </div>
      )}

      {/* 首尾帧模式尾帧提示 */}
      {pixverseMode === 'transition' && !pixverseLastFrameImage && videoFirstFrame && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-xs text-orange-400">
            Please upload last frame
          </p>
        </div>
      )}
    </div>
  );
});

export default PixVersePanel;
