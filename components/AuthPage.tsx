import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Phone, Mail, Shield, ArrowRight, CheckCircle, Loader2, X, Gift } from 'lucide-react';
import { useGeneration } from '../context/GenerationContext';
import { supabase } from '../services/api';
import { useTranslation } from 'react-i18next';

// Cloudflare Turnstile site key
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';

interface AuthPageProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onClose, onSuccess }) => {
    const { setLoginState } = useGeneration();
    const { t } = useTranslation('auth');
    const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'input' | 'code'>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const turnstileWidgetId = useRef<string | null>(null);

    // 加载 Turnstile 脚本
    useEffect(() => {
        if (document.getElementById('turnstile-script')) return;
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        document.head.appendChild(script);
    }, []);

    // 渲染 Turnstile widget
    const renderTurnstile = useCallback(() => {
        if (!turnstileRef.current || !(window as any).turnstile) return;
        // 清除旧 widget
        if (turnstileWidgetId.current) {
            try { (window as any).turnstile.remove(turnstileWidgetId.current); } catch {}
        }
        setTurnstileToken(null);
        turnstileWidgetId.current = (window as any).turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'dark',
            callback: (token: string) => setTurnstileToken(token),
            'expired-callback': () => setTurnstileToken(null),
        });
    }, []);

    // 当 step 为 input 时渲染 Turnstile
    useEffect(() => {
        if (step !== 'input') return;
        const timer = setInterval(() => {
            if ((window as any).turnstile && turnstileRef.current) {
                renderTurnstile();
                clearInterval(timer);
            }
        }, 200);
        return () => clearInterval(timer);
    }, [step, renderTurnstile]);

    // 验证码输入框引用
    const codeInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // 读取邀请码
    useEffect(() => {
        const saved = localStorage.getItem('referral_code');
        if (saved) setReferralCode(saved);
    }, []);

    // 倒计时
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // 手机号格式化显示
    const formatPhone = (value: string) => {
        const nums = value.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 3) return nums;
        if (nums.length <= 7) return `${nums.slice(0, 3)} ${nums.slice(3)}`;
        return `${nums.slice(0, 3)} ${nums.slice(3, 7)} ${nums.slice(7)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        setPhone(value);
        setError('');
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);
        setError('');

        // 自动跳转下一个
        if (value && index < 5) {
            codeInputRefs.current[index + 1]?.focus();
        }

        // 自动提交
        if (index === 5 && value) {
            const fullCode = newCode.join('');
            if (fullCode.length === 6) {
                handleVerifyCode(fullCode);
            }
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        pastedData.split('').forEach((char, i) => {
            if (i < 6) newCode[i] = char;
        });
        setCode(newCode);
        if (pastedData.length === 6) {
            handleVerifyCode(pastedData);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) setError(error.message);
        } catch (err: any) {
            setError(err.message || t('googleLoginFailed'));
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (loginMode === 'phone' && phone.length !== 11) {
            setError(t('invalidPhone'));
            return;
        }
        if (loginMode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('invalidEmail'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const body = loginMode === 'phone' ? { phone, turnstile_token: turnstileToken } : { email, turnstile_token: turnstileToken };
            const response = await fetch('https://ncdlejeiqyhfauxkwred.supabase.co/functions/v1/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                setStep('code');
                setCountdown(60);
                setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
            } else {
                setError(data.error || t('sendFailed'));
            }
        } catch (err: any) {
            setError(t('networkError', { msg: err.message || '' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (codeStr?: string) => {
        const verifyCode = codeStr || code.join('');
        if (verifyCode.length !== 6) {
            setError(t('incompleteCode'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const body = loginMode === 'phone'
                ? { phone, code: verifyCode, referral_code: referralCode || undefined }
                : { email, code: verifyCode, referral_code: referralCode || undefined };

            const response = await fetch('https://ncdlejeiqyhfauxkwred.supabase.co/functions/v1/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                if (data.session) {
                    localStorage.setItem('supabase-session', JSON.stringify(data.session));
                    localStorage.setItem('supabase-login-time', Date.now().toString());
                }
                localStorage.removeItem('referral_code');
                setLoginState(
                    data.session?.user?.phone || null,
                    data.session?.user?.id,
                    data.session?.user?.email || null
                );
                onSuccess();
            } else {
                setError(data.error || t('verifyFailed'));
                setCode(['', '', '', '', '', '']);
                codeInputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError(t('networkError', { msg: '' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = () => {
        if (countdown === 0) {
            setCode(['', '', '', '', '', '']);
            handleSendCode();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            {/* 动态背景效果 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            {/* 网格背景 */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            {/* 主卡片 */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md"
            >
                {/* 发光边框 */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-3xl opacity-75 blur-sm" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-3xl opacity-50" />

                <div className="relative bg-[#0c0c0f] rounded-3xl overflow-hidden">
                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* 顶部装饰线 */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

                    {/* 头部 */}
                    <div className="relative px-8 pt-10 pb-6 text-center">
                        {/* Logo */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.1 }}
                            className="relative inline-flex mb-6"
                        >
                            {/* 外圈动画 */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 animate-spin-slow opacity-50 blur-md" style={{ animationDuration: '3s' }} />
                            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-white mb-2"
                        >
                            {step === 'input' ? t('welcome') : t('enterCode')}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-zinc-400 text-sm"
                        >
                            {step === 'input'
                                ? t('startJourney')
                                : loginMode === 'phone'
                                    ? t('codeSentPhone', { phone: `${phone.slice(0, 3)} **** ${phone.slice(-4)}` })
                                    : t('codeSentEmail', { email })
                            }
                        </motion.p>
                    </div>

                    {/* 内容区 */}
                    <div className="px-8 pb-10">
                        <AnimatePresence mode="wait">
                            {step === 'input' ? (
                                <motion.div
                                    key="input"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-5"
                                >
                                    {/* Google 登录按钮 */}
                                    <motion.button
                                        onClick={handleGoogleLogin}
                                        disabled={googleLoading}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full flex items-center justify-center space-x-3 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-3.5 text-white font-medium transition-all disabled:opacity-50"
                                    >
                                        {googleLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                                <span>{t('googleLogin')}</span>
                                            </>
                                        )}
                                    </motion.button>

                                    {/* 分割线 */}
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-zinc-500 text-xs">{t('orLoginWithCode')}</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>

                                    {/* Tab 切换 */}
                                    <div className="flex bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => { setLoginMode('phone'); setError(''); }}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${loginMode === 'phone' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-300'}`}
                                        >
                                            <Phone className="w-4 h-4" />
                                            <span>{t('phone')}</span>
                                        </button>
                                        <button
                                            onClick={() => { setLoginMode('email'); setError(''); }}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${loginMode === 'email' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-300'}`}
                                        >
                                            <Mail className="w-4 h-4" />
                                            <span>{t('email')}</span>
                                        </button>
                                    </div>

                                    {/* 输入框 */}
                                    <div className="relative group">
                                        <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/50 to-violet-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                                        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden group-focus-within:border-indigo-500/50 transition-colors">
                                            {loginMode === 'phone' ? (
                                                <>
                                                    <div className="flex items-center px-4 py-4 border-r border-white/10 bg-white/5">
                                                        <Phone className="w-5 h-5 text-zinc-400 mr-2" />
                                                        <span className="text-zinc-300 font-medium">+86</span>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={formatPhone(phone)}
                                                        onChange={handlePhoneChange}
                                                        placeholder={t('phonePlaceholder')}
                                                        className="flex-1 bg-transparent px-4 py-4 text-white text-lg tracking-wider placeholder-zinc-600 outline-none"
                                                        autoFocus
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center px-4 py-4 border-r border-white/10 bg-white/5">
                                                        <Mail className="w-5 h-5 text-zinc-400" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                                        placeholder={t('emailPlaceholder')}
                                                        className="flex-1 bg-transparent px-4 py-4 text-white text-lg placeholder-zinc-600 outline-none"
                                                        autoFocus
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 邀请码输入 */}
                                    <div className="relative group">
                                        <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                                        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden group-focus-within:border-amber-500/40 transition-colors">
                                            <div className="flex items-center px-4 py-3 border-r border-white/10 bg-white/5">
                                                <Gift className="w-4 h-4 text-amber-400 mr-2" />
                                                <span className="text-zinc-400 text-sm">{t('referralCode')}</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={referralCode}
                                                onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                                                placeholder={t('referralPlaceholder')}
                                                className="flex-1 bg-transparent px-4 py-3 text-white text-sm tracking-wider placeholder-zinc-600 outline-none"
                                            />
                                            {referralCode && (
                                                <button
                                                    onClick={() => setReferralCode('')}
                                                    className="pr-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 错误提示 */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="text-red-400 text-sm text-center"
                                            >
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Turnstile 人机验证 */}
                                    <div className="flex justify-center">
                                        <div ref={turnstileRef} />
                                    </div>

                                    {/* 发送按钮 */}
                                    <motion.button
                                        onClick={handleSendCode}
                                        disabled={isLoading || !turnstileToken || (loginMode === 'phone' ? phone.length !== 11 : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl opacity-75 group-hover:opacity-100 transition-opacity blur-sm group-disabled:opacity-30" />
                                        <div className="relative flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>{t('getCode')}</span>
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </div>
                                    </motion.button>

                                    {/* 安全提示 */}
                                    <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs">
                                        <Shield className="w-4 h-4" />
                                        <span>{t('securityTip')}</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="code"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* 验证码输入 */}
                                    <div className="flex justify-center space-x-3" onPaste={handleCodePaste}>
                                        {code.map((digit, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="relative group"
                                            >
                                                <div className={`absolute -inset-[1px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl transition-opacity blur-sm ${digit ? 'opacity-75' : 'opacity-0 group-focus-within:opacity-50'}`} />
                                                <input
                                                    ref={(el) => (codeInputRefs.current[index] = el)}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                                    className={`relative w-12 h-14 bg-white/5 border rounded-xl text-center text-2xl font-bold text-white outline-none transition-all ${
                                                        digit ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 focus:border-indigo-500/50'
                                                    }`}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* 错误提示 */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="text-red-400 text-sm text-center"
                                            >
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* 验证按钮 */}
                                    <motion.button
                                        onClick={() => handleVerifyCode()}
                                        disabled={isLoading || code.join('').length !== 6}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl opacity-75 group-hover:opacity-100 transition-opacity blur-sm group-disabled:opacity-30" />
                                        <div className="relative flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>{t('verifyAndLogin')}</span>
                                                </>
                                            )}
                                        </div>
                                    </motion.button>

                                    {/* 重发 & 返回 */}
                                    <div className="flex items-center justify-between text-sm">
                                        <button
                                            onClick={() => {
                                                setStep('input');
                                                setCode(['', '', '', '', '', '']);
                                                setError('');
                                            }}
                                            className="text-zinc-400 hover:text-white transition-colors"
                                        >
                                            {t('goBack')}
                                        </button>
                                        <button
                                            onClick={handleResend}
                                            disabled={countdown > 0}
                                            className={`transition-colors ${countdown > 0 ? 'text-zinc-600 cursor-not-allowed' : 'text-indigo-400 hover:text-indigo-300'}`}
                                        >
                                            {countdown > 0 ? t('resendAfter', { count: countdown }) : t('resend')}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 底部装饰 */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
