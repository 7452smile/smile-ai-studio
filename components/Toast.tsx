import React, { useEffect, memo, useState, useCallback } from 'react';
import { Notification } from '../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

// 最多显示的 Toast 数量
const MAX_TOASTS = 3;
// Toast 自动消失时间（毫秒）
const TOAST_DURATION = 3000;
// 淡出动画时间
const FADE_OUT_DURATION = 300;

const ToastContainer: React.FC<ToastProps> = ({ notifications, removeNotification }) => {
  // 只显示最新的 MAX_TOASTS 个通知
  const visibleNotifications = notifications.slice(-MAX_TOASTS);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none">
      {visibleNotifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onRemove: () => void }> = memo(({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  // 使用 useCallback 稳定 onRemove 引用
  const stableRemove = useCallback(() => {
    onRemove();
  }, [onRemove]);

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => setIsVisible(true));

    // 自动消失
    const hideTimer = setTimeout(() => setIsVisible(false), TOAST_DURATION);
    const removeTimer = setTimeout(stableRemove, TOAST_DURATION + FADE_OUT_DURATION);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [stableRemove]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(stableRemove, FADE_OUT_DURATION);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-error" />;
      default: return <Info className="w-4 h-4 text-accent" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-success/15 border-success/30';
      case 'error': return 'bg-error/15 border-error/30';
      default: return 'bg-accent/15 border-accent/30';
    }
  };

  return (
    <div
      className={`pointer-events-auto px-4 py-2.5 rounded-lg border backdrop-blur-xl shadow-lg flex items-center space-x-2 transition-all duration-300 ${getBgColor()} ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
      }`}
    >
      {getIcon()}
      <span className="text-sm text-content font-medium">{notification.title}</span>
      {notification.message && (
        <span className="text-xs text-content-secondary">- {notification.message}</span>
      )}
      <button onClick={handleClose} className="ml-2 text-content-muted hover:text-content transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

export default ToastContainer;
