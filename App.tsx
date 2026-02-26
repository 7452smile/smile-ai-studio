import React, { Suspense, lazy, memo } from 'react';
import ToastContainer from './components/Toast';
import Lightbox from './components/Lightbox';
import LoadingScreen from './components/LoadingScreen';
import { useGeneration } from './context/GenerationContext';
import { AppMode } from './types';

const Sidebar = lazy(() => import('./components/Sidebar'));
const ControlPanel = lazy(() => import('./components/ControlPanel'));
const Workspace = lazy(() => import('./components/Workspace'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const RemoveBgPage = lazy(() => import('./components/RemoveBgPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ModelPricingPage = lazy(() => import('./components/ModelPricingPage'));
const ReferralPage = lazy(() => import('./components/ReferralPage'));
const ImageToPromptPage = lazy(() => import('./components/ImageToPromptPage'));
const CreditsHistoryPage = lazy(() => import('./components/CreditsHistoryPage'));

// 将主内容区域抽取为独立组件，避免不必要的重新渲染
const MainContent: React.FC = memo(() => {
  const { activeMode } = useGeneration();

  // 全宽页面（不需要右侧控制面板）
  if (activeMode === AppMode.Pricing) {
    return <PricingPage />;
  }
  if (activeMode === AppMode.RemoveBg) {
    return <RemoveBgPage />;
  }
  if (activeMode === AppMode.Admin) {
    return <AdminPage />;
  }
  if (activeMode === AppMode.ModelPricing) {
    return <ModelPricingPage />;
  }
  if (activeMode === AppMode.Referral) {
    return <ReferralPage />;
  }
  if (activeMode === AppMode.ImageToPrompt) {
    return <ImageToPromptPage />;
  }
  if (activeMode === AppMode.CreditsHistory) {
    return <CreditsHistoryPage />;
  }

  // 标准布局（中间工作区 + 右侧控制面板）
  return (
    <>
      <Workspace />
      <ControlPanel />
    </>
  );
});

MainContent.displayName = 'MainContent';

const App: React.FC = () => {
  const {
    showLanding,
    setShowLanding,
    notifications,
    removeNotification,
    lightboxItem,
    setLightboxItem
  } = useGeneration();

  if (showLanding) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LandingPage onLaunch={() => setShowLanding(false)} />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-surface text-content font-sans overflow-hidden">
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      <Suspense fallback={<LoadingScreen />}>
        <Sidebar />
        <MainContent />
      </Suspense>
    </div>
  );
};

export default App;
