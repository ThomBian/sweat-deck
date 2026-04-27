import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { activateLocale } from '@/i18n';

export type Locale = 'en' | 'fr';

type LocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const detectLocale = (): Locale => {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      setLocale: (locale) => {
        activateLocale(locale);
        set({ locale });
      },
    }),
    {
      name: 'sweat-deck-locale',
      onRehydrateStorage: () => (state) => {
        if (state?.locale) activateLocale(state.locale);
      },
    },
  ),
);
