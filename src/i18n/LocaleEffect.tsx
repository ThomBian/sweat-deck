import { useEffect } from 'react';
import { useLocaleStore } from '@/store/localeStore';
import { activateLocale } from './index';

export const LocaleEffect = (): null => {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    activateLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
};
