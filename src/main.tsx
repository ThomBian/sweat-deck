import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@lingui/react';
import { registerSW } from 'virtual:pwa-register';
import './styles/globals.css';
import App from './App.tsx';
import { i18n, activateLocale } from '@/i18n';
import { useLocaleStore } from '@/store/localeStore';
import { LocaleEffect } from '@/i18n/LocaleEffect';

registerSW({ immediate: true });

activateLocale(useLocaleStore.getState().locale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <LocaleEffect />
      <App />
    </I18nProvider>
  </StrictMode>
);
