import { useEffect } from 'react';
import { t } from '@lingui/core/macro';
import { useLocaleStore } from '@/store/localeStore';
import { activateLocale } from './index';

export const LocaleEffect = (): null => {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    activateLocale(locale);
    document.documentElement.lang = locale;
    document.title = t`Sweat Deck — Card-driven workouts`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        t`A gamified card-driven workout. Draw, move, repeat—one deck, no program builder.`,
      );
    }
  }, [locale]);
  return null;
};
