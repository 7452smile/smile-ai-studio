import React, { memo } from 'react';
import { Monitor, Clock, Film, Volume2, VolumeX, Hash, HelpCircle } from 'lucide-react';
import { useGeneration } from '../../context/GenerationContext';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';
import type { LtxResolution, LtxDuration, LtxFps } from '../../types';

const resolutionOptions: { value: LtxResolution; label: string }[] = [
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '2160p', label: '2160p (4K)' },
];

const LtxPanel: React.FC = memo(() => {
  const { t } = useTranslation('controlPanel');
  const {
    ltxResolution, setLtxResolution,
    ltxDuration, setLtxDuration,
    ltxFps, setLtxFps,
    ltxGenerateAudio, setLtxGenerateAudio,
    ltxSeed, setLtxSeed,
    videoFirstFrame,
  } = useGeneration();

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('ltx.title')}</div>

      {/* 模式提示 */}
      <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
        <p className="text-xs text-accent">
          {videoFirstFrame ? t('runway.i2vMode') : t('runway.t2vMode')}
        </p>
      </div>

      {/* 分辨率选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Monitor className="w-3 h-3" />
          <span>{t('video.resolution')}</span>
          <Tooltip text={t('ltx.resolutionTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {resolutionOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setLtxResolution(option.value)}
              className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                ltxResolution === option.value
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
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([6, 8, 10] as LtxDuration[]).map(d => (
            <button
              key={d}
              onClick={() => setLtxDuration(d)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                ltxDuration === d
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* 帧率选择 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Film className="w-3 h-3" />
          <span>{t('video.fps')}</span>
          <Tooltip text={t('ltx.fpsTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLtxFps(25)}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              ltxFps === 25
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            25 FPS
          </button>
          <button
            onClick={() => setLtxFps(50)}
            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
              ltxFps === 50
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content hover:bg-surface-hover'
            }`}
          >
            50 FPS
          </button>
        </div>
      </div>

      {/* 音频生成开关 */}
      <div className="space-y-2">
        <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
          <Volume2 className="w-3 h-3" />
          <span>{t('video.generateAudio')}</span>
          <Tooltip text={t('ltx.audioTooltip')}>
            <HelpCircle className="w-3 h-3 cursor-help" />
          </Tooltip>
        </label>
        <button
          onClick={() => setLtxGenerateAudio(!ltxGenerateAudio)}
          className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
            ltxGenerateAudio
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            {ltxGenerateAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{ltxGenerateAudio ? t('video.on') : t('video.off')}</span>
          </div>
        </button>
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
          defaultValue={ltxSeed}
          onBlur={(e) => setLtxSeed(e.target.value)}
          placeholder={t('image.seedPlaceholder')}
          min="0"
          max="4294967295"
          className="input w-full text-xs"
        />
      </div>
    </div>
  );
});

LtxPanel.displayName = 'LtxPanel';

export default LtxPanel;
