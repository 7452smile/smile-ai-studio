import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Scissors, Check, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { removeBackground } from '../services/api';

interface ImageItem {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
}

const RemoveBgPage: React.FC = () => {
    const { isLoggedIn, userId, addNotification } = useGeneration();
    const { t } = useTranslation('common');
    const rb = (key: string) => t(`removeBg.${key}`);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

    useEffect(() => {
        return () => { images.forEach(img => URL.revokeObjectURL(img.previewUrl)); };
    }, [images]);

    const validateAndAddImages = useCallback((files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const newImages: ImageItem[] = [];

        for (const file of fileArray) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                addNotification(t('file.typeError'), `${file.name}: ${t('file.onlyJpgPng')}`, 'error');
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                addNotification(t('file.tooLarge'), `${file.name}: ${t('file.maxSize', { size: 20 })}`, 'error');
                continue;
            }
            newImages.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'pending'
            });
        }

        if (newImages.length > 0) {
            setImages(prev => [...prev, ...newImages]);
        }
    }, [addNotification, t]);

    const removeImage = useCallback((id: string) => {
        setImages(prev => {
            const img = prev.find(i => i.id === id);
            if (img) URL.revokeObjectURL(img.previewUrl);
            return prev.filter(i => i.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        images.forEach(img => URL.revokeObjectURL(img.previewUrl));
        setImages([]);
    }, [images]);

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files?.length > 0) validateAndAddImages(e.dataTransfer.files);
    };

    const downloadImage = async (url: string, filename: string): Promise<boolean> => {
        try {
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            return true;
        } catch { return false; }
    };

    const handleStartProcessing = async () => {
        if (!isLoggedIn || !userId) {
            addNotification(t('notify.loginRequired'), t('notify.loginRequiredDesc'), 'error');
            return;
        }
        if (images.length === 0) {
            addNotification(rb('pleaseUpload'), rb('pleaseUploadDesc'), 'error');
            return;
        }

        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        for (const img of images) {
            setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'processing' } : i));
            try {
                const result = await removeBackground(userId!, img.file);
                if (result.success && result.url) {
                    const originalName = img.file.name.replace(/\.[^.]+$/, '');
                    const downloaded = await downloadImage(result.url, `${originalName}_nobg.png`);
                    if (downloaded) {
                        setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'completed' } : i));
                        successCount++;
                    } else {
                        throw new Error('Download failed');
                    }
                } else {
                    throw new Error(result.error || 'Failed');
                }
            } catch (err: any) {
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error', error: err.message } : i));
                failCount++;
            }
        }

        setIsProcessing(false);
        if (successCount > 0) addNotification(rb('processComplete'), rb('processCompleteDesc').replace('{{count}}', String(successCount)), 'success');
        if (failCount > 0) addNotification(rb('partialFailed'), rb('partialFailedDesc').replace('{{count}}', String(failCount)), 'error');
    };

    const pendingCount = images.filter(i => i.status === 'pending').length;
    const processingCount = images.filter(i => i.status === 'processing').length;
    const completedCount = images.filter(i => i.status === 'completed').length;

    return (
        <div className="flex-1 h-full bg-surface overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-content mb-2">{rb('title')}</h1>
                    <p className="text-content-secondary">{rb('desc')}</p>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-surface-border rounded-2xl p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all mb-6"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png" multiple
                        onChange={(e) => e.target.files && validateAndAddImages(e.target.files)} />
                    <Upload className="w-12 h-12 text-content-muted mx-auto mb-4" />
                    <p className="text-content font-medium mb-2">{rb('dragOrClick')}</p>
                    <p className="text-sm text-content-tertiary">{rb('supportFormat')}</p>
                </div>

                <div className="flex items-center space-x-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-200">{rb('autoDownloadTip')}</p>
                </div>

                {images.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-content-secondary">
                                {rb('selected').replace('{{count}}', String(images.length))}
                                {completedCount > 0 && ` · ${rb('completedCount').replace('{{count}}', String(completedCount))}`}
                            </span>
                            <button onClick={clearAll} disabled={isProcessing}
                                className="text-sm text-content-muted hover:text-error transition-colors disabled:opacity-50">
                                {t('button.clearAll')}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {images.map((img) => (
                                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-surface-border group">
                                    <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    {img.status === 'processing' && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        </div>
                                    )}
                                    {img.status === 'completed' && (
                                        <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center">
                                            <Check className="w-8 h-8 text-white" />
                                        </div>
                                    )}
                                    {img.status === 'error' && (
                                        <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                                            <AlertCircle className="w-8 h-8 text-white" />
                                        </div>
                                    )}
                                    {img.status === 'pending' && !isProcessing && (
                                        <button onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!isProcessing && (
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-surface-border flex items-center justify-center hover:border-accent hover:bg-accent/5 transition-all">
                                    <Plus className="w-8 h-8 text-content-muted" />
                                </button>
                            )}
                        </div>

                        <button onClick={handleStartProcessing} disabled={isProcessing || pendingCount === 0}
                            className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center space-x-2 transition-all bg-accent hover:bg-accent-hover disabled:bg-surface-border disabled:cursor-not-allowed disabled:text-content-muted">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{rb('processingProgress').replace('{{done}}', String(processingCount + completedCount)).replace('{{total}}', String(images.length))}</span>
                                </>
                            ) : (
                                <>
                                    <Scissors className="w-5 h-5" />
                                    <span>{rb('startProcess').replace('{{count}}', String(pendingCount))}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemoveBgPage;
