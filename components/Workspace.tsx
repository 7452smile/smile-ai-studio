import React, { useEffect, useState, memo, useCallback } from 'react';
import { GeneratedItem, AppMode } from '../types';
import { Download, Share2, X, Trash2, Play, Clock, Sparkles, RefreshCw } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';

type HistoryTab = 'all' | 'image' | 'video' | 'upscale';

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
        userSubscription
    } = useGeneration();

    const [historyTab, setHistoryTab] = useState<HistoryTab>('all');
    const [selectedItem, setSelectedItem] = useState<GeneratedItem | null>(null);

    // Auto-switch tab based on active mode
    useEffect(() => {
        if (mode === AppMode.ImageCreation) setHistoryTab('image');
        else if (mode === AppMode.VideoGeneration) setHistoryTab('video');
        else if (mode === AppMode.Upscale) setHistoryTab('upscale');
    }, [mode]);

    // 只显示已完成的历史记录
    const filteredHistory = history.filter(item => {
        // 过滤掉未完成的任务
        if (item.status && item.status !== 'completed') return false;

        if (historyTab === 'all') return true;
        if (historyTab === 'image') return item.type === 'image' && !['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model);
        if (historyTab === 'video') return item.type === 'video';
        if (historyTab === 'upscale') return ['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model);
        return true;
    });

    const handleTabClick = useCallback((tab: HistoryTab) => {
        setHistoryTab(tab);
    }, []);

    const handleDownload = async (url: string, type: 'image' | 'video', id: string) => {
        try {
            addNotification(t('workspace:detail.download'), t('workspace:detail.downloadPreparing'), 'info');

            // 通过 fetch 获取数据
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `smile-ai-${id}.${type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 释放 Blob URL
            URL.revokeObjectURL(blobUrl);
            addNotification(t('workspace:detail.downloadSuccess'), t('workspace:detail.downloadSuccess'), 'success');
        } catch (e) {
            // 视频的备选方案：直接使用链接下载
            if (type === 'video') {
                const link = document.createElement('a');
                link.href = url;
                link.download = `smile-ai-${id}.mp4`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                addNotification(t('workspace:detail.download'), t('workspace:detail.downloadingVideo'), 'info');
                return;
            }

            // 图片的备选方案：使用 img 元素 + canvas 方式
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = url;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `smile-ai-${id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                        addNotification(t('workspace:detail.downloadSuccess'), t('workspace:detail.downloadSuccess'), 'success');
                    }
                }, 'image/png');
            } catch (canvasError) {
                // 最后的备选方案：在新标签页打开
                window.open(url, '_blank');
                addNotification(t('workspace:detail.openInNewTab'), t('workspace:detail.openInNewTab'), 'info');
            }
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

    const getModelLabel = (model: string) => {
        const labels: Record<string, string> = {
            'seedream': t('workspace:modelLabels.seedream'),
            'banana': t('workspace:modelLabels.banana'),
            'remove-bg': t('workspace:modelLabels.remove-bg'),
            'kling': t('workspace:modelLabels.kling'),
            'kling-3-pro': 'Kling 3 Pro',
            'kling-3-std': 'Kling 3 Std',
            'kling-3-omni-pro': 'Kling 3 Omni Pro',
            'kling-3-omni-std': 'Kling 3 Omni Std',
            'kling-3-omni-pro-v2v': 'Kling 3 Omni Pro V2V',
            'kling-3-omni-std-v2v': 'Kling 3 Omni Std V2V',
            'minimax': t('workspace:modelLabels.minimax'),
            'wan': t('workspace:modelLabels.wan'),
            'runway': t('workspace:modelLabels.runway'),
            'creative': t('workspace:modelLabels.creative'),
            'faithful': t('workspace:modelLabels.faithful'),
            'magnific-creative': t('workspace:modelLabels.magnific-creative'),
            'magnific-precision': t('workspace:modelLabels.magnific-precision')
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
                        className="media-card aspect-square cursor-pointer group relative"
                    >
                        <div onClick={() => setSelectedItem(item)} className="w-full h-full">
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
                            ) : (
                                <LazyImage
                                    src={item.url}
                                    alt={item.prompt}
                                    className="w-full h-full object-cover"
                                    isUpscaled={['creative', 'faithful', 'magnific-creative', 'magnific-precision'].includes(item.model)}
                                />
                            )}
                        </div>
                        {/* 快速删除按钮 */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteHistoryItems([item.id]);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-error/80 transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="media-card-overlay" onClick={() => setSelectedItem(item)}>
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

            {/* History Tabs */}
            <div className="px-4 pt-4 pb-2 border-b border-surface-border">
                <div className="flex items-center justify-between">
                    <div className="flex space-x-1 p-1 bg-surface-overlay/50 rounded-xl">
                        <TabButton isActive={historyTab === 'all'} onClick={() => handleTabClick('all')} label={t('workspace:tabs.all')} />
                        <TabButton isActive={historyTab === 'image'} onClick={() => handleTabClick('image')} label={t('workspace:tabs.image')} />
                        <TabButton isActive={historyTab === 'video'} onClick={() => handleTabClick('video')} label={t('workspace:tabs.video')} />
                        <TabButton isActive={historyTab === 'upscale'} onClick={() => handleTabClick('upscale')} label={t('workspace:tabs.upscale')} />
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs text-content-muted">{t('workspace:history.items', { count: filteredHistory.length })}</span>
                        {filteredHistory.length > 0 && (
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
                        {userSubscription && userSubscription.historyHours <= 1 && (
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
