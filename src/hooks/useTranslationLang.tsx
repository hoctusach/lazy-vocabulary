import { useEffect, useState } from 'react';
import { TRANSLATION_LANG_KEY } from '@/utils/storageKeys';

export const useTranslationLang = () => {
  const [lang, setLangState] = useState<string>(() => {
    try {
      return localStorage.getItem(TRANSLATION_LANG_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (lang) {
      try {
        localStorage.setItem(TRANSLATION_LANG_KEY, lang);
      } catch {
        // ignore storage errors
      }
    }
  }, [lang]);

  const setLang = (code: string) => setLangState(code);
  const clearLang = () => {
    setLangState('');
    try {
      localStorage.removeItem(TRANSLATION_LANG_KEY);
    } catch {
      // ignore
    }
  };

  return { lang, setLang, clearLang };
};
