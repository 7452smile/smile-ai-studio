import React, { useState, useCallback } from 'react';
import { Check, Zap, Rocket, Crown, Star, Building, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { createPayment } from '../services/api';
import { SubscriptionTier, BillingCycle } from '../types';

// 人民币价格（支付宝实际扣款用）
const CNY_PRICES: Record<string, Record<string, number>> = {
    starter:   { monthly: 19.9,  annual: 199 },
    advanced:  { monthly: 49,    annual: 490 },
    flagship:  { monthly: 99,    annual: 990 },
    studio:    { monthly: 299,   annual: 2990 },
};

// 美元价格（PayPal 实际扣款 + 统一展示用）
const USD_PRICES: Record<string, Record<string, number>> = {
    starter:   { monthly: 2.99,  annual: 29.9 },
    advanced:  { monthly: 6.99,  annual: 69.9 },
    flagship:  { monthly: 13.99, annual: 139.9 },
    studio:    { monthly: 42.99, annual: 429.9 },
};

interface TierConfig {
    id: SubscriptionTier;
    icon: React.ReactNode;
    monthlyCredits: string;
    annualCredits: string;
    highlight?: boolean;
}

const TIERS: TierConfig[] = [
    {
        id: 'free',
        icon: <Zap className="w-5 h-5 text-content-muted" />,
        monthlyCredits: '188 + 10/day', annualCredits: '-',
    },
    {
        id: 'starter',
        icon: <Rocket className="w-5 h-5 text-blue-400" />,
        monthlyCredits: '2,000', annualCredits: '24,000',
    },
    {
        id: 'advanced',
        icon: <Crown className="w-5 h-5 text-purple-400" />,
        monthlyCredits: '6,000', annualCredits: '72,000',
    },
    {
        id: 'flagship',
        icon: <Star className="w-5 h-5 text-amber-400" />,
        monthlyCredits: '15,000', annualCredits: '180,000',
        highlight: true,
    },
    {
        id: 'studio',
        icon: <Building className="w-5 h-5 text-emerald-400" />,
        monthlyCredits: '50,000', annualCredits: '600,000',
    },
];

const TIER_ORDER: SubscriptionTier[] = ['free', 'starter', 'advanced', 'flagship', 'studio'];

const PricingPage: React.FC = () => {
    const { t, i18n } = useTranslation(['pricing', 'common']);
    const { isLoggedIn, userId, userSubscription, addNotification } = useGeneration();
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly'); // 暂时隐藏年付，默认月付，恢复时改回 'annual'
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [payMethodModal, setPayMethodModal] = useState<SubscriptionTier | null>(null);

    const currentTier = userSubscription?.tier || 'free';
    const currentTierIndex = TIER_ORDER.indexOf(currentTier);

    const handleSubscribe = useCallback((tierId: SubscriptionTier) => {
        if (!isLoggedIn || !userId) {
            addNotification(t('pricing:loginRequired'), t('pricing:loginRequiredDesc'), 'error');
            return;
        }
        if (tierId === 'free') return;
        if (TIER_ORDER.indexOf(tierId) <= currentTierIndex) return;
        setPayMethodModal(tierId);
    }, [isLoggedIn, userId, currentTierIndex, addNotification]);

    const handlePayWithMethod = useCallback(async (payType: 'alipay' | 'paypal') => {
        const tierId = payMethodModal;
        if (!tierId || !userId) return;
        setPayMethodModal(null);
        setLoadingTier(tierId);
        try {
            const result = await createPayment(userId, tierId, billingCycle, payType);
            if (!result.success) {
                addNotification(t('pricing:createOrderFailed'), result.error || t('common:notify.pleaseRetry'), 'error');
                return;
            }
            if (result.paymentUrl) {
                window.open(result.paymentUrl, '_blank');
                addNotification(t('pricing:paymentOpened'), t('pricing:paymentOpenedDesc'), 'info');
            }
        } catch {
            addNotification(t('common:notify.networkError'), t('common:notify.pleaseRetry'), 'error');
        } finally {
            setLoadingTier(null);
        }
    }, [payMethodModal, userId, billingCycle, addNotification]);

    const getButtonText = (tierId: SubscriptionTier) => {
        if (loadingTier === tierId) return t('pricing:processing');
        if (tierId === currentTier) return t('pricing:currentButton');
        if (tierId === 'free') return t('pricing:freeButton');
        if (TIER_ORDER.indexOf(tierId) < currentTierIndex) return t('pricing:included');
        return t('pricing:subscribe');
    };

    const isDisabled = (tierId: SubscriptionTier) => {
        return tierId === 'free' || tierId === currentTier || TIER_ORDER.indexOf(tierId) <= currentTierIndex || loadingTier === tierId;
    };

    const isCurrentTier = (tierId: SubscriptionTier) => tierId === currentTier;

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-8 bg-surface">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold font-display text-content mb-3">{t('pricing:title')}</h1>
                <p className="text-content-tertiary max-w-xl mx-auto mb-6">{t('pricing:desc')}</p>

                {/* Billing Toggle - 暂时隐藏年付选项，恢复时去掉 hidden 即可 */}
                <div className="hidden inline-flex items-center bg-surface-raised rounded-xl p-1 border border-surface-border">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                            billingCycle === 'monthly'
                                ? 'bg-accent text-white shadow-sm'
                                : 'text-content-tertiary hover:text-content'
                        }`}
                    >{t('pricing:monthly')}</button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                            billingCycle === 'annual'
                                ? 'bg-accent text-white shadow-sm'
                                : 'text-content-tertiary hover:text-content'
                        }`}
                    >
                        {t('pricing:annual')}
                        <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{t('pricing:annualSave')}</span>
                    </button>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                {TIERS.map((tier) => {
                    const usdPrice = USD_PRICES[tier.id]?.[billingCycle] ?? 0;
                    const credits = billingCycle === 'annual' ? tier.annualCredits : tier.monthlyCredits;
                    const isCurrent = isCurrentTier(tier.id);
                    const isHighlight = tier.highlight;

                    return (
                        <div
                            key={tier.id}
                            className={`card p-6 flex flex-col relative ${
                                isHighlight ? 'border-accent bg-accent-subtle' : ''
                            } ${isCurrent ? 'ring-2 ring-accent/50' : ''}`}
                        >
                            {isHighlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white text-[10px] font-semibold px-4 py-1.5 rounded-full tracking-wider">
                                    {t(`pricing:tiers.${tier.id}.name`)}
                                </div>
                            )}

                            <div className="flex items-center space-x-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isHighlight ? 'bg-accent/20' : 'bg-surface-hover'
                                }`}>
                                    {tier.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-content">{t(`pricing:tiers.${tier.id}.name`)}</h3>
                                    {isCurrent && (
                                        <span className="text-[10px] text-accent font-medium">{t('pricing:currentPlan')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Price */}
                            {tier.id === 'free' ? (
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-content">{t('pricing:free')}</div>
                                    <p className="text-xs text-content-muted mt-1">{t('pricing:freeForever')}</p>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-content">
                                        ${billingCycle === 'annual' ? (usdPrice / 12).toFixed(2) : usdPrice}
                                        <span className="text-sm font-normal text-content-muted ml-1">
                                            {t('pricing:perMonth')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Credits & Limits */}
                            <div className="text-xs text-content-tertiary mb-3 space-y-1">
                                <div>{t('pricing:credits')}: <span className="text-content-secondary font-medium">{credits}</span></div>
                                <div>{t('pricing:concurrency')}: <span className="text-content-secondary font-medium">{t(`pricing:tierConcurrency.${tier.id}`)}</span></div>
                                <div>{t('pricing:historyRetention')}: <span className="text-content-secondary font-medium">{t(`pricing:tierHistory.${tier.id}`)}</span></div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2 mb-6 flex-1">
                                {(t(`pricing:tierFeatures.${tier.id}`, { returnObjects: true }) as string[]).map((f, i) => (
                                    <li key={i} className="flex items-start text-sm text-content-secondary">
                                        <Check className={`w-4 h-4 mr-2 mt-0.5 shrink-0 ${
                                            isHighlight ? 'text-accent' : 'text-success'
                                        }`} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* Subscription info */}
                            {isCurrent && userSubscription?.periodEnd && (
                                <p className="text-xs text-content-tertiary mb-3 text-center">
                                    {t('pricing:expires', { date: new Date(userSubscription.periodEnd).toLocaleDateString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US') })}
                                </p>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={() => handleSubscribe(tier.id)}
                                disabled={isDisabled(tier.id)}
                                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                                    isDisabled(tier.id)
                                        ? 'border border-surface-border text-content-muted cursor-not-allowed'
                                        : isHighlight
                                            ? 'btn-primary'
                                            : 'btn-secondary'
                                }`}
                            >
                                {getButtonText(tier.id)}
                            </button>
                        </div>
                    );
                })}

                {/* 第6张卡片：联系销售 */}
                <div className="card p-6 flex flex-col relative bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border-indigo-500/20">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10">
                            <MessageCircle className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-content">{t('pricing:contact.title')}</h3>
                    </div>
                    <p className="text-sm text-content-tertiary mb-6 flex-1">{t('pricing:contact.desc')}</p>
                    <div className="space-y-2 text-center text-sm">
                        <div><span className="text-content-tertiary">{t('pricing:contact.wechat')}:</span> <span className="text-content font-medium font-mono">18124598709</span></div>
                        <div><span className="text-content-tertiary">Telegram:</span> <a href="https://t.me/smile745231" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@smile745231</a></div>
                        <div><span className="text-content-tertiary">{t('pricing:contact.email')}:</span> <a href="mailto:a1205061933@gmail.com" className="text-accent hover:underline">a1205061933@gmail.com</a></div>
                    </div>
                </div>
            </div>

            {/* 支付方式选择弹窗 */}
            {payMethodModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPayMethodModal(null)}>
                    <div className="card p-6 w-[360px] relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPayMethodModal(null)} className="absolute top-4 right-4 text-content-muted hover:text-content">
                            <X className="w-4 h-4" />
                        </button>
                        <h3 className="text-lg font-semibold text-content mb-1">{t('pricing:payMethod.title')}</h3>
                        <p className="text-xs text-content-tertiary mb-5">
                            {t('pricing:payMethod.desc', { tier: t(`pricing:tiers.${payMethodModal}.name`), cycle: billingCycle === 'annual' ? t('pricing:annual') : t('pricing:monthly') })}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => handlePayWithMethod('alipay')}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-accent hover:bg-accent/5 transition-all"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm">支</div>
                                    <span className="text-content font-medium">{t('pricing:payMethod.alipay')}</span>
                                </div>
                                <span className="text-content-secondary font-semibold">
                                    ¥{CNY_PRICES[payMethodModal]?.[billingCycle]}
                                </span>
                            </button>
                            <button
                                onClick={() => handlePayWithMethod('paypal')}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-accent hover:bg-accent/5 transition-all"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#0070ba]/10 flex items-center justify-center text-[#0070ba] font-bold text-xs">PP</div>
                                    <span className="text-content font-medium">{t('pricing:payMethod.paypal')}</span>
                                </div>
                                <span className="text-content-secondary font-semibold">
                                    ${USD_PRICES[payMethodModal]?.[billingCycle]?.toFixed(2)}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ Section */}
            <div className="mt-16 max-w-3xl mx-auto text-center">
                <h2 className="text-xl font-semibold text-content mb-6">{t('pricing:faq.title')}</h2>
                <div className="space-y-3 text-left">
                    <div className="card p-5">
                        <h4 className="font-medium text-content mb-1">{t('pricing:faq.q1')}</h4>
                        <p className="text-sm text-content-tertiary">{t('pricing:faq.a1')}</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-medium text-content mb-1">{t('pricing:faq.q2')}</h4>
                        <p className="text-sm text-content-tertiary">{t('pricing:faq.a2')}</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-medium text-content mb-1">{t('pricing:faq.q3')}</h4>
                        <p className="text-sm text-content-tertiary">{t('pricing:faq.a3')}</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-medium text-content mb-1">{t('pricing:faq.q4')}</h4>
                        <p className="text-sm text-content-tertiary">{t('pricing:faq.a4')}</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-medium text-content mb-1">{t('pricing:faq.q5')}</h4>
                        <p className="text-sm text-content-tertiary">{t('pricing:faq.a5')}</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PricingPage;
