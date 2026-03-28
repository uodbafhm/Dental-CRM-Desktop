import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Lang } from '../i18n/translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof translations.en) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('crm_lang') as Lang) || 'en';
  });

  const isRTL = lang === 'ar';

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('crm_lang', newLang);
  };

  const t = (key: keyof typeof translations.en): string => {
    const val = translations[lang][key];
    if (Array.isArray(val)) return (val as string[]).join(',');
    return (val as string) || (translations.en[key] as string) || key;
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.style.fontFamily = isRTL
      ? "'Tajawal', sans-serif"
      : "'Inter', sans-serif";
  }, [lang, isRTL]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
