import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('useLocaleStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('defaults to fr when navigator.language starts with fr', async () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    const { useLocaleStore } = await import('@/store/localeStore');
    expect(useLocaleStore.getState().locale).toBe('fr');
  });

  it('defaults to en otherwise', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const { useLocaleStore } = await import('@/store/localeStore');
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('setLocale updates and persists', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' });
    const { useLocaleStore } = await import('@/store/localeStore');
    useLocaleStore.getState().setLocale('fr');
    expect(useLocaleStore.getState().locale).toBe('fr');
    expect(localStorage.getItem('sweat-deck-locale')).toContain('fr');
  });
});
