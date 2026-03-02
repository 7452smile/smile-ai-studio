import React, { useEffect, useState, memo, useCallback, useMemo, useRef } from 'react';
import { GeneratedItem, AppMode } from '../types';
import { Download, Share2, X, Trash2, Play, Clock, Sparkles, RefreshCw, CheckSquare, Square, Volume2, VolumeX, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getDownloadUrl } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';

type HistoryTab = 'all' | 'image' | 'video' | 'upscale' | 'audio';

// 将 Tab 按钮抽取为独立组件
const TabButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  label: string;
}> = memo(({ isActive, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
      isActive
        ? 'bg-accent-subtle border-accent/30 text-content shadow-sm'
        : 'border-transparent text-content-tertiary hover:text-content-secondary hover:bg-surface-hover'
    }`}
  >
    {label}
  </button>
));

TabButton.displayName = 'TabButton';

// 渐进式加载图片组件 - 对于大图先显示骨架屏
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  isUpscaled?: boolean;
}> = memo(({ src, alt, className, isUpscaled }) => {
  const { t } = useTranslation('common');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* 骨架屏 - 图片加载前显示 */}
      {!loaded && !error && (
        <div className="absolute inset-0 skeleton animate-pulse" />
      )}
      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-overlay text-content-tertiary text-xs">
          {t('common:loadFailed')}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

const Workspace: React.FC = memo(() => {
    const { t } = useTranslation(['workspace', 'common']);
    const {
        activeMode: mode,
        history,
        pendingTasks,
        setLightboxItem,
        deleteHistoryItems,
        addNotification,
        applyHistoryParams,
        cancelPendingTask,
        refreshPendingTask,
        userSubscription,
        ttsVoiceId,
        setTtsVoiceId
    } = useGeneration();

    const [historyTab, setHistoryTab] = useState<HistoryTab>('all');
    const [selectedItem, setSelectedItem] = useState<GeneratedItem | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Voice browser state
    const [voices, setVoices] = useState<any[]>([]);
    const [voiceSearch, setVoiceSearch] = useState('');
    const [voiceFilterLang, setVoiceFilterLang] = useState('');
    const [voiceFilterGender, setVoiceFilterGender] = useState('');
    const [voiceFilterAge, setVoiceFilterAge] = useState('');
    const [voiceFilterUseCase, setVoiceFilterUseCase] = useState('');
    const [voiceDisplayCount, setVoiceDisplayCount] = useState(60);
    const [showVoiceBrowser, setShowVoiceBrowser] = useState(true);
    const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    const LANG_NAMES: Record<string, string> = {
        ar: 'Arabic', bg: 'Bulgarian', cs: 'Czech', da: 'Danish', de: 'German',
        el: 'Greek', en: 'English', es: 'Spanish', fi: 'Finnish', fil: 'Filipino',
        fr: 'French', hi: 'Hindi', hr: 'Croatian', hu: 'Hungarian', id: 'Indonesian',
        it: 'Italian', ja: 'Japanese', ko: 'Korean', ms: 'Malay', nl: 'Dutch',
        no: 'Norwegian', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian',
        sk: 'Slovak', sv: 'Swedish', ta: 'Tamil', tr: 'Turkish', uk: 'Ukrainian',
        vi: 'Vietnamese', zh: 'Chinese'
    };

    // Load voices on TTS mode
    useEffect(() => {
        if (mode !== AppMode.TextToSpeech || voices.length > 0) return;
        fetch('/data/voices.json').then(r => r.json()).then(setVoices).catch(() => {});
    }, [mode]);

    const filteredVoices = useMemo(() => {
        let list = voices;
        if (voiceFilterLang) list = list.filter(v => v.language === voiceFilterLang);
        if (voiceFilterGender) list = list.filter(v => v.gender === voiceFilterGender);
        if (voiceFilterAge) list = list.filter(v => v.age === voiceFilterAge);
        if (voiceFilterUseCase) list = list.filter(v => v.use_case === voiceFilterUseCase);
        if (voiceSearch) {
            const q = voiceSearch.toLowerCase();
            list = list.filter(v => v.name.toLowerCase().includes(q));
        }
        return list;
    }, [voices, voiceFilterLang, voiceFilterGender, voiceFilterAge, voiceFilterUseCase, voiceSearch]);

    const voiceLanguages = useMemo(() => [...new Set(voices.map(v => v.language))].sort(), [voices]);
    const voiceAges = useMemo(() => [...new Set(voices.map(v => v.age).filter(Boolean))], [voices]);
    const voiceUseCases = useMemo(() => [...new Set(voices.map(v => v.use_case).filter(Boolean))], [voices]);

    const handlePreviewVoice = useCallback((url: string) => {
        if (previewAudioRef.current) previewAudioRef.current.pause();
        if (previewAudioUrl === url) { setPreviewAudioUrl(null); return; }
        setPreviewAudioUrl(url);
        const audio = new Audio(url);
        previewAudioRef.current = audio;
        audio.play().catch(() => {});
        audio.onended = () => setPreviewAudioUrl(null);
    }, [previewAudioUrl]);

    // Auto-switch tab based on active mode
    useEffect(() => {
        if (mode === AppMode.ImageCreation) setHistoryTab('image');
        else if (mode === AppMode.VideoGeneration) setHistoryTab('video');
        else if (mode === AppMode.Upscale) setHistoryTab('upscale');
        else if (mode === AppMode.TextToSpeech) setHistoryTab('audio');
    }, [mode]);

    // 只显示已完成的历史记录
    const filteredHistory = history.filter(item => {
        // 过滤掉未完成的任务
        if (item.status && item.status !== 'completed') return false;

        if (historyTab === 'all') return true;
        if (historyTab === 'image') return item.type === 'image' && !['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model);
        if (historyTab === 'video') return item.type === 'video';
        if (historyTab === 'audio') return item.type === 'audio';
        if (historyTab === 'upscale') return ['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model);
        return true;
    });

    const handleTabClick = useCallback((tab: HistoryTab) => {
        setHistoryTab(tab);
    }, []);

    const handleDownload = async (url: string, type: 'image' | 'video' | 'audio', id: string) => {
        try {
            addNotification(t('workspace:detail.download'), t('workspace:detail.downloadPreparing'), 'info');

            const ext = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png';
            const filename = `smile-ai-${id}.${ext}`;

            // 获取带 Content-Disposition: attachment 的 presigned URL
            const downloadUrl = await getDownloadUrl(url, filename);

            // 用 <a> 标签触发下载（presigned URL 自带 attachment 头，浏览器会直接下载）
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addNotification(t('workspace:detail.downloadSuccess'), t('workspace:detail.downloadSuccess'), 'success');
        } catch (e) {
            // 降级：新标签页打开
            window.open(url, '_blank');
            addNotification(t('workspace:detail.openInNewTab'), t('workspace:detail.openInNewTab'), 'info');
        }
    };

    const handleShare = async (url: string) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: t('workspace:detail.shareTitle'),
                    text: t('workspace:detail.shareText'),
                    url: url
                });
            } else {
                await navigator.clipboard.writeText(url);
                addNotification(t('common:notify.copySuccess'), t('common:notify.copySuccessDesc'), 'success');
            }
        } catch (e) {
            addNotification(t('common:notify.shareFailed'), t('common:notify.shareFailedDesc'), 'error');
        }
    };

    const handleUseParams = (item: GeneratedItem) => {
        applyHistoryParams(item);
        setSelectedItem(null);
    };

    const handleDelete = (id: string) => {
        deleteHistoryItems([id]);
        setSelectedItem(null);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBatchDelete = () => {
        if (selectedIds.size === 0) return;
        if (confirm(t('workspace:history.batchDeleteConfirm', { count: selectedIds.size }))) {
            deleteHistoryItems([...selectedIds]);
            setSelectedIds(new Set());
            setSelectMode(false);
        }
    };

    const handleBatchDownload = async () => {
        if (selectedIds.size === 0) return;
        const items = filteredHistory.filter(i => selectedIds.has(i.id));
        addNotification(t('workspace:detail.download'), t('workspace:detail.downloadPreparing'), 'info');
        for (const item of items) {
            try {
                const ext = item.type === 'video' ? 'mp4' : item.type === 'audio' ? 'mp3' : 'png';
                const filename = `smile-ai-${item.id}.${ext}`;
                const downloadUrl = await getDownloadUrl(item.url, filename);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await new Promise(r => setTimeout(r, 300));
            } catch {}
        }
        addNotification(t('workspace:detail.downloadSuccess'), t('workspace:detail.downloadSuccess'), 'success');
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const getModelLabel = (model: string) => {
        const labels: Record<string, string> = {
            'seedream': t('workspace:modelLabels.seedream'),
            'banana': 'Banana Pro',
            'banana-edit': 'Banana Pro',
            'remove-bg': t('workspace:modelLabels.remove-bg'),
            'kling': t('workspace:modelLabels.kling'),
            'kling-3-pro': 'Kling 3 Pro',
            'kling-3-std': 'Kling 3 Std',
            'kling-3-omni-pro': 'Kling 3 Omni Pro',
            'kling-3-omni-std': 'Kling 3 Omni Std',
            'kling-3-omni-pro-v2v': 'Kling 3 Omni Pro V2V',
            'kling-3-omni-std-v2v': 'Kling 3 Omni Std V2V',
            'kling-2.6-pro': 'Kling 2.6 Pro',
            'minimax': t('workspace:modelLabels.minimax'),
            'wan': t('workspace:modelLabels.wan'),
            'runway': t('workspace:modelLabels.runway'),
            'creative': t('workspace:modelLabels.creative'),
            'faithful': t('workspace:modelLabels.faithful'),
            'magnific-creative': t('workspace:modelLabels.magnific-creative'),
            'magnific-precision': t('workspace:modelLabels.magnific-precision'),
            'elevenlabs-tts': 'ElevenLabs TTS',
            'music-generation': t('workspace:modelLabels.music-generation'),
            'sound-effect': t('workspace:modelLabels.sound-effect')
        };
        return labels[model] || model;
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return t('common:time.justNow');
        if (minutes < 60) return t('common:time.minutesAgo', { count: minutes });
        if (hours < 24) return t('common:time.hoursAgo', { count: hours });
        return t('common:time.daysAgo', { count: days });
    };

    function renderHistoryGrid() {
        if (filteredHistory.length === 0) {
            return (
                <div className="empty-state h-full">
                    <div className="empty-state-icon">
                        <Sparkles className="w-8 h-8 text-content-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-content mb-2">{t('workspace:history.empty')}</h3>
                    <p className="text-sm text-content-tertiary">{t('workspace:history.emptyDesc')}</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredHistory.map(item => (
                    <div
                        key={item.id}
                        className={`media-card aspect-square cursor-pointer group relative ${selectMode && selectedIds.has(item.id) ? 'ring-2 ring-accent' : ''}`}
                    >
                        <div onClick={() => selectMode ? toggleSelect(item.id) : setSelectedItem(item)} className="w-full h-full">
                            {item.type === 'video' ? (
                                <div className="w-full h-full bg-surface-overlay relative">
                                    <video
                                        src={item.url}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Play className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                            ) : item.type === 'audio' ? (
                                <div className="w-full h-full bg-surface-overlay relative flex flex-col items-center justify-center">
                                    <Volume2 className="w-10 h-10 text-accent mb-2" />
                                    <p className="text-xs text-content-tertiary px-3 text-center line-clamp-3">{item.prompt}</p>
                                </div>
                            ) : (
                                <LazyImage
                                    src={item.url}
                                    alt={item.prompt}
                                    className="w-full h-full object-cover"
                                    isUpscaled={['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model)}
                                />
                            )}
                        </div>
                        {/* 选择模式复选框 */}
                        {selectMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                                className="absolute top-2 left-2 p-0.5 rounded bg-black/60 text-white z-10"
                            >
                                {selectedIds.has(item.id) ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5" />}
                            </button>
                        )}
                        {/* 快速删除按钮（非选择模式） */}
                        {!selectMode && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteHistoryItems([item.id]);
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-error/80 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <div className="media-card-overlay" onClick={() => selectMode ? toggleSelect(item.id) : setSelectedItem(item)}>
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-xs text-white line-clamp-2 mb-1">{item.prompt}</p>
                                <div className="flex items-center justify-between">
                                    <span className="model-tag">{getModelLabel(item.model)}</span>
                                    <span className="text-[10px] text-content-tertiary">{formatTime(item.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 h-full bg-surface flex flex-col overflow-hidden">
            {/* Pending Tasks Section */}
            {pendingTasks.length > 0 && (
                <div className="p-4 border-b border-surface-border">
                    <div className="flex items-center space-x-2 mb-3">
                        <Clock className="w-4 h-4 text-content-tertiary" />
                        <span className="text-sm font-medium text-content">{t('workspace:pending.title')} ({pendingTasks.length})</span>
                    </div>
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                        {pendingTasks.map(task => {
                            const waitingMinutes = Math.floor((Date.now() - task.timestamp) / 60000);
                            const isStuck = waitingMinutes >= 5; // 超过5分钟可能卡住了

                            return (
                                <div key={task.id} className="card p-4 min-w-[220px] max-w-[300px] flex-shrink-0 relative group">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div className={`status-dot-processing ${isStuck ? 'bg-orange-500' : ''}`}></div>
                                            <span className="text-xs text-content-secondary">
                                                {isStuck ? t('workspace:pending.maybeStuck') : t('workspace:pending.generating')}
                                            </span>
                                        </div>
                                        <span className={`text-xs ${isStuck ? 'text-orange-400' : 'text-content-tertiary'}`}>
                                            {waitingMinutes < 1 ? t('common:time.justNow') : `${waitingMinutes}${t('common:time.minutes')}`}
                                        </span>
                                    </div>
                                    <div className="skeleton h-20 w-full mb-3"></div>
                                    <p className="text-xs text-content-tertiary line-clamp-2 mb-3">{task.prompt}</p>

                                    {/* 操作按钮 - 只在超过5分钟时显示 */}
                                    {isStuck && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => refreshPendingTask(task.id)}
                                                className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs rounded-lg bg-surface-hover hover:bg-accent-subtle text-content-secondary hover:text-accent transition-all"
                                                title={t('workspace:pending.refresh')}
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                <span>{t('workspace:pending.refresh')}</span>
                                            </button>
                                            <button
                                                onClick={() => cancelPendingTask(task.id)}
                                                className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 text-xs rounded-lg bg-surface-hover hover:bg-error/20 text-content-secondary hover:text-error transition-all"
                                                title={t('workspace:pending.cancel')}
                                            >
                                                <X className="w-3 h-3" />
                                                <span>{t('workspace:pending.cancel')}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Voice Browser - TTS mode */}
            {mode === AppMode.TextToSpeech && (
                <div className="flex flex-col border-b border-surface-border">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                        <button onClick={() => setShowVoiceBrowser(!showVoiceBrowser)} className="flex items-center space-x-2 text-sm font-medium text-content group">
                            <Volume2 className="w-4 h-4 text-accent" />
                            <span>{t('workspace:voiceBrowser.title')}</span>
                            <span className="text-xs text-content-muted">({filteredVoices.length})</span>
                            <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${showVoiceBrowser ? 'bg-accent/10 text-accent' : 'bg-surface-hover text-content-muted group-hover:bg-accent/10 group-hover:text-accent'}`}>
                                {showVoiceBrowser ? t('workspace:voiceBrowser.collapse') : t('workspace:voiceBrowser.expand')}
                            </span>
                        </button>
                        {ttsVoiceId && voices.length > 0 && (() => {
                            const v = voices.find((v: any) => v.voice_id === ttsVoiceId);
                            return v ? <span className="text-xs text-accent">{t('workspace:voiceBrowser.selected')}: {v.name}</span> : null;
                        })()}
                    </div>
                    {showVoiceBrowser && (
                        <>
                            <div className="px-4 pb-2 flex flex-wrap gap-2">
                                <div className="relative w-40">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
                                    <input
                                        type="text"
                                        value={voiceSearch}
                                        onChange={e => { setVoiceSearch(e.target.value); setVoiceDisplayCount(60); }}
                                        placeholder={t('workspace:voiceBrowser.search')}
                                        className="input w-full text-xs pl-8"
                                    />
                                </div>
                                <select value={voiceFilterLang} onChange={e => { setVoiceFilterLang(e.target.value); setVoiceDisplayCount(60); }} className="input text-xs flex-1 min-w-[100px]">
                                    <option value="">{t('workspace:voiceBrowser.allLangs')}</option>
                                    {voiceLanguages.map(l => <option key={l} value={l}>{LANG_NAMES[l] || l}</option>)}
                                </select>
                                <select value={voiceFilterGender} onChange={e => { setVoiceFilterGender(e.target.value); setVoiceDisplayCount(60); }} className="input text-xs flex-1 min-w-[100px]">
                                    <option value="">{t('workspace:voiceBrowser.allGenders')}</option>
                                    <option value="male">{t('workspace:voiceBrowser.male')}</option>
                                    <option value="female">{t('workspace:voiceBrowser.female')}</option>
                                </select>
                                <select value={voiceFilterAge} onChange={e => { setVoiceFilterAge(e.target.value); setVoiceDisplayCount(60); }} className="input text-xs flex-1 min-w-[100px]">
                                    <option value="">{t('workspace:voiceBrowser.allAges')}</option>
                                    {voiceAges.map(a => <option key={a} value={a}>{t(`workspace:voiceBrowser.age_${a}`, a)}</option>)}
                                </select>
                                <select value={voiceFilterUseCase} onChange={e => { setVoiceFilterUseCase(e.target.value); setVoiceDisplayCount(60); }} className="input text-xs flex-1 min-w-[100px]">
                                    <option value="">{t('workspace:voiceBrowser.allUseCases')}</option>
                                    {voiceUseCases.map(u => <option key={u} value={u}>{t(`workspace:voiceBrowser.useCase_${u}`, u)}</option>)}
                                </select>
                            </div>
                            <div className="px-4 pb-1">
                                <p className="text-[11px] text-amber-400/80">{t('workspace:voiceBrowser.nonNativeHint')}</p>
                            </div>
                            <div className="flex-1 px-4 pb-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '50vh' }}>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {filteredVoices.slice(0, voiceDisplayCount).map(v => (
                                        <div
                                            key={v.voice_id}
                                            onClick={() => setTtsVoiceId(v.voice_id)}
                                            className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
                                                ttsVoiceId === v.voice_id
                                                    ? 'bg-accent-subtle border-accent/40 shadow-sm shadow-accent/10'
                                                    : 'bg-surface-overlay/50 border-surface-border hover:border-content-muted/30 hover:bg-surface-hover'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className={`font-medium text-sm truncate ${ttsVoiceId === v.voice_id ? 'text-accent' : 'text-content'}`}>{v.name}</span>
                                                        {ttsVoiceId === v.voice_id && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400">{LANG_NAMES[v.language] || v.language}</span>
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${v.gender === 'female' ? 'bg-pink-500/10 text-pink-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                                            {v.gender === 'female' ? t('workspace:voiceBrowser.female') : t('workspace:voiceBrowser.male')}
                                                        </span>
                                                        {v.age && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-hover text-content-muted">{v.age}</span>}
                                                    </div>
                                                </div>
                                                {v.preview_audio && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handlePreviewVoice(v.preview_audio); }}
                                                        className={`ml-1 p-1.5 rounded-lg shrink-0 transition-all ${
                                                            previewAudioUrl === v.preview_audio ? 'bg-accent text-white' : 'bg-surface-hover/80 text-content-muted hover:text-content'
                                                        }`}
                                                    >
                                                        {previewAudioUrl === v.preview_audio ? <VolumeX className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                            {v.description && <p className="text-[10px] text-content-muted mt-1 line-clamp-1">{v.description}</p>}
                                            {v.use_case && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-hover text-content-muted mt-1">{v.use_case}</span>}
                                        </div>
                                    ))}
                                </div>
                                {filteredVoices.length > voiceDisplayCount && (
                                    <button
                                        onClick={() => setVoiceDisplayCount(prev => prev + 60)}
                                        className="w-full mt-2 py-2 text-xs text-accent hover:text-accent/80 transition-colors rounded-lg border border-dashed border-accent/20 hover:border-accent/40"
                                    >
                                        {t('workspace:voiceBrowser.loadMore')} ({filteredVoices.length - voiceDisplayCount})
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* History Tabs */}
            <div className="px-4 pt-4 pb-2 border-b border-surface-border">
                <div className="flex items-center justify-between">
                    <div className="flex space-x-1 p-1 bg-surface-overlay/50 rounded-xl">
                        <TabButton isActive={historyTab === 'all'} onClick={() => handleTabClick('all')} label={t('workspace:tabs.all')} />
                        <TabButton isActive={historyTab === 'image'} onClick={() => handleTabClick('image')} label={t('workspace:tabs.image')} />
                        <TabButton isActive={historyTab === 'video'} onClick={() => handleTabClick('video')} label={t('workspace:tabs.video')} />
                        <TabButton isActive={historyTab === 'audio'} onClick={() => handleTabClick('audio')} label={t('workspace:tabs.audio')} />
                        <TabButton isActive={historyTab === 'upscale'} onClick={() => handleTabClick('upscale')} label={t('workspace:tabs.upscale')} />
                    </div>
                    <div className="flex items-center space-x-3">
                        {selectMode ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (selectedIds.size === filteredHistory.length) setSelectedIds(new Set());
                                        else setSelectedIds(new Set(filteredHistory.map(i => i.id)));
                                    }}
                                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                                >
                                    {t('workspace:history.selectAll')}
                                </button>
                                <button onClick={handleBatchDownload} disabled={selectedIds.size === 0}
                                    className="text-xs text-content-secondary hover:text-accent transition-colors disabled:opacity-40">
                                    {t('workspace:history.batchDownload', { count: selectedIds.size })}
                                </button>
                                <button onClick={handleBatchDelete} disabled={selectedIds.size === 0}
                                    className="text-xs text-content-secondary hover:text-error transition-colors disabled:opacity-40">
                                    {t('workspace:history.batchDelete', { count: selectedIds.size })}
                                </button>
                                <button onClick={exitSelectMode} className="text-xs text-content-muted hover:text-content transition-colors">
                                    {t('workspace:history.cancelSelect')}
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-xs text-content-muted">{t('workspace:history.items', { count: filteredHistory.length })}</span>
                                {filteredHistory.length > 0 && (
                                    <>
                                        <button onClick={() => setSelectMode(true)} className="text-xs text-content-muted hover:text-accent transition-colors">
                                            {t('workspace:history.select')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(t('workspace:history.clearConfirm'))) {
                                                    deleteHistoryItems(filteredHistory.map(item => item.id));
                                                }
                                            }}
                                            className="text-xs text-content-muted hover:text-error transition-colors"
                                        >
                                            {t('workspace:history.clear')}
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {/* History retention info */}
                <div className="mt-2 flex items-center space-x-1.5 text-xs text-content-muted">
                    <Clock className="w-3 h-3" />
                    <span>
                        {t('workspace:history.retention')}
                        <span className={`font-medium ${
                            userSubscription && userSubscription.historyHours >= 168
                                ? 'text-accent-violet'
                                : 'text-content-tertiary'
                        }`}>
                            {!userSubscription || userSubscription.historyHours <= 1
                                ? t('common:timeUnits.hours', { count: 1 })
                                : userSubscription.historyHours < 24
                                    ? t('common:timeUnits.hours', { count: userSubscription.historyHours })
                                    : userSubscription.historyHours < 720
                                        ? t('common:timeUnits.days', { count: Math.round(userSubscription.historyHours / 24) })
                                        : userSubscription.historyHours < 8760
                                            ? t('common:timeUnits.months', { count: Math.round(userSubscription.historyHours / 720) })
                                            : t('common:timeUnits.years', { count: 1 })}
                        </span>
                        {userSubscription && userSubscription.historyHours <= 24 && (
                            <span className="text-amber-500 ml-1">· {t('workspace:history.retentionUpgrade')}</span>
                        )}
                    </span>
                </div>
            </div>

            {/* History Grid */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {renderHistoryGrid()}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedItem(null)}
                    />
                    <div className="relative bg-surface-overlay rounded-2xl border border-surface-border max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
                        {/* Preview */}
                        <div className="aspect-video bg-surface relative">
                            {selectedItem.type === 'video' ? (
                                <video
                                    src={selectedItem.url}
                                    controls
                                    autoPlay
                                    className="w-full h-full object-contain"
                                />
                            ) : selectedItem.type === 'audio' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <Volume2 className="w-16 h-16 text-accent mb-4" />
                                    <audio src={selectedItem.url} controls autoPlay className="w-4/5" />
                                </div>
                            ) : (
                                <img
                                    src={selectedItem.url}
                                    alt={selectedItem.prompt}
                                    className="w-full h-full object-contain cursor-zoom-in"
                                    onClick={() => {
                                        setLightboxItem({ url: selectedItem.url, type: selectedItem.type });
                                        setSelectedItem(null);
                                    }}
                                />
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 pr-4">
                                    <p className="text-sm text-content leading-relaxed">{selectedItem.prompt}</p>
                                </div>
                                <span className="badge">{getModelLabel(selectedItem.model)}</span>
                            </div>

                            <div className="flex items-center text-xs text-content-tertiary mb-5">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                <span>{formatTime(selectedItem.timestamp)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleDownload(selectedItem.url, selectedItem.type, selectedItem.id)}
                                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>{t('workspace:detail.download')}</span>
                                </button>
                                <button
                                    onClick={() => handleUseParams(selectedItem)}
                                    className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>{t('workspace:detail.useParams')}</span>
                                </button>
                                <button
                                    onClick={() => handleShare(selectedItem.url)}
                                    className="btn-ghost p-2.5"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedItem.id)}
                                    className="btn-ghost p-2.5 text-error hover:bg-error/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

Workspace.displayName = 'Workspace';

export default Workspace;
