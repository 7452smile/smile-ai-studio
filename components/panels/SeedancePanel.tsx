import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

const SeedancePanel = memo(() => {
  const { t } = useTranslation('controlPanel');

  return (
    <div className="space-y-4 pt-4 border-t border-surface-border">
      <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('seedance.title')}</div>
      <div className="px-4 py-6 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
        <p className="text-sm text-amber-400 font-medium">Seedance 所有旧版模型渠道维护中</p>
        <p className="text-sm text-amber-400 font-medium mt-1">Seedance 2.0 将于北京时间 2 月 24 日上线</p>
      </div>
    </div>
  );
});

SeedancePanel.displayName = 'SeedancePanel';

export default SeedancePanel;
