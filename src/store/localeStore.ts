import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'sweat-deck-locale' },
  ),
);
