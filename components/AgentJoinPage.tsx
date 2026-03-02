import React from 'react';
import { Store, Zap, Users, CheckCircle, ArrowRight, Sparkles, TrendingUp, Shield, Copy, Check } from 'lucide-react';
import { useGeneration } from '../context/GenerationContext';

const AgentJoinPage: React.FC = () => {
    const { agentConfig, addNotification } = useGeneration();
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    // 联系方式配置 - 与 PricingPage 保持一致
    const contactInfo = agentConfig ? {
        wechat: agentConfig.contact_wechat || '未设置',
        telegram: agentConfig.contact_telegram,
        email: agentConfig.contact_email,
        enableTelegram: agentConfig.enable_telegram,
        enableEmail: agentConfig.enable_email
    } : {
        // 主站默认联系方式
        wechat: '18124598709',
        telegram: '@smile745231',
        email: 'a1205061933@gmail.com',
        enableTelegram: true,
        enableEmail: true
    };

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            addNotification('已复制', `${field}已复制到剪贴板`, 'success');
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    return (
        <div className="flex-1 overflow-y-auto bg-surface">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-accent/20 via-purple-500/10 to-surface border-b border-surface-border">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(74,222,128,0.1),transparent_50%)]"></div>

                <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
                    <div className="text-center">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 text-accent text-sm font-medium mb-6 animate-pulse">
                            <Sparkles className="w-4 h-4" />
                            <span>代理加盟计划</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold text-content mb-6 leading-tight">
                            打造您的
                            <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent"> AI 创作品牌</span>
                        </h1>
                        <p className="text-xl text-content-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
                            独立域名 · 自定义品牌 · 成本价拿货 · 自由定价
                        </p>
                        <button
                            onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-primary px-10 py-4 text-lg shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all"
                        >
                            立即咨询 <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 核心优势 */}
            <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-content mb-4">为什么选择我们</h2>
                    <p className="text-lg text-content-secondary">强大的技术支持，灵活的商业模式</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            icon: <Store className="w-10 h-10" />,
                            title: '独立品牌',
                            desc: '专属域名和品牌标识，打造您的 AI 创作平台',
                            gradient: 'from-blue-500/20 to-cyan-500/20',
                            iconColor: 'text-blue-400'
                        },
                        {
                            icon: <TrendingUp className="w-10 h-10" />,
                            title: '成本价拿货',
                            desc: '以成本价获取套餐，自主设置售价，掌控利润空间',
                            gradient: 'from-emerald-500/20 to-green-500/20',
                            iconColor: 'text-emerald-400'
                        },
                        {
                            icon: <Zap className="w-10 h-10" />,
                            title: '技术支持',
                            desc: '完善的技术支持和运营指导，助您快速上手',
                            gradient: 'from-amber-500/20 to-orange-500/20',
                            iconColor: 'text-amber-400'
                        },
                        {
                            icon: <Shield className="w-10 h-10" />,
                            title: '稳定可靠',
                            desc: '成熟的系统架构，7x24小时稳定运行',
                            gradient: 'from-purple-500/20 to-pink-500/20',
                            iconColor: 'text-purple-400'
                        }
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="group card p-8 text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                            <div className="relative">
                                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-hover ${item.iconColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-content mb-3">{item.title}</h3>
                                <p className="text-sm text-content-secondary leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 加盟流程 */}
            <div className="bg-surface-hover/30 border-y border-surface-border py-20">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-content mb-4">加盟流程</h2>
                        <p className="text-lg text-content-secondary">简单三步，开启您的 AI 创作事业</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: '01',
                                title: '联系咨询',
                                desc: '通过下方联系方式与我们取得联系，了解详细合作方案',
                                icon: <Users className="w-8 h-8" />
                            },
                            {
                                step: '02',
                                title: '配置开通',
                                desc: '确认合作后，我们将为您配置独立域名和品牌',
                                icon: <Zap className="w-8 h-8" />
                            },
                            {
                                step: '03',
                                title: '开始运营',
                                desc: '获得代理后台权限，设置套餐价格，开始运营推广',
                                icon: <TrendingUp className="w-8 h-8" />
                            }
                        ].map((item, i) => (
                            <div key={i} className="relative">
                                <div className="card p-8 h-full hover:shadow-xl transition-shadow">
                                    <div className="text-6xl font-bold text-accent/10 mb-4">{item.step}</div>
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-content">{item.title}</h3>
                                    </div>
                                    <p className="text-content-secondary leading-relaxed">{item.desc}</p>
                                </div>
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                                        <ArrowRight className="w-8 h-8 text-accent/30" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 联系方式 */}
            <div id="contact-section" className="max-w-4xl mx-auto px-6 py-20">
                <div className="card p-12 text-center bg-gradient-to-br from-accent/5 to-purple-500/5 border-2 border-accent/20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 text-accent mb-6">
                        <Store className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-content mb-4">联系我们</h2>
                    <p className="text-lg text-content-secondary mb-10">
                        欢迎咨询代理加盟事宜，我们将为您提供详细的合作方案
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                        {/* 微信 */}
                        {contactInfo.wechat && (
                            <div className="card p-6 hover:shadow-lg transition-shadow">
                                <div className="text-emerald-400 mb-3">
                                    <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                                    </svg>
                                </div>
                                <div className="text-sm text-content-muted mb-2">微信</div>
                                <div className="text-content font-medium">{contactInfo.wechat}</div>
                            </div>
                        )}

                        {/* Telegram */}
                        {contactInfo.enableTelegram && contactInfo.telegram && (
                            <div className="card p-6 hover:shadow-lg transition-shadow">
                                <div className="text-blue-400 mb-3">
                                    <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                                    </svg>
                                </div>
                                <div className="text-sm text-content-muted mb-2">Telegram</div>
                                <div className="text-content font-medium">{contactInfo.telegram}</div>
                            </div>
                        )}

                        {/* 邮箱 */}
                        {contactInfo.enableEmail && contactInfo.email && (
                            <div className="card p-6 hover:shadow-lg transition-shadow">
                                <div className="text-purple-400 mb-3">
                                    <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="M22 7l-10 7L2 7"/>
                                    </svg>
                                </div>
                                <div className="text-sm text-content-muted mb-2">邮箱</div>
                                <div className="text-content font-medium text-sm">{contactInfo.email}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-surface-hover/30 border-t border-surface-border py-20">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-content mb-4">常见问题</h2>
                        <p className="text-lg text-content-secondary">解答您关心的问题</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: '成为代理需要什么条件？',
                                a: '我们欢迎有推广资源、运营经验或对 AI 行业感兴趣的个人或团队加盟。无需技术背景，我们提供完整的技术支持和运营指导。'
                            },
                            {
                                q: '代理的成本价是多少？',
                                a: '不同套餐的成本价不同，具体价格请联系我们咨询。您可以在成本价基础上自由设置售价，利润空间完全由您掌控。'
                            },
                            {
                                q: '需要自己搭建技术平台吗？',
                                a: '不需要。我们提供完整的技术平台，您只需要使用独立域名和品牌标识即可。所有技术维护、系统升级由我们负责。'
                            },
                            {
                                q: '如何结算和提现？',
                                a: '代理后台实时显示余额，支持随时申请提现。我们会在审核通过后的 1-3 个工作日内完成打款。'
                            },
                            {
                                q: '是否提供运营支持？',
                                a: '是的。我们提供完整的运营指导，包括推广素材、营销策略、客户服务等方面的支持，帮助您快速开展业务。'
                            },
                            {
                                q: '代理协议期限是多久？',
                                a: '代理合作没有固定期限，只要双方合作愉快即可长期合作。如需终止合作，提前沟通即可。'
                            }
                        ].map((item, i) => (
                            <details key={i} className="card p-6 group">
                                <summary className="flex items-center justify-between cursor-pointer list-none">
                                    <span className="text-lg font-medium text-content group-open:text-accent transition-colors">
                                        {item.q}
                                    </span>
                                    <CheckCircle className="w-5 h-5 text-content-muted group-open:text-accent group-open:rotate-180 transition-all" />
                                </summary>
                                <p className="mt-4 text-content-secondary leading-relaxed pl-2 border-l-2 border-accent/20">
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="card p-12 text-center bg-gradient-to-br from-accent/10 to-purple-500/10 border-2 border-accent/20">
                    <h2 className="text-3xl font-bold text-content mb-4">准备好开始了吗？</h2>
                    <p className="text-lg text-content-secondary mb-8">
                        立即联系我们，开启您的 AI 创作事业
                    </p>
                    <button
                        onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="btn-primary px-10 py-4 text-lg shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all"
                    >
                        立即咨询 <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentJoinPage;
