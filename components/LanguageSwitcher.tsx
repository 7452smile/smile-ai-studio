import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'zh-CN', flag: '🇨🇳', name: '简体中文' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
];

interface LanguageSwitcherProps {
  dropUp?: boolean;
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ dropUp = true, className }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={className || "w-full flex items-center space-x-3 px-3 py-2 text-content-tertiary hover:text-content transition-colors rounded-lg hover:bg-surface-hover"}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{current.flag} {current.name}</span>
      </button>
      {open && (
        <div className={`absolute left-0 w-44 overflow-y-auto bg-surface-raised border border-surface-border rounded-xl shadow-xl z-50 ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors ${
                i18n.language === lang.code ? 'text-accent' : 'text-content-secondary'
              }`}
            >
              <span>{lang.flag} {lang.name}</span>
              {i18n.language === lang.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
