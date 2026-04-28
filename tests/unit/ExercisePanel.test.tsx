import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { useGameStore } from '@/store/gameStore';
import type { Card } from '@/domain/card';
import type { Exercise } from '@/domain/exercise';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

import { ExercisePanel } from '@/components/ExercisePanel';

const wrap = (ui: ReactElement) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

const seedDrawn = (cards: Card[]) => {
  useGameStore.setState({ drawn: cards });
};

const SIX_HEARTS: Card = { type: 'number', suit: 'hearts', value: 6 };
const EIGHT_SPADES: Card = { type: 'number', suit: 'spades', value: 8 };
const JOKER: Card = { type: 'joker', id: 1 };
const DOUBLE_UP: Exercise = { id: 'double-up' };

beforeEach(() => {
  i18n.activate('en');
  useGameStore.getState().reset();
});

describe('ExercisePanel — Double Up', () => {
  it('renders the heading "Double up"', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    expect(screen.getByText(/double up/i)).toBeInTheDocument();
  });

  it('renders both prior card values (6 and 8)', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    // CardFace renders the value at top-left of each mini
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('renders the "10 reps each" line', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    expect(screen.getByText(/10 reps each/i)).toBeInTheDocument();
  });

  it('does NOT render the joker card inside the panel (top Deck row owns that)', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    // The joker label is "★" — it should not appear in the panel
    expect(screen.queryByText('★')).not.toBeInTheDocument();
  });

  it('falls back to plain heading when not double-up', () => {
    seedDrawn([SIX_HEARTS]);
    render(wrap(<ExercisePanel exercise={{ id: 'pushups', reps: 6 }} />));
    expect(screen.getByText('6 reps')).toBeInTheDocument();
  });
});
