import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoadingScreen: React.FC = () => {
    const { t } = useTranslation('common');
    return (
        <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center z-[9999]">
            <div className="absolute inset-0 landing-gradient-bg opacity-50"></div>
            <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl border border-accent/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                </div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-muted flex items-center justify-center shadow-glow">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
            </div>
            <div className="mt-8 text-center">
                <h1 className="text-xl font-semibold font-display text-content">Smile AI Studio</h1>
                <p className="mt-2 text-sm text-content-tertiary">{t('loading.text')}</p>
            </div>
            <div className="mt-8 w-48">
                <div className="progress-bar">
                    <div className="progress-bar-indeterminate"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
