import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Gift, Users, Coins, TrendingUp, Loader2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { getReferralInfo } from '../services/api';
import { ReferralInfo } from '../types';

const ReferralPage: React.FC = () => {
    const { isLoggedIn, userId, agentConfig } = useGeneration();
    const { t, i18n } = useTranslation('common');
    const r = (key: string) => t(`referral.${key}`);
    const [info, setInfo] = useState<ReferralInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);

    const fetchInfo = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await getReferralInfo(userId);
            setInfo(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isLoggedIn && userId) fetchInfo();
        else setLoading(false);
    }, [isLoggedIn, userId, fetchInfo]);

    const handleCopy = async (type: 'code' | 'link') => {
        if (!info?.referralCode) return;
        const domain = agentConfig?.domain || window.location.hostname || 'www.smile-ai-studio.com';
        const text = type === 'code'
            ? info.referralCode
            : `https://${domain}/?ref=${info.referralCode}`;
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!isLoggedIn) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-content-tertiary">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{r('loginRequired')}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    const dateFmt = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <Gift className="w-6 h-6 text-accent" />
                    <h1 className="text-2xl font-bold text-content">{r('title')}</h1>
                </div>

                <div className="card p-6">
                    <h2 className="text-sm font-medium text-content-tertiary mb-4">{r('myCode')}</h2>
                    <div className="flex items-center space-x-4 mb-4">
                        <span className="text-3xl font-bold font-mono tracking-widest text-content">
                            {info?.referralCode || '------'}
                        </span>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={() => handleCopy('code')} className="btn-secondary text-xs px-4 py-2 flex items-center space-x-2">
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copied === 'code' ? r('copied') : r('copyCode')}</span>
                        </button>
                        <button onClick={() => handleCopy('link')} className="btn-primary text-xs px-4 py-2 flex items-center space-x-2">
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copied === 'link' ? r('copied') : r('copyLink')}</span>
                        </button>
                    </div>
                    <p className="text-xs text-content-tertiary mt-3">{r('shareDesc')}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="card p-5 text-center">
                        <Users className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-content">{info?.totalReferrals ?? 0}</div>
                        <div className="text-xs text-content-tertiary mt-1">{r('inviteCount')}</div>
                    </div>
                    <div className="card p-5 text-center">
                        <Coins className="w-5 h-5 text-green-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-content">{info?.totalSignupBonus ?? 0}</div>
                        <div className="text-xs text-content-tertiary mt-1">{r('signupBonus')}</div>
                    </div>
                    <div className="card p-5 text-center">
                        <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-content">{info?.totalCommission ?? 0}</div>
                        <div className="text-xs text-content-tertiary mt-1">{r('totalCommission')}</div>
                    </div>
                </div>

                <div className="card p-6">
                    <h2 className="text-sm font-medium text-content-tertiary mb-3">{r('rules')}</h2>
                    <div className="space-y-2 text-sm text-content-secondary">
                        <div className="flex items-start space-x-2">
                            <span className="text-green-400 mt-0.5">1.</span>
                            <span><strong className="text-content">{r('rule1Title')}</strong>: <Trans i18nKey="referral.rule1Desc" ns="common" components={{ strong: <strong className="text-content" /> }} /></span>
                        </div>
                        <div className="flex items-start space-x-2">
                            <span className="text-blue-400 mt-0.5">2.</span>
                            <span><strong className="text-content">{r('rule2Title')}</strong>: <Trans i18nKey="referral.rule2Desc" ns="common" components={{ strong: <strong className="text-content" /> }} /></span>
                        </div>
                        <div className="flex items-start space-x-2">
                            <span className="text-amber-400 mt-0.5">3.</span>
                            <span><strong className="text-content">{r('rule3Title')}</strong>: <Trans i18nKey="referral.rule3Desc" ns="common" components={{ strong: <strong className="text-content" /> }} /></span>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <h2 className="text-sm font-medium text-content-tertiary mb-4">{r('rewardDetail')}</h2>
                    {(!info?.rewards || info.rewards.length === 0) ? (
                        <div className="text-center py-8 text-content-tertiary text-sm">{r('noRecords')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-content-tertiary text-xs border-b border-surface-border">
                                        <th className="text-left py-2 pr-4">{r('referee')}</th>
                                        <th className="text-left py-2 pr-4">{r('type')}</th>
                                        <th className="text-right py-2 pr-4">{r('credits')}</th>
                                        <th className="text-right py-2">{r('time')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {info.rewards.map((rw, i) => (
                                        <tr key={i} className="border-b border-surface-border/50">
                                            <td className="py-3 pr-4 text-content font-mono text-xs">{rw.referee_phone}</td>
                                            <td className="py-3 pr-4">
                                                {rw.reward_type === 'signup' ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{r('signupReward')}</span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        {r('commission')}{rw.purchase_count ? ` #${rw.purchase_count}` : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-right text-accent font-semibold">+{rw.credits_amount}</td>
                                            <td className="py-3 text-right text-content-tertiary text-xs">
                                                {new Date(rw.created_at).toLocaleDateString(dateFmt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
