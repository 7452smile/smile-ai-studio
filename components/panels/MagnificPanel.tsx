import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Sparkles, Layers, Focus, Palette } from 'lucide-react';
import { useGeneration } from '@/context/GenerationContext';
import { Tooltip } from '@/components/panels/Tooltip';
import type { MagnificScaleFactor, MagnificOptimizedFor, MagnificEngine, PrecisionScaleFactor, PrecisionFlavor } from '@/types';

const MagnificPanel = memo(() => {
  const { t } = useTranslation('controlPanel');
  const {
    upscaleModel,
    magnificScaleFactor, setMagnificScaleFactor,
    magnificOptimizedFor, setMagnificOptimizedFor,
    magnificCreativity, setMagnificCreativity,
    magnificHdr, setMagnificHdr,
    magnificResemblance, setMagnificResemblance,
    magnificFractality, setMagnificFractality,
    magnificEngine, setMagnificEngine,
    precisionScaleFactor, setPrecisionScaleFactor,
    precisionFlavor, setPrecisionFlavor,
    precisionSharpen, setPrecisionSharpen,
    precisionSmartGrain, setPrecisionSmartGrain,
    precisionUltraDetail, setPrecisionUltraDetail,
  } = useGeneration();

  const scaleFactorOptions: { value: MagnificScaleFactor; label: string }[] = [
    { value: '2x', label: '2x' },
    { value: '4x', label: '4x' },
    { value: '8x', label: '8x' },
    { value: '16x', label: '16x' },
  ];

  const optimizedForOptions: { value: MagnificOptimizedFor; label: string }[] = [
    { value: 'standard', label: t('upscale.optimizedForOptions.standard') },
    { value: 'soft_portraits', label: t('upscale.optimizedForOptions.soft_portraits') },
    { value: 'hard_portraits', label: t('upscale.optimizedForOptions.hard_portraits') },
    { value: 'art_n_illustration', label: t('upscale.optimizedForOptions.art_n_illustration') },
    { value: 'videogame_assets', label: t('upscale.optimizedForOptions.videogame_assets') },
    { value: 'nature_n_landscapes', label: t('upscale.optimizedForOptions.nature_n_landscapes') },
    { value: 'films_n_photography', label: t('upscale.optimizedForOptions.films_n_photography') },
    { value: '3d_renders', label: t('upscale.optimizedForOptions.3d_renders') },
    { value: 'science_fiction_n_horror', label: t('upscale.optimizedForOptions.science_fiction_n_horror') },
  ];

  const engineOptions: { value: MagnificEngine; label: string; desc: string }[] = [
    { value: 'automatic', label: t('upscale.engineOptions.automatic'), desc: t('upscale.engineOptions.automaticDesc') },
    { value: 'magnific_illusio', label: t('upscale.engineOptions.illusio'), desc: t('upscale.engineOptions.illusioDesc') },
    { value: 'magnific_sharpy', label: t('upscale.engineOptions.sharpy'), desc: t('upscale.engineOptions.sharpyDesc') },
    { value: 'magnific_sparkle', label: t('upscale.engineOptions.sparkle'), desc: t('upscale.engineOptions.sparkleDesc') },
  ];

  const flavorOptions: { value: PrecisionFlavor; label: string; desc: string }[] = [
    { value: 'sublime', label: t('upscale.flavorOptions.sublime'), desc: t('upscale.flavorOptions.sublimeDesc') },
    { value: 'photo', label: t('upscale.flavorOptions.photo'), desc: t('upscale.flavorOptions.photoDesc') },
    { value: 'photo_denoiser', label: t('upscale.flavorOptions.photo_denoiser'), desc: t('upscale.flavorOptions.photo_denoiserDesc') },
  ];

  if (upscaleModel === 'creative') {
    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('upscale.creativeSettings')}</div>

        {/* 放大倍数 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Layers className="w-3 h-3" />
            <span>{t('upscale.scaleFactor')}</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {scaleFactorOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setMagnificScaleFactor(option.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  magnificScaleFactor === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 优化类型 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Focus className="w-3 h-3" />
            <span>{t('upscale.optimizedFor')}</span>
          </label>
          <select
            value={magnificOptimizedFor}
            onChange={(e) => setMagnificOptimizedFor(e.target.value as MagnificOptimizedFor)}
            className="input w-full text-sm"
          >
            {optimizedForOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* 引擎选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>{t('upscale.engine')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {engineOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setMagnificEngine(option.value)}
                className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                  magnificEngine === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-content-tertiary text-[10px]">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 创意度 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>{t('upscale.creativity')}</span>
            <Tooltip text={t('upscale.creativityDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="-10"
              max="10"
              value={magnificCreativity}
              onChange={(e) => setMagnificCreativity(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-8 text-center">{magnificCreativity}</span>
          </div>
        </div>

        {/* HDR */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.hdr')}</span>
            <Tooltip text={t('upscale.hdrDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="-10"
              max="10"
              value={magnificHdr}
              onChange={(e) => setMagnificHdr(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-8 text-center">{magnificHdr}</span>
          </div>
        </div>

        {/* 相似度 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.resemblance')}</span>
            <Tooltip text={t('upscale.resemblanceDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="-10"
              max="10"
              value={magnificResemblance}
              onChange={(e) => setMagnificResemblance(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-8 text-center">{magnificResemblance}</span>
          </div>
        </div>

        {/* 分形度 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.fractality')}</span>
            <Tooltip text={t('upscale.fractalityDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="-10"
              max="10"
              value={magnificFractality}
              onChange={(e) => setMagnificFractality(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-8 text-center">{magnificFractality}</span>
          </div>
        </div>
      </div>
    );
  } else {
    // 精准放大设置
    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('upscale.precisionSettings')}</div>

        {/* 放大倍数 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Layers className="w-3 h-3" />
            <span>{t('upscale.scaleFactor')}</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="2"
              max="16"
              value={precisionScaleFactor}
              onChange={(e) => setPrecisionScaleFactor(parseInt(e.target.value) as PrecisionScaleFactor)}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-10 text-center">{precisionScaleFactor}x</span>
          </div>
        </div>

        {/* 处理风格 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Palette className="w-3 h-3" />
            <span>{t('upscale.flavor')}</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setPrecisionFlavor('')}
              className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                precisionFlavor === ''
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <div className="font-medium">{t('upscale.flavorAuto')}</div>
              <div className="text-content-tertiary text-[10px]">{t('upscale.flavorAutoDesc')}</div>
            </button>
            {flavorOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setPrecisionFlavor(option.value)}
                className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                  precisionFlavor === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-content-tertiary text-[10px]">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 锐化 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.sharpen')}</span>
            <Tooltip text={t('upscale.sharpenDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={precisionSharpen}
              onChange={(e) => setPrecisionSharpen(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-10 text-center">{precisionSharpen}</span>
          </div>
        </div>

        {/* {t('video.shotIntelligent')}纹理 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.smartGrain')}</span>
            <Tooltip text={t('upscale.smartGrainDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={precisionSmartGrain}
              onChange={(e) => setPrecisionSmartGrain(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-10 text-center">{precisionSmartGrain}</span>
          </div>
        </div>

        {/* 超级细节 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('upscale.ultraDetail')}</span>
            <Tooltip text={t('upscale.ultraDetailDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={precisionUltraDetail}
              onChange={(e) => setPrecisionUltraDetail(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <span className="text-sm text-content w-10 text-center">{precisionUltraDetail}</span>
          </div>
        </div>
      </div>
    );
  }
});

MagnificPanel.displayName = 'MagnificPanel';

export default MagnificPanel;
