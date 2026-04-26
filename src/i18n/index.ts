import { i18n } from '@lingui/core';
import { messages as en } from '@/locales/en/messages';
import { messages as fr } from '@/locales/fr/messages';
import type { Locale } from '@/store/localeStore';

i18n.load({ en, fr });

export const activateLocale = (locale: Locale): void => {
  i18n.activate(locale);
};

export { i18n };
