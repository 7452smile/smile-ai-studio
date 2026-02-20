import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Monitor, Clock, Hash, HelpCircle } from 'lucide-react';
import { useGeneration } from '../../context/GenerationContext';
import { Tooltip } from './Tooltip';
import type { RunwayRatio, RunwayDuration } from '../../types';

const ratioKeys: { value: RunwayRatio; label: string; descKey: string }[] = [
  { value: '1280:720', label: '16:9', descKey: 'landscape' },
  { value: '720:1280', label: '9:16', descKey: 'portrait' },
  { value: '960:960', label: '1:1', descKey: 'square' },
  { value: '1104:832', label: '4:3', descKey: 'classicL' },
  { value: '832:1104', label: '3:4', descKey: 'classicP' },
];

const RunwayPanel = memo(() => {
  const { t } = useTranslation('controlPanel');
  const {
    runwayModelVersion, setRunwayModelVersion,
    runwayRatio, setRunwayRatio,
    runwayDuration, setRunwayDuration,
    runwaySeed, setRunwaySeed,
    videoFirstFrame,
  } = useGeneration();

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('runway.title')}</div>

      {/* 模型版本选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Film className="w-3 h-3" />
          <span>{t('video.modelVersion')}</span>
        </label>
        <div className="space-y-2">
          <button
            onClick={() => setRunwayModelVersion('runway-4.5')}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
              runwayModelVersion === 'runway-4.5'
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>RunWay Gen 4.5</span>
              <span className="text-xs text-content-tertiary">T2V + I2V</span>
            </div>
            <p className="text-xs text-content-tertiary mt-1">{t('runway.latestDesc')}</p>
          </button>
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
          >
            <div className="flex justify-between items-center">
              <span>RunWay 4 Turbo</span>
              <span className="text-xs text-content-tertiary">{t('runway.deprecated')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 模式提示 */}
      <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
        <p className="text-xs text-accent">
          {videoFirstFrame ? t('runway.i2vMode') : t('runway.t2vMode')}
        </p>
      </div>

      {/* 宽高比选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Monitor className="w-3 h-3" />
          <span>{t('video.aspectRatio')}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ratioKeys.slice(0, 3).map(option => (
            <button
              key={option.value}
              onClick={() => setRunwayRatio(option.value)}
              className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                runwayRatio === option.value
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <div className="text-xs">{option.label}</div>
              <div className="text-xs text-content-tertiary">{t(`runway.ratioNames.${option.descKey}`)}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ratioKeys.slice(3).map(option => (
            <button
              key={option.value}
              onClick={() => setRunwayRatio(option.value)}
              className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                runwayRatio === option.value
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <div className="text-xs">{option.label}</div>
              <div className="text-xs text-content-tertiary">{t(`runway.ratioNames.${option.descKey}`)}</div>
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
          {([5, 8, 10] as RunwayDuration[]).map(d => (
            <button
              key={d}
              onClick={() => setRunwayDuration(d)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                runwayDuration === d
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* 随机种子 - 仅 I2V 模式 */}
      {videoFirstFrame && (
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>{t('image.seed')}</span>
            <Tooltip text={t('runway.seedTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <input
            type="number"
            defaultValue={runwaySeed}
            onBlur={(e) => setRunwaySeed(e.target.value)}
            placeholder={t('image.seedPlaceholder')}
            min="0"
            max="4294967295"
            className="input w-full text-xs"
          />
        </div>
      )}
    </div>
  );
});

RunwayPanel.displayName = 'RunwayPanel';

export default RunwayPanel;
