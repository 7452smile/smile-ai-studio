import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { getCreditTransactions } from '../services/api';
import { CreditTransaction, CreditTransactionType } from '../types';

const TX_TYPES: (CreditTransactionType | 'all')[] = [
    'all', 'generation', 'refund', 'subscription', 'referral_signup', 'referral_commission', 'redemption'
];

const PAGE_SIZE = 20;

const CreditsHistoryPage: React.FC = () => {
    const { isLoggedIn, userId } = useGeneration();
    const { t, i18n } = useTranslation('common');
    const h = (key: string) => t(`creditsHistory.${key}`);

    const [items, setItems] = useState<CreditTransaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<CreditTransactionType | 'all'>('all');
    const [loading, setLoading] = useState(true);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const dateFmt = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        const typeParam = filter === 'all' ? undefined : filter;
        const res = await getCreditTransactions(userId, PAGE_SIZE, (page - 1) * PAGE_SIZE, typeParam);
        setItems(res.items);
        setTotal(res.total);
        setLoading(false);
    }, [userId, page, filter]);

    useEffect(() => {
        if (isLoggedIn && userId) fetchData();
        else setLoading(false);
    }, [isLoggedIn, userId, fetchData]);

    const handleFilterChange = (f: CreditTransactionType | 'all') => {
        setFilter(f);
        setPage(1);
    };

    const typeBadge = (type: CreditTransactionType) => {
        const colors: Record<string, string> = {
            generation: 'bg-red-500/10 text-red-400 border-red-500/20',
            refund: 'bg-green-500/10 text-green-400 border-green-500/20',
            subscription: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            referral_signup: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            referral_commission: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            redemption: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            admin_adjust: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        };
        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${colors[type] || colors.admin_adjust}`}>
                {h(type)}
            </span>
        );
    };

    if (!isLoggedIn) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-content-tertiary">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{h('loginRequired')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <Receipt className="w-6 h-6 text-accent" />
                    <h1 className="text-2xl font-bold text-content">{h('title')}</h1>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                    {TX_TYPES.map(tp => (
                        <button
                            key={tp}
                            onClick={() => handleFilterChange(tp)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                filter === tp
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-surface-overlay text-content-secondary border-surface-border hover:border-accent/50'
                            }`}
                        >
                            {h(tp)}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="card p-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-content-tertiary text-sm">{h('noRecords')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-content-tertiary text-xs border-b border-surface-border">
                                        <th className="text-left py-2 pr-4">{h('time')}</th>
                                        <th className="text-left py-2 pr-4">{h('type')}</th>
                                        <th className="text-right py-2 pr-4">{h('amount')}</th>
                                        <th className="text-right py-2 pr-4">{h('balance')}</th>
                                        <th className="text-left py-2">{h('description')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(tx => (
                                        <tr key={tx.id} className="border-b border-surface-border/50">
                                            <td className="py-3 pr-4 text-content-tertiary text-xs whitespace-nowrap">
                                                {new Date(tx.created_at).toLocaleString(dateFmt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 pr-4">{typeBadge(tx.transaction_type)}</td>
                                            <td className={`py-3 pr-4 text-right font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                                            </td>
                                            <td className="py-3 pr-4 text-right text-content-secondary">{tx.balance_after}</td>
                                            <td className="py-3 text-content-tertiary text-xs truncate max-w-[200px]">{tx.description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {total > PAGE_SIZE && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-border">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="flex items-center space-x-1 text-xs text-content-secondary hover:text-content disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{h('prevPage')}</span>
                            </button>
                            <span className="text-xs text-content-tertiary">
                                {h('pageInfo').replace('{{page}}', String(page)).replace('{{total}}', String(totalPages))}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="flex items-center space-x-1 text-xs text-content-secondary hover:text-content disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <span>{h('nextPage')}</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditsHistoryPage;
