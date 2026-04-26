import { create } from 'zustand';
import type { Card } from '@/domain/card';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import { build54, draw } from '@/domain/deck';
import { resolve, type Exercise } from '@/domain/exercise';
import { pickJokerEffect } from '@/domain/joker';
import { createRng, type Rng } from '@/lib/rng';
import { recordSession, saveLastConfig } from './db';

type GameState = {
  config: SetupConfig;
  deck: Card[];
  drawn: Card[];
  current: Exercise | null;
  startedAt: number | null;
  elapsedSec: number;
  finished: boolean;
  rng: Rng;
};

type GameActions = {
  start: (config: SetupConfig) => void;
  drawNext: () => void;
  tick: () => void;
  finish: () => Promise<void>;
  reset: () => void;
};

const makeInitialState = (): GameState => ({
  config: DEFAULT_CONFIG,
  deck: [],
  drawn: [],
  current: null,
  startedAt: null,
  elapsedSec: 0,
  finished: false,
  rng: createRng(Date.now()),
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),

  start: (config) => {
    void saveLastConfig(config);
    set({
      ...makeInitialState(),
      config,
      deck: build54(),
      startedAt: Date.now(),
      rng: createRng(Date.now()),
    });
  },

  drawNext: () => {
    const { deck, drawn, config, rng, finished } = get();
    if (finished || deck.length === 0) return;

    const result = draw({ remaining: deck, difficulty: config.difficulty, rng });
    const nextDrawn = [...drawn, result.card];
    // Joker history = cards already drawn before this joker (spec: use prior history for effect logic)
    const exercise =
      result.card.type === 'joker'
        ? pickJokerEffect({ history: drawn, rng }).exercise
        : resolve({ card: result.card, config });

    set({ deck: result.remaining, drawn: nextDrawn, current: exercise });
  },

  tick: () => {
    const { startedAt, finished, config } = get();
    if (!startedAt || finished) return;
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    const limit = config.timeLimitMin ? config.timeLimitMin * 60 : Infinity;
    if (elapsedSec >= limit) {
      set({ elapsedSec: limit, finished: true });
      return;
    }
    set({ elapsedSec });
  },

  finish: async () => {
    const { startedAt, drawn, config, finished } = get();
    if (finished || !startedAt) return;
    const durationSec = Math.floor((Date.now() - startedAt) / 1000);
    set({ finished: true, elapsedSec: durationSec });
    await recordSession({ startedAt, durationSec, drawnCount: drawn.length, config });
  },

  reset: () => set(makeInitialState()),
}));
