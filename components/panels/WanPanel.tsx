import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Monitor, ImageIcon, Clock, Sparkles, Hash, HelpCircle } from 'lucide-react';
import { useGeneration } from '../../context/GenerationContext';
import { Tooltip } from './Tooltip';
import type { WanResolution, WanDuration, WanSize720p, WanSize1080p } from '../../types';

const WanPanel = memo(() => {
  const { t } = useTranslation('controlPanel');
  const {
    wanModelVersion, setWanModelVersion,
    wanResolution, setWanResolution,
    wanDuration, setWanDuration,
    wanSize, setWanSize,
    wanNegativePrompt, setWanNegativePrompt,
    wanEnablePromptExpansion, setWanEnablePromptExpansion,
    wanShotType, setWanShotType,
    wanSeed, setWanSeed,
  } = useGeneration();

  // 根据分辨率获取可用的尺寸选项
  const sizeOptions = wanResolution === '720p'
    ? [
        { value: '1280*720' as WanSize720p, label: `1280×720 (${t('runway.ratioNames.landscape')})` },
        { value: '720*1280' as WanSize720p, label: `720×1280 (${t('runway.ratioNames.portrait')})` }
      ]
    : [
        { value: '1920*1080' as WanSize1080p, label: `1920×1080 (${t('runway.ratioNames.landscape')})` },
        { value: '1080*1920' as WanSize1080p, label: `1080×1920 (${t('runway.ratioNames.portrait')})` }
      ];

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('wan.title')}</div>

      {/* 模型版本选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Film className="w-3 h-3" />
          <span>{t('video.modelVersion')}</span>
        </label>
        <div className="space-y-2">
          <button
            onClick={() => setWanModelVersion('wan-2.6')}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
              wanModelVersion === 'wan-2.6'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            Wan 2.6
          </button>
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
          >
            Wan 2.5 ({t('wan.deprecated')})
          </button>
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
          >
            Wan 2.2 ({t('wan.deprecated')})
          </button>
        </div>
      </div>

      {/* 分辨率选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Monitor className="w-3 h-3" />
          <span>{t('video.resolution')}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setWanResolution('720p');
              setWanSize('1280*720');
            }}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              wanResolution === '720p'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            720p
          </button>
          <button
            onClick={() => {
              setWanResolution('1080p');
              setWanSize('1920*1080');
            }}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              wanResolution === '1080p'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            1080p
          </button>
        </div>
      </div>

      {/* 尺寸方向选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <ImageIcon className="w-3 h-3" />
          <span>{t('video.size')}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {sizeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setWanSize(option.value)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanSize === option.value
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {option.value.startsWith('1280') || option.value.startsWith('1920') ? t('runway.ratioNames.landscape') : t('runway.ratioNames.portrait')}
            </button>
          ))}
        </div>
      </div>

      {/* 时长选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{t('video.duration')}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['5', '10', '15'] as WanDuration[]).map(d => (
            <button
              key={d}
              onClick={() => setWanDuration(d)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanDuration === d
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* 负面提示词 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <span>{t('prompt.negative')}</span>
          <Tooltip text={t('prompt.negativePlaceholder')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <textarea
          defaultValue={wanNegativePrompt}
          onBlur={(e) => setWanNegativePrompt(e.target.value)}
          placeholder="blurry, low quality, watermark..."
          className="input w-full h-16 resize-none text-sm"
        />
      </div>

      {/* 提示词扩展开关 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>{t('wan.promptExpansion')}</span>
          <Tooltip text={t('wan.promptExpansionDesc')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <button
          onClick={() => setWanEnablePromptExpansion(!wanEnablePromptExpansion)}
          className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
            wanEnablePromptExpansion
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>{wanEnablePromptExpansion ? t('video.on') : t('video.off')}</span>
          </div>
        </button>
      </div>

      {/* 镜头类型 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <span>{t('video.shotType')}</span>
          <Tooltip text={t('wan.shotTypeTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setWanShotType('single')}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              wanShotType === 'single'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            {t('wan.singleShot')}
          </button>
          <button
            onClick={() => {
              setWanShotType('multi');
              if (!wanEnablePromptExpansion) setWanEnablePromptExpansion(true);
            }}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              wanShotType === 'multi'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            {t('wan.multiShot')}
          </button>
        </div>
        {wanShotType === 'multi' && !wanEnablePromptExpansion && (
          <p className="text-xs text-orange-400">{t('wan.multiShotRequiresExpansion')}</p>
        )}
      </div>

      {/* 随机种子 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Hash className="w-3 h-3" />
          <span>{t('image.seed')}</span>
          <Tooltip text={t('wan.seedTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <input
          type="number"
          defaultValue={wanSeed}
          onBlur={(e) => setWanSeed(e.target.value)}
          placeholder={t('image.seedPlaceholder')}
          min="-1"
          max="2147483647"
          className="input w-full text-xs"
        />
      </div>
    </div>
  );
});

WanPanel.displayName = 'WanPanel';

export default WanPanel;
