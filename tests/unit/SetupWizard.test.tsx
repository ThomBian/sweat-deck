import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n } from '@/i18n';
import SetupWizard from '@/components/SetupWizard';
import * as persisted from '@/hooks/usePersistedConfig';
import { useGameStore } from '@/store/gameStore';
import * as dbMod from '@/store/db';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/usePersistedConfig');

const wrap = (ui: ReactElement) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{ui}</MemoryRouter>
  </I18nProvider>
);

describe('SetupWizard', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.clearAllMocks();
    vi.mocked(persisted.usePersistedConfig).mockReturnValue({
      config: DEFAULT_CONFIG,
      loaded: true,
      loadFailed: false,
    });
    useGameStore.getState().reset();
  });

  it('steps forward and back', async () => {
    const user = userEvent.setup();
    render(wrap(<SetupWizard />));

    expect(screen.getByRole('heading', { name: 'How hard?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'What equipment?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'How hard?' })).toBeInTheDocument();
  });

  it('seeds draft from persisted config', async () => {
    const user = userEvent.setup();
    const custom: SetupConfig = {
      difficulty: 'hell',
      equipment: 'gym',
      theme: 'lower',
      cardio: true,
      timeLimitMin: 30,
    };
    vi.mocked(persisted.usePersistedConfig).mockReturnValue({
      config: custom,
      loaded: true,
      loadFailed: false,
    });

    render(wrap(<SetupWizard />));

    expect(screen.getByRole('button', { name: 'Hell' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Full Gym' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Review your deck saves config and navigates to /review', async () => {
    const saveSpy = vi.spyOn(dbMod, 'saveLastConfig').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(wrap(<SetupWizard />));

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(screen.getByRole('button', { name: 'Review your deck' }));

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'intermediate' }));
    expect(mockNavigate).toHaveBeenCalledWith('/review', {
      state: { config: expect.objectContaining({ difficulty: 'intermediate' }) },
    });
    expect(useGameStore.getState().deck.length).toBe(0);
    saveSpy.mockRestore();
  });
});
