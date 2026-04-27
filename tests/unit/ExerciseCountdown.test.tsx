import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import type { ExerciseCountdownPhase } from '@/hooks/useExerciseCountdown';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

const mockHook = {
  phase: 'idle' as ExerciseCountdownPhase,
  remaining: 60,
  start: vi.fn(),
};

vi.mock('@/hooks/useExerciseCountdown', () => ({
  useExerciseCountdown: () => mockHook,
}));

import { ExerciseCountdown } from '@/components/ExerciseCountdown';

const wrap = (ui: ReactElement) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

describe('ExerciseCountdown', () => {
  beforeEach(() => {
    i18n.activate('en');
    mockHook.phase = 'idle';
    mockHook.remaining = 60;
    mockHook.start = vi.fn();
  });

  it('renders "Tap to start" in idle state', () => {
    render(wrap(<ExerciseCountdown durationSec={60} />));
    expect(screen.getByText(/tap to start/i)).toBeInTheDocument();
  });

  it('clicking the ring calls start() when idle', () => {
    render(wrap(<ExerciseCountdown durationSec={60} />));
    fireEvent.click(screen.getByRole('button'));
    expect(mockHook.start).toHaveBeenCalledOnce();
  });

  it('shows MM:SS in running state', () => {
    mockHook.phase = 'running';
    mockHook.remaining = 45;
    render(wrap(<ExerciseCountdown durationSec={60} />));
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('shows checkmark in done state', () => {
    mockHook.phase = 'done';
    mockHook.remaining = 0;
    render(wrap(<ExerciseCountdown durationSec={60} />));
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('button is disabled when not idle', () => {
    mockHook.phase = 'running';
    mockHook.remaining = 30;
    render(wrap(<ExerciseCountdown durationSec={60} />));
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
