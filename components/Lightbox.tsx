import React, { useState } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getDownloadUrl } from '../services/api';

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
            const ext = item.type === 'video' ? 'mp4' : 'png';
            const filename = `smile-ai-${Date.now()}.${ext}`;
            const downloadUrl = await getDownloadUrl(item.url, filename);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            window.open(item.url, '_blank');
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
