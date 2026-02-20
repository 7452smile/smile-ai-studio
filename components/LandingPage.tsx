import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Image as ImageIcon, Video, ArrowRight, Check, Play, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AuthPage from './AuthPage';
import LanguageSwitcher from './LanguageSwitcher';
import { useGeneration } from '../context/GenerationContext';

import { AppMode } from '../types';

interface LandingPageProps {
    onLaunch: () => void;
}

const MODEL_SHOWCASE_KEYS = [
    { name: 'Seedream 4.5', typeKey: 'typeImage', descKey: 'seedream', tags: ['2K+', '8 Ratios'], gradient: 'from-cyan-500 to-blue-500' },
    { name: 'Kling 3', typeKey: 'typeVideo', descKey: 'kling', tags: ['4K', '15s', 'Audio'], gradient: 'from-indigo-500 to-purple-500' },
    { name: 'Minimax Hailuo', typeKey: 'typeVideo', descKey: 'minimax', tags: ['1080p', '10s'], gradient: 'from-cyan-500 to-blue-500' },
    { name: 'Runway Gen4.5', typeKey: 'typeVideo', descKey: 'runway', tags: ['10s', 'Multi-ratio'], gradient: 'from-amber-500 to-orange-500' },
    { name: 'Wan', typeKey: 'typeVideo', descKey: 'wan', tags: ['1080p', '15s'], gradient: 'from-blue-500 to-violet-500' },
    { name: 'Seedance', typeKey: 'typeVideo', descKey: 'seedance', tags: ['12s', 'Audio'], gradient: 'from-violet-500 to-pink-500' },
    { name: 'PixVerse V5', typeKey: 'typeVideo', descKey: 'pixverse', tags: ['1080p', '8s', 'Style'], gradient: 'from-pink-500 to-rose-500' },
    { name: 'LTX', typeKey: 'typeVideo', descKey: 'ltx', tags: ['4K', '50FPS', 'Audio'], gradient: 'from-emerald-500 to-cyan-500' },
    { name: 'Magnific', typeKey: 'typeTool', descKey: 'magnific', tags: ['16x', '10K'], gradient: 'from-amber-500 to-yellow-500' },
];

const TICKER_MODELS = ['Kling', 'Runway', 'Seedream', 'Minimax', 'Wan', 'Seedance', 'PixVerse', 'LTX', 'Magnific'];

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
    const [showAuth, setShowAuth] = useState(false);
    const [footerModal, setFooterModal] = useState<'terms' | 'privacy' | 'help' | null>(null);
    const { isLoggedIn, userPhone, userEmail, logout, setActiveMode } = useGeneration();
    const { t } = useTranslation('landing');

    const MODEL_SHOWCASE = MODEL_SHOWCASE_KEYS.map(m => ({
        name: m.name,
        type: t(`models.${m.typeKey}`),
        typeKey: m.typeKey,
        desc: t(`models.${m.descKey}.desc`),
        tags: m.tags,
        gradient: m.gradient,
    }));

    const handleAuthSuccess = () => {
        setShowAuth(false);
        onLaunch();
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans overflow-x-hidden selection:bg-violet-500/30 scroll-smooth">
            <AnimatePresence>
                {showAuth && (
                    <AuthPage onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
                )}
            </AnimatePresence>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <img src="/logo.png" alt="Smile AI" className="w-9 h-9 rounded-xl glow-gradient" />
                    <span className="text-lg font-semibold tracking-tight">Smile AI Studio</span>
                </div>
                <div className="hidden md:flex items-center space-x-8 text-sm text-zinc-400">
                    <a href="#features" className="hover:text-white transition-colors">{t('nav.features')}</a>
                    <a href="#models" className="hover:text-white transition-colors">{t('nav.models')}</a>
                    <a href="#pricing" className="hover:text-white transition-colors">{t('nav.pricing')}</a>
                    <button onClick={() => setFooterModal('terms')} className="hover:text-white transition-colors">{t('footer.terms')}</button>
                    <button onClick={() => setFooterModal('privacy')} className="hover:text-white transition-colors">{t('footer.privacy')}</button>
                    <button onClick={() => setFooterModal('help')} className="hover:text-white transition-colors">{t('footer.help')}</button>
                </div>
                <div className="flex items-center space-x-3">
                    {isLoggedIn ? (
                        <>
                            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-zinc-300">
                                <User className="w-4 h-4" />
                                <span>{(() => {
                                  if (userPhone) return `${userPhone.slice(0, 3)}****${userPhone.slice(-4)}`;
                                  if (userEmail) {
                                    if (userEmail.endsWith('@phone.local')) {
                                      const phone = userEmail.split('@')[0];
                                      return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
                                    }
                                    return `${userEmail.slice(0, 1)}***@${userEmail.split('@')[1]}`;
                                  }
                                  return '';
                                })()}</span>
                            </div>
                            <button onClick={logout} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                                {t('auth.logout')}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setShowAuth(true)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                            {t('auth.login')}
                        </button>
                    )}
                    <LanguageSwitcher dropUp={false} className="flex items-center space-x-2 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors" />
                    <button onClick={() => { if (isLoggedIn) onLaunch(); else setShowAuth(true); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                        {t('auth.startCreating')}
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center overflow-hidden min-h-screen justify-center">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }}></div>
                    <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }}></div>
                    <div className="absolute bottom-1/4 left-1/2 w-[700px] h-[500px] bg-violet-500/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '5s' }}></div>
                    <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px]"></div>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"></div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-4xl">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-sm text-zinc-400">{t('hero.badge')}</span>
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                        <span className="text-white">{t('hero.title1')}</span>
                        <br />
                        <span className="text-gradient-primary">{t('hero.title2')}</span>
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        {t('hero.desc')}
                        <br className="hidden md:block" />
                        {t('hero.desc2')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <motion.button onClick={() => { if (isLoggedIn) onLaunch(); else setShowAuth(true); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="group px-8 py-4 rounded-xl gradient-primary text-white font-semibold shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all flex items-center space-x-2">
                            <span>{t('hero.startFree')}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                        <button onClick={() => document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 rounded-xl border border-white/10 text-zinc-300 font-medium hover:bg-white/5 transition-all flex items-center space-x-2">
                            <Play className="w-4 h-4" />
                            <span>{t('hero.learnMore')}</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/5">
                        {[{ value: '50,000+', label: t('hero.stat.works') }, { value: '8s', label: t('hero.stat.avgTime') }, { value: '99.9%', label: t('hero.stat.uptime') }].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm text-zinc-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Model name ticker */}
                    <div className="mt-12 overflow-hidden relative">
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#09090b] to-transparent z-10"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#09090b] to-transparent z-10"></div>
                        <div className="flex space-x-8 animate-marquee">
                            {[...TICKER_MODELS, ...TICKER_MODELS].map((name, i) => (
                                <span key={i} className="text-sm text-zinc-600 font-medium whitespace-nowrap">{name}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Model Showcase */}
            <section id="models" className="py-28 px-6 max-w-6xl mx-auto scroll-mt-20">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-4">{t('models.badge')}</span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('models.title')}</h2>
                    <p className="text-zinc-500 max-w-lg mx-auto">{t('models.desc')}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {MODEL_SHOWCASE.map((model, i) => (
                        <motion.div
                            key={model.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/15 transition-all overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${model.gradient} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">{model.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    model.typeKey === 'typeImage' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                    model.typeKey === 'typeVideo' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>{model.type}</span>
                            </div>
                            <p className="text-sm text-zinc-400 mb-3">{model.desc}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {model.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-zinc-500">{tag}</span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-28 px-6 max-w-6xl mx-auto scroll-mt-20">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">{t('features.badge')}</span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('features.title')}</h2>
                    <p className="text-zinc-500 max-w-lg mx-auto">{t('features.desc')}</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-2 group relative p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/5 hover:border-cyan-500/30 transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
                                <Video className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{t('features.video.title')}</h3>
                            <p className="text-zinc-400 mb-4 leading-relaxed">{t('features.video.desc')}</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full text-xs bg-white/5 text-zinc-400">{t('features.video.tag1')}</span>
                                <span className="px-3 py-1 rounded-full text-xs bg-white/5 text-zinc-400">{t('features.video.tag2')}</span>
                                <span className="px-3 py-1 rounded-full text-xs bg-white/5 text-zinc-400">{t('features.video.tag3')}</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="group relative p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/5 hover:border-violet-500/30 transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                                <ImageIcon className="w-6 h-6 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{t('features.image.title')}</h3>
                            <p className="text-zinc-400 leading-relaxed">{t('features.image.desc')}</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="group relative p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-amber-500/20 hover:border-amber-500/40 transition-all overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-amber-500/10 border-l border-b border-amber-500/20">
                            <span className="text-xs font-medium text-amber-400">{t('features.upscale.officialApi')}</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                                <Zap className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{t('features.upscale.title')}</h3>
                            <p className="text-zinc-400 mb-3 leading-relaxed">{t('features.upscale.desc')}</p>
                            <span className="inline-flex items-center text-xs text-amber-400">{t('features.upscale.priceTip')}</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="lg:col-span-2 group relative p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/5 hover:border-pink-500/30 transition-all overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-5">
                                    <Sparkles className="w-6 h-6 text-pink-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{t('features.style.title')}</h3>
                                <p className="text-zinc-400 leading-relaxed">{t('features.style.desc')}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section id="pricing" className="py-28 px-6 bg-gradient-to-b from-zinc-900/50 to-[#09090b] scroll-mt-20">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">{t('pricing.badge')}</span>
                        <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('pricing.title')}</h2>
                        <p className="text-zinc-500">{t('pricing.desc')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all flex flex-col">
                            <div className="text-zinc-400 text-sm font-medium mb-2">{t('pricing.free.name')}</div>
                            <div className="text-4xl font-bold mb-1">{t('pricing.free.price')}</div>
                            <div className="text-zinc-500 text-sm mb-6">{t('pricing.free.period')}</div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {(t('pricing.free.features', { returnObjects: true }) as string[]).map((item: string, i: number) => (
                                    <li key={i} className="flex items-center text-sm text-zinc-400">
                                        <Check className="w-4 h-4 mr-3 text-emerald-500" />{item}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => { if (isLoggedIn) onLaunch(); else setShowAuth(true); }} className="w-full py-3 rounded-xl border border-white/10 text-zinc-300 font-medium hover:bg-white/5 transition-all">{t('pricing.free.button')}</button>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all flex flex-col">
                            <div className="text-cyan-400 text-sm font-medium mb-2">{t('pricing.starter.name')}</div>
                            <div className="text-4xl font-bold mb-1">{t('pricing.starter.price')}<span className="text-lg text-zinc-500 font-normal">{t('pricing.perMonth')}</span></div>
                            <div className="text-zinc-500 text-sm mb-6">{t('pricing.starter.period')}</div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {(t('pricing.starter.features', { returnObjects: true }) as string[]).map((item: string, i: number) => (
                                    <li key={i} className="flex items-center text-sm text-zinc-300">
                                        <Check className="w-4 h-4 mr-3 text-cyan-400" />{item}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => { if (isLoggedIn) { onLaunch(); setActiveMode(AppMode.Pricing); } else setShowAuth(true); }} className="w-full py-3 rounded-xl border border-white/10 text-zinc-300 font-medium hover:bg-white/5 transition-all">{t('pricing.starter.button')}</button>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-8 rounded-2xl bg-gradient-to-b from-violet-500/10 to-zinc-900/50 border border-violet-500/30 relative flex flex-col">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-semibold">{t('pricing.flagship.recommend')}</div>
                            <div className="text-violet-400 text-sm font-medium mb-2">{t('pricing.flagship.name')}</div>
                            <div className="text-4xl font-bold mb-1">{t('pricing.flagship.price')}<span className="text-lg text-zinc-500 font-normal">{t('pricing.perMonth')}</span></div>
                            <div className="text-zinc-500 text-sm mb-6">{t('pricing.flagship.period')}</div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {(t('pricing.flagship.features', { returnObjects: true }) as string[]).map((item: string, i: number) => (
                                    <li key={i} className="flex items-center text-sm text-zinc-300">
                                        <Check className="w-4 h-4 mr-3 text-violet-400" />{item}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => { if (isLoggedIn) { onLaunch(); setActiveMode(AppMode.Pricing); } else setShowAuth(true); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">{t('pricing.flagship.button')}</button>
                        </motion.div>
                    </div>

                    <div className="text-center mt-8">
                        <button onClick={() => { if (isLoggedIn) { onLaunch(); setActiveMode(AppMode.Pricing); } else setShowAuth(true); }} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                            {t('pricing.viewAll')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <img src="/logo.png" alt="Smile AI" className="w-8 h-8 rounded-lg" />
                        <span className="font-semibold">Smile AI Studio</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-zinc-500">
                        <button onClick={() => setFooterModal('terms')} className="hover:text-white transition-colors">{t('footer.terms')}</button>
                        <button onClick={() => setFooterModal('privacy')} className="hover:text-white transition-colors">{t('footer.privacy')}</button>
                        <button onClick={() => setFooterModal('help')} className="hover:text-white transition-colors">{t('footer.help')}</button>
                    </div>
                    <p className="text-zinc-600 text-sm">&copy; 2026 Smile AI Studio</p>
                </div>
            </footer>

            {/* Footer Modal */}
            <AnimatePresence>
                {footerModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setFooterModal(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-white/10 p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setFooterModal(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            {footerModal === 'terms' && (() => {
                                const sections = t('footer.termsContent.sections', { returnObjects: true }) as any[];
                                return (
                                    <>
                                        <h2 className="text-xl font-bold mb-1">{t('footer.termsContent.title')}</h2>
                                        <p className="text-xs text-zinc-500 mb-6">{t('footer.termsContent.lastUpdate')}</p>
                                        {sections.map((s: any, i: number) => (
                                            <div key={i} className="mb-5">
                                                <h3 className="font-semibold text-white mb-2">{s.heading}</h3>
                                                <p className="text-sm text-zinc-400 leading-relaxed">{s.text}</p>
                                                {s.list && (
                                                    <ul className="mt-2 space-y-1">
                                                        {s.list.map((item: string, j: number) => (
                                                            <li key={j} className="text-sm text-red-400 flex items-start">
                                                                <span className="mr-2 mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}

                            {footerModal === 'privacy' && (() => {
                                const sections = t('footer.privacyContent.sections', { returnObjects: true }) as any[];
                                return (
                                    <>
                                        <h2 className="text-xl font-bold mb-1">{t('footer.privacyContent.title')}</h2>
                                        <p className="text-xs text-zinc-500 mb-6">{t('footer.privacyContent.lastUpdate')}</p>
                                        {sections.map((s: any, i: number) => (
                                            <div key={i} className="mb-5">
                                                <h3 className="font-semibold text-white mb-2">{s.heading}</h3>
                                                <p className="text-sm text-zinc-400 leading-relaxed">{s.text}</p>
                                                {s.list && (
                                                    <ul className="mt-2 space-y-1">
                                                        {s.list.map((item: string, j: number) => (
                                                            <li key={j} className="text-sm text-zinc-400 flex items-start">
                                                                <span className="mr-2 mt-1 w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}

                            {footerModal === 'help' && (() => {
                                const sections = t('footer.helpContent.sections', { returnObjects: true }) as any[];
                                return (
                                    <>
                                        <h2 className="text-xl font-bold mb-6">{t('footer.helpContent.title')}</h2>
                                        {sections.map((s: any, i: number) => (
                                            <div key={i} className="mb-5">
                                                <h3 className="font-semibold text-white mb-2">{s.heading}</h3>
                                                {s.text && <p className="text-sm text-zinc-400 leading-relaxed">{s.text}</p>}
                                                {s.items && (
                                                    <div className="space-y-3 mt-2">
                                                        {s.items.map((faq: any, j: number) => (
                                                            <div key={j} className="p-3 rounded-lg bg-white/5">
                                                                <p className="text-sm font-medium text-white mb-1">{faq.q}</p>
                                                                <p className="text-sm text-zinc-400">{faq.a}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;