import { create } from 'zustand';
import type { Card } from '@/domain/card';
import { type SetupConfig, DEFAULT_CONFIG, type Equipment, type Theme } from '@/domain/config';
import { build54, buildDevPlaytestDeck, draw, drawNonAce, drawNonJoker, type DrawResult } from '@/domain/deck';
import type { Difficulty } from '@/domain/difficulty';
import { resolve, type Exercise } from '@/domain/exercise';
import type { PlanOverrides, SlotKey, SlotOverride } from '@/domain/plan';
import { pickJokerEffect } from '@/domain/joker';
import { createRng, type Rng } from '@/lib/rng';
import { computeEffortSec, getLimitSecFromConfig, isDeckEffortOnlyCard } from '@/lib/sessionTimer';
import { recordSession, saveLastConfig } from './db';

const VALID_DIFFICULTY: ReadonlySet<Difficulty> = new Set([
  'beginner',
  'intermediate',
  'hard',
  'advanced',
  'hell',
]);
const VALID_EQUIP: ReadonlySet<Equipment> = new Set(['bodyweight', 'weights', 'gym']);
const VALID_THEME: ReadonlySet<Theme> = new Set(['upper', 'lower', 'full']);

function validateConfig(config: SetupConfig): boolean {
  return (
    VALID_DIFFICULTY.has(config.difficulty) &&
    VALID_EQUIP.has(config.equipment) &&
    VALID_THEME.has(config.theme) &&
    typeof config.cardio === 'boolean'
  );
}

/** Set to `'1'` in dev (`localStorage`) for a fixed 10-card stack ending in 6♠, 8♠, joker (sequential draw). */
export const DEV_PLAYTEST_DECK_KEY = 'sd:dev:playtest-deck';

/** @deprecated Use `DEV_PLAYTEST_DECK_KEY`; still honored. */
export const DEV_JOKER_ONLY_DECK_KEY = 'sd:dev:joker-only-deck';

function isDevPlaytestDeckEnabled(): boolean {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return false;
  return (
    localStorage.getItem(DEV_PLAYTEST_DECK_KEY) === '1' ||
    localStorage.getItem(DEV_JOKER_ONLY_DECK_KEY) === '1'
  );
}

function initialSessionDeck(): { deck: Card[]; sequentialDeckDraw: boolean } {
  if (isDevPlaytestDeckEnabled()) {
    return { deck: buildDevPlaytestDeck(), sequentialDeckDraw: true };
  }
  return { deck: build54(), sequentialDeckDraw: false };
}

type EndReason = 'deck' | 'manual';

type GameState = {
  config: SetupConfig;
  /** Dev playtest: draw from top of stack in order (see `buildDevPlaytestDeck`). */
  sequentialDeckDraw: boolean;
  deck: Card[];
  drawn: Card[];
  current: Exercise | null;
  startedAt: number | null;
  elapsedSec: number;
  pausedAt: number | null;
  pausedAccumMs: number;
  pausedBy: 'user' | 'visibility' | null;
  finished: boolean;
  endReason: EndReason | null;
  completedDeck: boolean;
  lastRestAtElapsedSec: number;
  rng: Rng;
  overrides: PlanOverrides;
  savedDeckId: number | null;
};

type FinishOpts = { reason: EndReason; completedDeck: boolean };

type GameActions = {
  start: (config: SetupConfig) => void;
  drawNext: () => void;
  tick: () => void;
  finish: (opts?: FinishOpts) => Promise<void>;
  pause: (by: 'user' | 'visibility') => void;
  resume: () => void;
  reset: () => void;
  setOverride: (key: SlotKey, override: SlotOverride) => void;
  mergePrescriptionOverride: (
    key: SlotKey,
    field: 'reps' | 'durationSec' | 'distanceM',
    value: number,
  ) => void;
  clearOverride: (key: SlotKey) => void;
  resetOverrides: () => void;
  setSavedDeckId: (id: number | null) => void;
};

const makeInitialState = (): GameState => ({
  config: DEFAULT_CONFIG,
  sequentialDeckDraw: false,
  deck: [],
  drawn: [],
  current: null,
  startedAt: null,
  elapsedSec: 0,
  pausedAt: null,
  pausedAccumMs: 0,
  pausedBy: null,
  finished: false,
  endReason: null,
  completedDeck: false,
  lastRestAtElapsedSec: 0,
  rng: createRng(Date.now()),
  overrides: {},
  savedDeckId: null,
});

const exerciseFromCard = (
  card: Card,
  config: SetupConfig,
  overrides: PlanOverrides,
  historyBefore: Card[],
  rng: Rng,
): Exercise =>
  card.type === 'joker'
    ? pickJokerEffect({ history: historyBefore, rng }).exercise
    : resolve({ card, config, overrides });

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),

  start: (config) => {
    if (!validateConfig(config)) return;
    void saveLastConfig(config);
    const { overrides: currentOverrides, savedDeckId: currentSavedDeckId } = get();
    const { deck, sequentialDeckDraw } = initialSessionDeck();
    set({
      ...makeInitialState(),
      config,
      deck,
      sequentialDeckDraw,
      startedAt: Date.now(),
      rng: createRng(Date.now()),
      overrides: currentOverrides,
      savedDeckId: currentSavedDeckId,
    });
  },

  drawNext: () => {
    const s0 = get();
    if (s0.finished || s0.pausedAt || s0.deck.length === 0) return;

    const effortSec = computeEffortSec({
      startedAt: s0.startedAt!,
      pausedAt: s0.pausedAt,
      pausedAccumMs: s0.pausedAccumMs,
    });
    const acesInDeck = s0.deck.filter((c) => c.type === 'ace').length;
    const timeMin = s0.config.timeLimitMin;
    const hasCap = timeMin != null && timeMin > 0;
    const intervalSec = hasCap ? (timeMin! * 60) / (acesInDeck + 1) : 15 * 60;
    const sinceLastRest = effortSec - s0.lastRestAtElapsedSec;
    const drawnCount = s0.drawn.length;
    const { config, rng } = s0;
    const { difficulty } = config;

    let result: DrawResult = s0.sequentialDeckDraw
      ? (() => {
          const remaining = s0.deck;
          const card = remaining[remaining.length - 1]!;
          return { card, remaining: remaining.slice(0, -1) };
        })()
      : draw({ remaining: s0.deck, difficulty, rng });
    if (result.card.type === 'ace') {
      const mustBlockAce = drawnCount < 15 || sinceLastRest < intervalSec * 0.7;
      if (mustBlockAce) {
        const full = [result.card, ...result.remaining];
        const canAvoidAce = full.some((c) => c.type !== 'ace');
        if (canAvoidAce) {
          const alt = drawNonAce({ remaining: full, difficulty, rng });
          if (alt) result = alt;
        }
      }
    }

    if (result.card.type === 'joker' && drawnCount < 10) {
      const full = [result.card, ...result.remaining];
      const canAvoidJoker = full.some((c) => c.type !== 'joker');
      if (canAvoidJoker) {
        const alt = drawNonJoker({ remaining: full, difficulty, rng });
        if (alt) result = alt;
      }
    }

    let { card, remaining: rem } = result;

    const acesLeftIn = [card, ...rem].filter((c) => c.type === 'ace').length;
    if (
      isDeckEffortOnlyCard(card) &&
      drawnCount >= 15 &&
      sinceLastRest >= intervalSec * 1.0 &&
      acesLeftIn > 0
    ) {
      const full = [card, ...rem];
      const aidx = full.findIndex((c) => c.type === 'ace');
      if (aidx >= 0) {
        const pickedAce = full[aidx]!;
        const rest = full.filter((_, i) => i !== aidx);
        card = pickedAce;
        rem = rest;
      }
    }

    const historyBefore = s0.drawn;
    const exercise = exerciseFromCard(card, config, s0.overrides, historyBefore, rng);
    const nextDrawn = [...s0.drawn, card];
    const updateRest = card.type === 'ace';

    set({
      deck: rem,
      drawn: nextDrawn,
      current: exercise,
      lastRestAtElapsedSec: updateRest ? effortSec : s0.lastRestAtElapsedSec,
    });

    if (rem.length === 0) {
      void get().finish({ reason: 'deck', completedDeck: true });
    }
  },

  tick: () => {
    const s = get();
    if (!s.startedAt || s.finished || s.pausedAt) return;
    set({
      elapsedSec: computeEffortSec(
        { startedAt: s.startedAt, pausedAt: s.pausedAt, pausedAccumMs: s.pausedAccumMs },
        Date.now(),
      ),
    });
  },

  pause: (by) => {
    set((s) => {
      if (s.finished || s.pausedAt) return s;
      return { ...s, pausedAt: Date.now(), pausedBy: by };
    });
  },

  resume: () => {
    set((s) => {
      if (!s.pausedAt) return s;
      return {
        ...s,
        pausedAccumMs: s.pausedAccumMs + (Date.now() - s.pausedAt),
        pausedAt: null,
        pausedBy: null,
      };
    });
  },

  finish: async (opts) => {
    const s = get();
    if (s.finished || !s.startedAt) return;
    const now = Date.now();
    const durationSec = computeEffortSec(
      { startedAt: s.startedAt, pausedAt: s.pausedAt, pausedAccumMs: s.pausedAccumMs },
      now,
    );
    const reason = opts?.reason ?? 'manual';
    const completed = opts?.completedDeck ?? (reason === 'deck');
    const limit = getLimitSecFromConfig(s.config);
    const endedInOvertime = limit != null && durationSec > limit;

    set({
      finished: true,
      elapsedSec: durationSec,
      endReason: reason,
      completedDeck: completed,
    });
    await recordSession({
      startedAt: s.startedAt,
      durationSec,
      drawnCount: s.drawn.length,
      config: s.config,
      endReason: reason,
      completedDeck: completed,
      endedInOvertime,
    });
  },

  reset: () => set(makeInitialState()),

  setOverride: (key, override) =>
    set((s) => ({ overrides: { ...s.overrides, [key]: override } })),

  mergePrescriptionOverride: (key, field, value) =>
    set((s) => ({
      overrides: {
        ...s.overrides,
        [key]: { ...s.overrides[key], [field]: value },
      },
    })),

  clearOverride: (key) =>
    set((s) => {
      const next = { ...s.overrides };
      delete next[key];
      return { overrides: next };
    }),

  resetOverrides: () => set({ overrides: {} }),

  setSavedDeckId: (id) => set({ savedDeckId: id }),
}));
