import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@lingui/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n } from '@/i18n';
import { DeckSlotCard } from '@/components/deck/DeckSlotCard';
import { DEFAULT_CONFIG } from '@/domain/config';
import type { ComposerSlot } from '@/hooks/useDeckComposer';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const wrap = (ui: ReactNode) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{ui}</MemoryRouter>
  </I18nProvider>
);

const emptySlot: ComposerSlot = {
  key: 'suit:hearts',
  selected: undefined,
  options: [],
  defaultExercise: undefined,
};

describe('DeckSlotCard', () => {
  beforeEach(() => i18n.activate('en'));

  it('shows "Assign exercise" text when selected is undefined', () => {
    render(wrap(<DeckSlotCard config={DEFAULT_CONFIG} slot={emptySlot} onPick={vi.fn()} />));
    expect(screen.getByText(/assign exercise/i)).toBeInTheDocument();
  });

  it('does not show prescription label when selected is undefined', () => {
    render(wrap(<DeckSlotCard config={DEFAULT_CONFIG} slot={emptySlot} onPick={vi.fn()} />));
    expect(screen.queryByText(/×\d+ reps/)).toBeNull();
  });
});

const baseSlot: ComposerSlot = {
  key: 'suit:hearts',
  selected: 'pushup',
  defaultExercise: { id: 'squat', reps: 0 },
  options: [
    { id: 'pushup', reps: 10 },
    { id: 'squat', reps: 10 },
  ],
};

describe('DeckSlotCard highlight', () => {
  beforeEach(() => i18n.activate('en'));

  it('does NOT highlight when selection matches baseline override', () => {
    const { container } = render(
      wrap(
        <DeckSlotCard
          config={DEFAULT_CONFIG}
          slot={{
            ...baseSlot,
            baselineOverride: { id: 'pushup' },
          }}
          onPick={() => {}}
        />,
      ),
    );
    expect(container.querySelector('.ring-primary\\/40')).toBeNull();
  });

  it('highlights when selection differs from baseline override', () => {
    const { container } = render(
      wrap(
        <DeckSlotCard
          config={DEFAULT_CONFIG}
          slot={{
            ...baseSlot,
            baselineOverride: { id: 'squat' },
          }}
          onPick={() => {}}
        />,
      ),
    );
    expect(container.querySelector('.ring-primary\\/40')).not.toBeNull();
  });

  it('falls back to default-vs-selection when no baselineOverride', () => {
    const { container } = render(wrap(<DeckSlotCard config={DEFAULT_CONFIG} slot={baseSlot} onPick={() => {}} />));
    expect(container.querySelector('.ring-primary\\/40')).not.toBeNull();
  });
});
