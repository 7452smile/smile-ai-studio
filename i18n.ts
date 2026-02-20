import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN_common from './locales/zh-CN/common.json';
import zhCN_landing from './locales/zh-CN/landing.json';
import zhCN_auth from './locales/zh-CN/auth.json';
import zhCN_sidebar from './locales/zh-CN/sidebar.json';
import zhCN_controlPanel from './locales/zh-CN/controlPanel.json';
import zhCN_workspace from './locales/zh-CN/workspace.json';
import zhCN_pricing from './locales/zh-CN/pricing.json';
import zhCN_admin from './locales/zh-CN/admin.json';
import zhCN_errors from './locales/zh-CN/errors.json';

import en_common from './locales/en/common.json';
import en_landing from './locales/en/landing.json';
import en_auth from './locales/en/auth.json';
import en_sidebar from './locales/en/sidebar.json';
import en_controlPanel from './locales/en/controlPanel.json';
import en_workspace from './locales/en/workspace.json';
import en_pricing from './locales/en/pricing.json';
import en_admin from './locales/en/admin.json';
import en_errors from './locales/en/errors.json';

const ns = ['common', 'landing', 'auth', 'sidebar', 'controlPanel', 'workspace', 'pricing', 'admin', 'errors'] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        common: zhCN_common, landing: zhCN_landing, auth: zhCN_auth, sidebar: zhCN_sidebar,
        controlPanel: zhCN_controlPanel, workspace: zhCN_workspace, pricing: zhCN_pricing,
        admin: zhCN_admin, errors: zhCN_errors,
      },
      en: {
        common: en_common, landing: en_landing, auth: en_auth, sidebar: en_sidebar,
        controlPanel: en_controlPanel, workspace: en_workspace, pricing: en_pricing,
        admin: en_admin, errors: en_errors,
      },
    },
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    ns: [...ns],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
