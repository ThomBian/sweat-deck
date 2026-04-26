import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

describe('SetupWizard', () => {
  beforeEach(() => {
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
    render(
      <MemoryRouter>
        <SetupWizard />
      </MemoryRouter>
    );

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

    render(
      <MemoryRouter>
        <SetupWizard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Hell' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Full Gym' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Start saves config and starts the game', async () => {
    const saveSpy = vi.spyOn(dbMod, 'saveLastConfig').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SetupWizard />
      </MemoryRouter>
    );

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(screen.getByRole('button', { name: 'Deal the workout' }));

    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'intermediate' }));
    expect(useGameStore.getState().deck.length).toBe(54);
    saveSpy.mockRestore();
  });
});
