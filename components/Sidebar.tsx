import React, { useState, useEffect, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppMode } from '../types';
import {
  Palette,
  Video,
  Maximize,
  LogOut,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Scissors,
  Shield,
  Calculator,
  Gift,
  Ticket,
  Receipt
} from 'lucide-react';

import { useGeneration } from '../context/GenerationContext';
import { IMAGE_MODELS, VIDEO_MODELS } from '../constants';
import { redeemCode } from '../services/api';
import LanguageSwitcher from './LanguageSwitcher';

// 将导航按钮抽取为独立组件，避免整个 Sidebar 重新渲染
const NavButton: React.FC<{
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hasSubmenu?: boolean;
}> = memo(({ isActive, isExpanded, onClick, icon, label, hasSubmenu }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
      isActive
        ? 'bg-accent-subtle text-content'
        : 'text-content-secondary hover:text-content hover:bg-surface-hover'
    }`}
  >
    <div className="flex items-center space-x-3">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    {hasSubmenu && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
  </button>
));

NavButton.displayName = 'NavButton';

// 子菜单项组件
const SubMenuItem: React.FC<{
  isActive: boolean;
  onClick: () => void;
  label: string;
}> = memo(({ isActive, onClick, label }) => (
  <button
    onClick={onClick}
    className={`w-full text-left text-xs py-2 px-3 rounded-md transition-all ${
      isActive
        ? 'bg-accent text-white'
        : 'text-content-tertiary hover:text-content-secondary hover:bg-surface-hover'
    }`}
  >
    {label}
  </button>
));

SubMenuItem.displayName = 'SubMenuItem';

const Sidebar: React.FC = memo(() => {
  const { t } = useTranslation('sidebar');
  const {
    activeMode: currentMode,
    setActiveMode: setMode,
    goHome,
    logout,
    isLoggedIn,
    userPhone,
    userEmail,
    userId,
    imageModel, setImageModel,
    videoModel, setVideoModel,
    userCredits,
    estimatedCost,
    userSubscription,
    isAdmin
  } = useGeneration();

  const [expandedSection, setExpandedSection] = useState<AppMode | null>(null);
  const [showRedeemInput, setShowRedeemInput] = useState(false);
  const [redeemCodeValue, setRedeemCodeValue] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentMode === AppMode.ImageCreation || currentMode === AppMode.ImageToPrompt) setExpandedSection(AppMode.ImageCreation);
    else if (currentMode === AppMode.VideoGeneration) setExpandedSection(AppMode.VideoGeneration);
    else setExpandedSection(null);
  }, [currentMode]);

  const handleModeClick = useCallback((mode: AppMode) => {
    if (currentMode === mode) {
      setExpandedSection(prev => prev === mode ? null : mode);
    } else {
      setMode(mode);
    }
  }, [currentMode, setMode]);

  const handleModelSelect = useCallback((type: 'image' | 'video', modelId: string) => {
    if (type === 'image') {
      setImageModel(modelId as any);
      setMode(AppMode.ImageCreation);
    } else {
      setVideoModel(modelId as any);
      setMode(AppMode.VideoGeneration);
    }
  }, [setImageModel, setVideoModel, setMode]);

  const handleUpscaleClick = useCallback(() => {
    setMode(AppMode.Upscale);
  }, [setMode]);

  const handleRemoveBgClick = useCallback(() => {
    setMode(AppMode.RemoveBg);
  }, [setMode]);

  const handleImageToPromptClick = useCallback(() => {
    setMode(AppMode.ImageToPrompt);
  }, [setMode]);

  const handlePricingClick = useCallback(() => {
    setMode(AppMode.Pricing);
  }, [setMode]);

  const handleModelPricingClick = useCallback(() => {
    setMode(AppMode.ModelPricing);
  }, [setMode]);

  const handleReferralClick = useCallback(() => {
    setMode(AppMode.Referral);
  }, [setMode]);

  const handleCreditsHistoryClick = useCallback(() => {
    setMode(AppMode.CreditsHistory);
  }, [setMode]);

  const handleAdminClick = useCallback(() => {
    setMode(AppMode.Admin);
  }, [setMode]);

  const handleRedeem = useCallback(async () => {
    if (!userId || !redeemCodeValue.trim() || redeemLoading) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    const res = await redeemCode(userId, redeemCodeValue.trim());
    if (res.success) {
      if (res.type === 'subscription' && res.tier_id) {
        const tierName = t(`tierNames.${res.tier_id}`, res.tier_id);
        setRedeemMsg({ type: 'success', text: t('redeem.successSub', { tier: tierName, credits: res.credits_granted }) });
      } else {
        setRedeemMsg({ type: 'success', text: t('redeem.success', { credits: res.credits_granted }) });
      }
      setRedeemCodeValue('');
    } else {
      setRedeemMsg({ type: 'error', text: res.error || t('redeem.failed') });
    }
    setRedeemLoading(false);
  }, [userId, redeemCodeValue, redeemLoading]);

  return (
    <div className="w-60 h-full bg-surface-raised border-r border-surface-border flex flex-col justify-between shrink-0">
      {/* Logo */}
      <div className="p-5 flex items-center space-x-3 cursor-pointer group" onClick={goHome}>
        <img src="/logo.png" alt="Smile AI" className="w-9 h-9 rounded-xl shadow-glow" />
        <span className="text-lg font-semibold font-display text-content">
          Smile AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {/* IMAGE CREATION */}
        <div className="space-y-0.5">
          <NavButton
            isActive={currentMode === AppMode.ImageCreation}
            isExpanded={expandedSection === AppMode.ImageCreation}
            onClick={() => handleModeClick(AppMode.ImageCreation)}
            icon={<Palette className="w-[18px] h-[18px]" />}
            label={t('nav.imageCreation')}
            hasSubmenu
          />

          {expandedSection === AppMode.ImageCreation && (
            <div className="pl-10 pr-2 space-y-0.5 py-1">
              {IMAGE_MODELS.map(model => (
                model.comingSoon ? (
                  <div
                    key={model.id}
                    className="w-full flex items-center justify-between text-xs py-2 px-3 rounded-md text-content-muted cursor-not-allowed"
                  >
                    <span>{model.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">{t('nav.comingSoon')}</span>
                  </div>
                ) : (
                  <SubMenuItem
                    key={model.id}
                    isActive={imageModel === model.id}
                    onClick={() => handleModelSelect('image', model.id)}
                    label={model.label}
                  />
                )
              ))}
              <SubMenuItem
                isActive={currentMode === AppMode.ImageToPrompt}
                onClick={handleImageToPromptClick}
                label={t('nav.imageToPrompt')}
              />
            </div>
          )}
        </div>

        {/* VIDEO GENERATION */}
        <div className="space-y-0.5">
          <NavButton
            isActive={currentMode === AppMode.VideoGeneration}
            isExpanded={expandedSection === AppMode.VideoGeneration}
            onClick={() => handleModeClick(AppMode.VideoGeneration)}
            icon={<Video className="w-[18px] h-[18px]" />}
            label={t('nav.videoGeneration')}
            hasSubmenu
          />

          {expandedSection === AppMode.VideoGeneration && (
            <div className="pl-10 pr-2 space-y-0.5 py-1">
              {VIDEO_MODELS.map(model => (
                <SubMenuItem
                  key={model.id}
                  isActive={videoModel === model.id}
                  onClick={() => handleModelSelect('video', model.id)}
                  label={model.label}
                />
              ))}
            </div>
          )}
        </div>

        {/* UPSCALE */}
        <NavButton
          isActive={currentMode === AppMode.Upscale}
          isExpanded={false}
          onClick={handleUpscaleClick}
          icon={<Maximize className="w-[18px] h-[18px]" />}
          label={t('nav.magnific')}
        />

        {/* REMOVE BG */}
        <NavButton
          isActive={currentMode === AppMode.RemoveBg}
          isExpanded={false}
          onClick={handleRemoveBgClick}
          icon={<Scissors className="w-[18px] h-[18px]" />}
          label={t('nav.removeBg')}
        />

        {/* PRICING */}
        <NavButton
          isActive={currentMode === AppMode.Pricing}
          isExpanded={false}
          onClick={handlePricingClick}
          icon={<CreditCard className="w-[18px] h-[18px]" />}
          label={t('nav.pricing')}
        />

        {/* MODEL PRICING */}
        <NavButton
          isActive={currentMode === AppMode.ModelPricing}
          isExpanded={false}
          onClick={handleModelPricingClick}
          icon={<Calculator className="w-[18px] h-[18px]" />}
          label={t('nav.modelPricing')}
        />

        {/* REFERRAL */}
        <NavButton
          isActive={currentMode === AppMode.Referral}
          isExpanded={false}
          onClick={handleReferralClick}
          icon={<Gift className="w-[18px] h-[18px]" />}
          label={t('nav.referral')}
        />

        {/* CREDITS HISTORY */}
        <NavButton
          isActive={currentMode === AppMode.CreditsHistory}
          isExpanded={false}
          onClick={handleCreditsHistoryClick}
          icon={<Receipt className="w-[18px] h-[18px]" />}
          label={t('nav.creditsHistory')}
        />
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-surface-border space-y-3">
        {/* User Info (if logged in) */}
        {isLoggedIn && (userPhone || userEmail) && (
          <div className="px-3 py-2 text-xs text-content-tertiary">
            {t('credits.loggedIn', { user: (() => {
              if (userPhone) return `${userPhone.slice(0, 3)}****${userPhone.slice(-4)}`;
              if (userEmail) {
                if (userEmail.endsWith('@phone.local')) {
                  const phone = userEmail.split('@')[0];
                  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
                }
                return `${userEmail.slice(0, 1)}***@${userEmail.split('@')[1]}`;
              }
              return '';
            })() })}
          </div>
        )}

        {/* Credits Card */}
        <div className="card p-4">
          {/* Tier Badge */}
          {userSubscription && userSubscription.tier !== 'free' && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                {userSubscription.tierName}
              </span>
              {userSubscription.periodEnd && (
                <span className="text-[10px] text-content-tertiary">
                  {t('credits.expires', { date: new Date(userSubscription.periodEnd).toLocaleDateString() })}
                </span>
              )}
            </div>
          )}
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-content-tertiary">{t('credits.remaining')}</span>
            <span className={`text-xs font-semibold ${userCredits !== null && estimatedCost > 0 && userCredits < estimatedCost ? 'text-red-400' : 'text-content'}`}>
              {userCredits !== null ? userCredits.toLocaleString() : '--'}
            </span>
          </div>
          {estimatedCost > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-content-tertiary">{t('credits.estimated')}</span>
              <span className={`text-xs ${userCredits !== null && userCredits < estimatedCost ? 'text-red-400 font-semibold' : 'text-amber-400'}`}>
                -{estimatedCost}
              </span>
            </div>
          )}
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: userCredits !== null ? `${Math.min(100, (userCredits / (userSubscription && userSubscription.tier !== 'free' ? (userSubscription.credits || 2000) : 200)) * 100)}%` : '0%' }}></div>
          </div>
          <button
            onClick={handlePricingClick}
            className="w-full mt-3 btn-secondary text-xs py-2"
          >
            {userSubscription && userSubscription.tier !== 'free' ? t('credits.manage') : t('credits.upgrade')}
          </button>
        </div>

        {/* Redemption Code */}
        {isLoggedIn && (
          <div>
            <button
              onClick={() => { setShowRedeemInput(!showRedeemInput); setRedeemMsg(null); }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-content-tertiary hover:text-content transition-colors rounded-lg hover:bg-surface-hover"
            >
              <Ticket className="w-4 h-4" />
              <span className="text-sm">{t('redeem.title')}</span>
              {showRedeemInput ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
            {showRedeemInput && (
              <div className="px-3 pb-2 space-y-2">
                <div className="flex space-x-1.5">
                  <input
                    className="flex-1 min-w-0 bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
                    placeholder={t('redeem.placeholder')}
                    value={redeemCodeValue}
                    onChange={e => setRedeemCodeValue(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                    maxLength={20}
                  />
                  <button
                    onClick={handleRedeem}
                    disabled={redeemLoading || !redeemCodeValue.trim()}
                    className="btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
                  >
                    {redeemLoading ? '...' : t('redeem.button')}
                  </button>
                </div>
                {redeemMsg && (
                  <div className={`text-[11px] px-1 ${redeemMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {redeemMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin Entry - only show for admins */}
        {isAdmin && (
          <button
            onClick={handleAdminClick}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
              currentMode === AppMode.Admin
                ? 'bg-accent-subtle text-content'
                : 'text-content-tertiary hover:text-content hover:bg-surface-hover'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm">{t('nav.admin')}</span>
          </button>
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Logout - only show when logged in */}
        {isLoggedIn && (
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-content-tertiary hover:text-error transition-colors rounded-lg hover:bg-surface-hover"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">{t('nav.logout')}</span>
          </button>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
