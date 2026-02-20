import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Loader2, Copy, Check, ArrowRight, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { imageToPrompt, uploadImageToR2 } from '../services/api';
import { AppMode } from '../types';

const ImageToPromptPage: React.FC = () => {
    const { isLoggedIn, addNotification, setActiveMode, setImagePrompt } = useGeneration();
    const { t } = useTranslation('common');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [resultText, setResultText] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
    }, []);

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    const handleFile = useCallback(async (file: File) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            addNotification(t('file.typeError'), t('file.onlyJpgPngWebp'), 'error');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            addNotification(t('file.tooLarge'), t('file.maxSize', { size: 20 }), 'error');
            return;
        }
        if (!isLoggedIn) {
            addNotification(t('notify.loginRequired'), t('notify.loginRequiredDesc'), 'error');
            return;
        }

        // 清除上次结果
        setResultText(null);
        setCopied(false);

        // 显示预览
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);

        // 开始分析
        setIsAnalyzing(true);
        try {
            const imageUrl = await uploadImageToR2(file);
            const result = await imageToPrompt(imageUrl);
            if (result.success && result.text) {
                setResultText(result.text);
            } else {
                addNotification(t('imageToPrompt.analyzeFailed'), result.error || t('imageToPrompt.analyzeFailedDesc'), 'error');
            }
        } catch {
            addNotification(t('notify.networkError'), t('notify.pleaseRetry'), 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [isLoggedIn, addNotification, t]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // 重置 input 以便重复选择同一文件
        e.target.value = '';
    };

    const handleCopy = useCallback(async () => {
        if (!resultText) return;
        try {
            await navigator.clipboard.writeText(resultText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addNotification(t('notify.copyFailed'), t('notify.shareFailedDesc'), 'error');
        }
    }, [resultText, addNotification]);

    const handleFillToCreation = useCallback(() => {
        if (!resultText) return;
        setImagePrompt(resultText);
        setActiveMode(AppMode.ImageCreation);
        addNotification(t('imageToPrompt.filledNotify'), t('imageToPrompt.filledNotifyDesc'), 'success');
    }, [resultText, setImagePrompt, setActiveMode, addNotification]);

    const handleReset = useCallback(() => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        setResultText(null);
        setCopied(false);
        setIsAnalyzing(false);
    }, []);

    return (
        <div className="flex-1 h-full bg-surface overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                {/* 标题 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-content mb-2">{t('imageToPrompt.title')}</h1>
                    <p className="text-content-secondary">
                        {t('imageToPrompt.desc')}
                    </p>
                </div>

                {/* 上传区域 / 预览区域 */}
                {!previewUrl ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-surface-border rounded-2xl p-16 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleInputChange}
                        />
                        <Upload className="w-12 h-12 text-content-muted mx-auto mb-4" />
                        <p className="text-content font-medium mb-2">{t('imageToPrompt.dragOrClick')}</p>
                        <p className="text-sm text-content-tertiary">{t('imageToPrompt.supportFormat')}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 图片预览 */}
                        <div className="relative rounded-2xl overflow-hidden border border-surface-border bg-surface-overlay">
                            <img
                                src={previewUrl}
                                alt="Uploaded"
                                className="w-full max-h-[400px] object-contain mx-auto"
                            />
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                                    <span className="text-white font-medium">{t('imageToPrompt.analyzing')}</span>
                                </div>
                            )}
                        </div>

                        {/* 结果区域 */}
                        {resultText && (
                            <div className="card p-6 space-y-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <ImageIcon className="w-5 h-5 text-accent" />
                                    <span className="text-sm font-semibold text-content">{t('imageToPrompt.resultTitle')}</span>
                                </div>
                                <div className="bg-surface-overlay rounded-xl p-4 text-sm text-content leading-relaxed whitespace-pre-wrap select-all">
                                    {resultText}
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={handleCopy}
                                        className="btn-secondary flex items-center space-x-2 px-4 py-2.5 text-sm"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-400" />
                                                <span>{t('button.copied')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                <span>{t('imageToPrompt.copyPrompt')}</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleFillToCreation}
                                        className="btn-primary flex items-center space-x-2 px-4 py-2.5 text-sm"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        <span>{t('imageToPrompt.fillToCreation')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 重新上传 */}
                        {!isAnalyzing && (
                            <button
                                onClick={handleReset}
                                className="text-sm text-content-tertiary hover:text-content transition-colors"
                            >
                                {t('imageToPrompt.uploadAnother')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageToPromptPage;
