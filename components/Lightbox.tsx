import React, { useState } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LightboxProps {
    item: { url: string; type: 'image' | 'video' } | null;
    onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ item, onClose }) => {
    const [downloading, setDownloading] = useState(false);
    const { t } = useTranslation('common');

    if (!item) return null;

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (downloading) return;

        setDownloading(true);
        try {
            // 尝试 fetch 下载
            const response = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `smile-ai-${Date.now()}.${item.type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch {
            // 备选方案：canvas 方式
            if (item.type === 'image') {
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject();
                        img.src = item.url;
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d')?.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const blobUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = `smile-ai-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(blobUrl);
                        }
                    }, 'image/png');
                } catch {
                    window.open(item.url, '_blank');
                }
            } else {
                window.open(item.url, '_blank');
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2.5 rounded-xl bg-surface-overlay border border-surface-border hover:bg-surface-hover text-content transition-colors z-50"
                >
                    <X className="w-5 h-5" />
                </button>

                <div
                    className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    {item.type === 'video' ? (
                        <video
                            src={item.url}
                            controls
                            autoPlay
                            loop
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                        />
                    ) : (
                        <img
                            src={item.url}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                    )}

                    <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 flex items-center space-x-3">
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>{downloading ? t('button.downloading') : t('lightbox.downloadOriginal')}</span>
                        </button>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center space-x-2 px-5 py-2.5 bg-surface-overlay border border-surface-border text-content font-medium rounded-xl hover:bg-surface-hover transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>{t('lightbox.openNewTab')}</span>
                        </a>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default Lightbox;
