# Stepper → Deck Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire SetupWizard config to runtime game so timer counts down (with overtime), pause works, Aces pace by effort time, deck-empty wins, and difficulty drives both UI and the 5%-capped draw distribution.

**Architecture:** All runtime state lives in the existing Zustand `useGameStore`. Time-derived values (elapsed, phase, remaining, overtime, ace interval) are computed selectors over `startedAt + pausedAccumMs + pausedAt`. New UI components are leaf components consumed by `Play` and `Summary`. A new `DIFFICULTY_META` module is the single source of truth for difficulty copy across wizard, play, and summary.

**Tech Stack:** React 18, Zustand, Vite, TypeScript, Vitest (jsdom), Playwright, Dexie, Framer Motion, Tailwind, Radix/shadcn, Lingui.

**Spec:** `docs/superpowers/specs/2026-04-26-stepper-deck-wiring-design.md`

---

## File Structure

| File | Purpose | Status |
|---|---|---|
| `src/domain/difficultyMeta.ts` | Single source of truth: label, description, repHint, tone per difficulty | Create |
| `src/domain/deck.ts` | Add 5% extreme-cap to `pickTargetValue` | Modify |
| `src/store/gameStore.ts` | New fields (pause, lastRest, endReason, completedDeck), refactored actions | Modify |
| `src/store/selectors.ts` | Pure selectors: `selectElapsedSec`, `selectPhase`, `selectRemainingSec`, `selectOvertimeSec`, `selectAceIntervalSec`, `selectAcesRemaining` | Create |
| `src/store/db.ts` | Extend `SessionRow` with `endReason` + `completedDeck`, schema v3 | Modify |
| `src/hooks/useTimer.ts` | Gate interval on `pausedAt`; remove auto-finish on clock-zero | Modify |
| `src/hooks/useVisibilityPause.ts` | `visibilitychange` → auto pause/resume | Create |
| `src/components/Timer.tsx` | Phase-aware display (countdown / overtime / stopwatch) | Modify |
| `src/components/PauseButton.tsx` | Header pause control | Create |
| `src/components/PausedOverlay.tsx` | Full-screen overlay with Resume / Finish | Create |
| `src/components/DifficultyBadge.tsx` | Header badge + sheet trigger | Create |
| `src/components/DifficultySheet.tsx` | Bottom sheet content (description + repHint) | Create |
| `src/components/setup/DifficultyStep.tsx` | Enrich each option with description + repHint | Modify |
| `src/lib/summaryKudos.ts` | `(difficulty × completedDeck × overtime)` keyed copy buckets | Create |
| `src/routes/Play.tsx` | Wire badge, pause button, overlay, visibility hook, route guard | Modify |
| `src/routes/Summary.tsx` | Kudos-driven celebration with phase-aware copy | Modify |
| `tests/unit/difficultyMeta.test.ts` | Meta completeness | Create |
| `tests/unit/deck.distribution.test.ts` | 10k-draw histogram per difficulty | Create |
| `tests/unit/gameStore.pause.test.ts` | Pause/resume math, elapsed selector | Create |
| `tests/unit/gameStore.acePacing.test.ts` | 15-card floor, soft floor, force ceiling | Create |
| `tests/unit/gameStore.finish.test.ts` | endReason, completedDeck, deck-empty auto-finish | Create |
| `tests/unit/selectors.test.ts` | Phase + remaining + overtime derivations | Create |
| `tests/unit/useVisibilityPause.test.ts` | Hidden→pause, visible→resume guarded by pausedBy | Create |
| `tests/e2e/play.spec.ts` | Extend: countdown → overtime visual; pause; deck-empty celebration | Modify |

---

## Task 1: Difficulty meta module

**Files:**
- Create: `src/domain/difficultyMeta.ts`
- Test: `tests/unit/difficultyMeta.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/difficultyMeta.test.ts
import { describe, it, expect } from 'vitest';
import { DIFFICULTY_META } from '@/domain/difficultyMeta';
import type { Difficulty } from '@/domain/difficulty';

const ALL: Difficulty[] = ['beginner', 'intermediate', 'hard', 'advanced', 'hell'];

describe('DIFFICULTY_META', () => {
  it('has an entry for every difficulty', () => {
    for (const d of ALL) {
      const meta = DIFFICULTY_META[d];
      expect(meta).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.repHint.length).toBeGreaterThan(0);
      expect(['calm', 'warm', 'hot', 'inferno']).toContain(meta.tone);
    }
  });

  it('uses progressively hotter tones from beginner to hell', () => {
    const order = ['calm', 'warm', 'hot', 'inferno'] as const;
    const seq = ALL.map((d) => DIFFICULTY_META[d].tone);
    seq.forEach((t, i) => {
      const prev = i === 0 ? 0 : order.indexOf(seq[i - 1]!);
      expect(order.indexOf(t)).toBeGreaterThanOrEqual(prev);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/difficultyMeta.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the module**

```ts
// src/domain/difficultyMeta.ts
import type { Difficulty } from './difficulty';

export type DifficultyTone = 'calm' | 'warm' | 'hot' | 'inferno';

export type DifficultyMeta = {
  label: string;
  description: string;
  repHint: string;
  tone: DifficultyTone;
};

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  beginner: {
    label: 'Beginner',
    description: 'Reps stay low — build the habit.',
    repHint: 'Most: 2–4 · Rare: 9–10',
    tone: 'calm',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Balanced volume — a steady honest grind.',
    repHint: 'Most: 4–6 · Rare: 2 or 10',
    tone: 'warm',
  },
  hard: {
    label: 'Hard',
    description: 'Volume up — 6, 7, 8 are standard.',
    repHint: 'Most: 6–8 · Rare: 2–3',
    tone: 'hot',
  },
  advanced: {
    label: 'Advanced',
    description: 'Heavy bias to high reps. Low cards feel like a gift.',
    repHint: 'Most: 8–10 · Rare: 2–3',
    tone: 'hot',
  },
  hell: {
    label: 'Hell',
    description: 'Almost only 9s and 10s. Pure endurance.',
    repHint: 'Most: 9–10 · Rare: 2',
    tone: 'inferno',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk pnpm vitest run tests/unit/difficultyMeta.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/difficultyMeta.ts tests/unit/difficultyMeta.test.ts
rtk git commit -m "feat: add difficulty meta module"
```

---

## Task 2: Enforce 5% extreme cap in number-card draws

**Files:**
- Modify: `src/domain/deck.ts:41-50` (`pickTargetValue`)
- Test: `tests/unit/deck.distribution.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/deck.distribution.test.ts
import { describe, it, expect } from 'vitest';
import { build54, draw } from '@/domain/deck';
import { createRng } from '@/lib/rng';
import type { Difficulty } from '@/domain/difficulty';
import type { NumberCard } from '@/domain/card';

const DRAWS = 10_000;

const FAR_EXTREME: Record<Difficulty, 2 | 10> = {
  beginner: 10,
  intermediate: 2, // tie; either tail valid — sigma symmetric
  hard: 2,
  advanced: 2,
  hell: 2,
};

const MEAN: Record<Difficulty, number> = {
  beginner: 2,
  intermediate: 5,
  hard: 7,
  advanced: 9,
  hell: 10,
};

describe('number-card distribution', () => {
  for (const d of ['beginner', 'intermediate', 'hard', 'advanced', 'hell'] as const) {
    it(`${d}: extreme ≤ 6% and mode within ±1 of mean`, () => {
      const rng = createRng(42);
      const counts: Record<number, number> = {};
      for (let i = 0; i < DRAWS; i++) {
        // resample-without-removal: rebuild deck each iteration so prob is stationary
        let deck = build54();
        for (let k = 0; k < 1; k++) {
          const r = draw({ remaining: deck, difficulty: d, rng });
          deck = r.remaining;
          if (r.card.type === 'number') {
            counts[(r.card as NumberCard).value] = (counts[(r.card as NumberCard).value] ?? 0) + 1;
          }
        }
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const extreme = counts[FAR_EXTREME[d]] ?? 0;
      const extremePct = extreme / total;
      expect(extremePct).toBeLessThanOrEqual(0.06);

      const mode = Number(
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0]
      );
      expect(Math.abs(mode - MEAN[d])).toBeLessThanOrEqual(1);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails (or check current behavior)**

Run: `rtk pnpm vitest run tests/unit/deck.distribution.test.ts`
Expected: Likely PASSES for most levels because sigma=2.5 + truncation already keeps extremes low. If any difficulty exceeds 6% (e.g. hell→2 because right side clipped at 10 piles density at 10 and mass leaks elsewhere), test FAILS — that's the regression we are guarding.

- [ ] **Step 3: Add explicit cap enforcement**

```ts
// src/domain/deck.ts — replace pickTargetValue
const EXTREME_CAP = 0.05;

const FAR_EXTREME: Record<Difficulty, 2 | 10> = {
  beginner: 10,
  intermediate: 2,
  hard: 2,
  advanced: 2,
  hell: 2,
};

type PickArgs = { numbers: NumberCard[]; difficulty: Difficulty; rng: Rng };

const pickTargetValue = ({ numbers, difficulty, rng }: PickArgs): NumberValue => {
  const { mean, sigma } = NUMBER_DIST[difficulty];
  const available = new Set(numbers.map((c) => c.value));
  const extreme = FAR_EXTREME[difficulty];
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = sampleNormal({ rng, mean, sigma, min: 2, max: 10 });
    const rounded = Math.round(raw) as NumberValue;
    if (!available.has(rounded)) continue;
    if (rounded === extreme && rng() > EXTREME_CAP) continue;
    return rounded;
  }
  return numbers[sampleInt({ rng, min: 0, max: numbers.length - 1 })]!.value;
};
```

- [ ] **Step 4: Run distribution test + existing deck tests**

Run: `rtk pnpm vitest run tests/unit/deck`
Expected: PASS (all distribution buckets ≤6%, all existing deck tests still green).

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/deck.ts tests/unit/deck.distribution.test.ts
rtk git commit -m "feat: enforce 5% extreme-value cap in number-card draws"
```

---

## Task 3: Game store — pause/resume fields and actions

**Files:**
- Modify: `src/store/gameStore.ts`
- Test: `tests/unit/gameStore.pause.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/gameStore.pause.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('gameStore pause/resume', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('pause sets pausedAt and pausedBy; resume clears them and accumulates', () => {
    const s = useGameStore.getState();
    s.start(DEFAULT_CONFIG);
    expect(useGameStore.getState().pausedAt).toBeNull();

    vi.advanceTimersByTime(10_000);
    useGameStore.getState().pause('user');
    expect(useGameStore.getState().pausedAt).toBe(Date.now());
    expect(useGameStore.getState().pausedBy).toBe('user');

    vi.advanceTimersByTime(5_000);
    useGameStore.getState().resume();
    expect(useGameStore.getState().pausedAt).toBeNull();
    expect(useGameStore.getState().pausedBy).toBeNull();
    expect(useGameStore.getState().pausedAccumMs).toBe(5_000);
  });

  it('multiple pause/resume cycles accumulate', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    vi.advanceTimersByTime(1_000);
    useGameStore.getState().pause('user');
    vi.advanceTimersByTime(2_000);
    useGameStore.getState().resume();
    vi.advanceTimersByTime(1_000);
    useGameStore.getState().pause('visibility');
    vi.advanceTimersByTime(3_000);
    useGameStore.getState().resume();
    expect(useGameStore.getState().pausedAccumMs).toBe(5_000);
  });

  it('pause is no-op when already paused', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    useGameStore.getState().pause('user');
    const at = useGameStore.getState().pausedAt;
    vi.advanceTimersByTime(500);
    useGameStore.getState().pause('visibility');
    expect(useGameStore.getState().pausedAt).toBe(at);
    expect(useGameStore.getState().pausedBy).toBe('user');
  });

  it('pause is no-op when finished', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    useGameStore.setState({ finished: true });
    useGameStore.getState().pause('user');
    expect(useGameStore.getState().pausedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/gameStore.pause.test.ts`
Expected: FAIL — `pause`/`resume` actions and fields do not exist.

- [ ] **Step 3: Add pause/resume to store**

In `src/store/gameStore.ts`:

Add fields to `GameState`:

```ts
pausedAt: number | null;
pausedAccumMs: number;
pausedBy: 'user' | 'visibility' | null;
```

Add to `GameActions`:

```ts
pause: (by: 'user' | 'visibility') => void;
resume: () => void;
```

Update `makeInitialState` to include `pausedAt: null, pausedAccumMs: 0, pausedBy: null`.

Add action implementations inside `create`:

```ts
pause: (by) => {
  const { pausedAt, finished } = get();
  if (pausedAt || finished) return;
  set({ pausedAt: Date.now(), pausedBy: by });
},

resume: () => {
  const { pausedAt } = get();
  if (!pausedAt) return;
  const delta = Date.now() - pausedAt;
  set((s) => ({
    pausedAt: null,
    pausedBy: null,
    pausedAccumMs: s.pausedAccumMs + delta,
  }));
},
```

Update `start` to also reset the new fields (already covered if `start` spreads `makeInitialState()`).

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk pnpm vitest run tests/unit/gameStore.pause.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore.pause.test.ts
rtk git commit -m "feat: pause/resume actions and accumulator in gameStore"
```

---

## Task 4: Selectors module — elapsed, phase, remaining, overtime, ace interval

**Files:**
- Create: `src/store/selectors.ts`
- Test: `tests/unit/selectors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/selectors.test.ts
import { describe, it, expect } from 'vitest';
import {
  selectElapsedSec,
  selectPhase,
  selectRemainingSec,
  selectOvertimeSec,
  selectAceIntervalSec,
  selectAcesRemaining,
} from '@/store/selectors';
import type { Card } from '@/domain/card';

const T0 = 1_000_000;
const NOW = (msSinceStart: number) => T0 + msSinceStart;

const stateBase = {
  startedAt: T0,
  pausedAt: null as number | null,
  pausedAccumMs: 0,
  finished: false,
  config: { difficulty: 'intermediate', equipment: 'bodyweight', theme: 'full', cardio: false } as const,
  deck: [] as Card[],
  drawn: [] as Card[],
};

describe('selectors', () => {
  it('elapsed counts up while running', () => {
    expect(selectElapsedSec(stateBase, NOW(10_000))).toBe(10);
  });

  it('elapsed freezes while paused', () => {
    const s = { ...stateBase, pausedAt: NOW(5_000) };
    expect(selectElapsedSec(s, NOW(20_000))).toBe(5);
  });

  it('elapsed excludes prior paused time', () => {
    const s = { ...stateBase, pausedAccumMs: 3_000 };
    expect(selectElapsedSec(s, NOW(10_000))).toBe(7);
  });

  it('phase is stopwatch when no time limit', () => {
    expect(selectPhase(stateBase, NOW(10_000))).toBe('stopwatch');
  });

  it('phase is countdown before limit, overtime after', () => {
    const s = { ...stateBase, config: { ...stateBase.config, timeLimitMin: 1 } };
    expect(selectPhase(s, NOW(30_000))).toBe('countdown');
    expect(selectPhase(s, NOW(120_000))).toBe('overtime');
  });

  it('remaining and overtime', () => {
    const s = { ...stateBase, config: { ...stateBase.config, timeLimitMin: 1 } };
    expect(selectRemainingSec(s, NOW(20_000))).toBe(40);
    expect(selectOvertimeSec(s, NOW(90_000))).toBe(30);
  });

  it('ace interval scales by aces remaining when timed', () => {
    const aces: Card[] = [
      { type: 'ace', suit: 'hearts' },
      { type: 'ace', suit: 'spades' },
    ];
    const s = { ...stateBase, deck: aces, config: { ...stateBase.config, timeLimitMin: 6 } };
    // 6min / (2+1) = 120s
    expect(selectAceIntervalSec(s)).toBe(120);
  });

  it('ace interval falls back to 15min when unlimited', () => {
    expect(selectAceIntervalSec(stateBase)).toBe(15 * 60);
  });

  it('selectAcesRemaining counts only ace cards', () => {
    const deck: Card[] = [
      { type: 'ace', suit: 'hearts' },
      { type: 'number', suit: 'clubs', value: 5 },
      { type: 'ace', suit: 'diamonds' },
    ];
    expect(selectAcesRemaining({ ...stateBase, deck })).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/selectors.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement selectors**

```ts
// src/store/selectors.ts
import type { Card } from '@/domain/card';
import type { SetupConfig } from '@/domain/config';

type ClockState = {
  startedAt: number | null;
  pausedAt: number | null;
  pausedAccumMs: number;
};

type DeckState = {
  deck: Card[];
  config: SetupConfig;
};

type GameClockState = ClockState & DeckState;

export const selectElapsedSec = (s: ClockState, now: number): number => {
  if (!s.startedAt) return 0;
  const live = s.pausedAt ?? now;
  return Math.max(0, Math.floor((live - s.startedAt - s.pausedAccumMs) / 1000));
};

export type Phase = 'countdown' | 'overtime' | 'stopwatch';

export const selectPhase = (s: GameClockState, now: number): Phase => {
  if (s.config.timeLimitMin == null) return 'stopwatch';
  const elapsed = selectElapsedSec(s, now);
  return elapsed >= s.config.timeLimitMin * 60 ? 'overtime' : 'countdown';
};

export const selectRemainingSec = (s: GameClockState, now: number): number => {
  if (s.config.timeLimitMin == null) return 0;
  return Math.max(0, s.config.timeLimitMin * 60 - selectElapsedSec(s, now));
};

export const selectOvertimeSec = (s: GameClockState, now: number): number => {
  if (s.config.timeLimitMin == null) return 0;
  return Math.max(0, selectElapsedSec(s, now) - s.config.timeLimitMin * 60);
};

export const selectAcesRemaining = (s: DeckState): number =>
  s.deck.filter((c) => c.type === 'ace').length;

const FALLBACK_INTERVAL_SEC = 15 * 60;

export const selectAceIntervalSec = (s: DeckState): number => {
  const aces = selectAcesRemaining(s);
  if (s.config.timeLimitMin == null) return FALLBACK_INTERVAL_SEC;
  return (s.config.timeLimitMin * 60) / (aces + 1);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk pnpm vitest run tests/unit/selectors.test.ts`
Expected: PASS, 9/9.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/selectors.ts tests/unit/selectors.test.ts
rtk git commit -m "feat: pure selectors for elapsed/phase/remaining/overtime/ace interval"
```

---

## Task 5: Refactor `tick`, remove auto-finish on clock-zero

**Files:**
- Modify: `src/store/gameStore.ts` (`tick` action, fields)
- Modify: `src/hooks/useTimer.ts`
- Test: extend `tests/unit/gameStore.pause.test.ts` with tick-stop-on-pause

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/gameStore.pause.test.ts`:

```ts
describe('gameStore tick semantics', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('tick updates elapsedSec from pause-aware computation', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 1 });
    vi.advanceTimersByTime(20_000);
    useGameStore.getState().tick();
    expect(useGameStore.getState().elapsedSec).toBe(20);
  });

  it('tick does NOT auto-finish at clock-zero', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 1 });
    vi.advanceTimersByTime(120_000);
    useGameStore.getState().tick();
    expect(useGameStore.getState().finished).toBe(false);
    expect(useGameStore.getState().elapsedSec).toBe(120);
  });

  it('tick is no-op while paused', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    vi.advanceTimersByTime(5_000);
    useGameStore.getState().pause('user');
    vi.advanceTimersByTime(10_000);
    useGameStore.getState().tick();
    expect(useGameStore.getState().elapsedSec).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/gameStore.pause.test.ts`
Expected: FAIL — current tick auto-finishes at limit.

- [ ] **Step 3: Refactor tick**

In `src/store/gameStore.ts` replace `tick`:

```ts
import { selectElapsedSec } from './selectors';

// ...

tick: () => {
  const s = get();
  if (!s.startedAt || s.finished || s.pausedAt) return;
  const elapsedSec = selectElapsedSec(s, Date.now());
  if (elapsedSec === s.elapsedSec) return;
  set({ elapsedSec });
},
```

In `src/hooks/useTimer.ts` add `pausedAt` to dependencies:

```ts
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export const useTimer = () => {
  const tick = useGameStore((s) => s.tick);
  const finished = useGameStore((s) => s.finished);
  const startedAt = useGameStore((s) => s.startedAt);
  const pausedAt = useGameStore((s) => s.pausedAt);

  useEffect(() => {
    if (!startedAt || finished || pausedAt) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, finished, startedAt, pausedAt]);
};
```

- [ ] **Step 4: Run tests**

Run: `rtk pnpm vitest run tests/unit/gameStore.pause.test.ts`
Expected: PASS (all prior + 3 new).

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/gameStore.ts src/hooks/useTimer.ts tests/unit/gameStore.pause.test.ts
rtk git commit -m "feat: pause-aware tick; remove silent auto-finish at clock zero"
```

---

## Task 6: Endpoint refactor — `endReason`, `completedDeck`, deck-empty auto-finish

**Files:**
- Modify: `src/store/gameStore.ts` (state + `finish` + `drawNext` tail)
- Modify: `src/store/db.ts` (`SessionRow`, schema bump)
- Test: `tests/unit/gameStore.finish.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/gameStore.finish.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';
import type { Card } from '@/domain/card';

vi.mock('@/store/db', () => ({
  recordSession: vi.fn(async () => 1),
  saveLastConfig: vi.fn(async () => undefined),
}));

import { recordSession } from '@/store/db';

describe('gameStore finish', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    (recordSession as unknown as { mockClear: () => void }).mockClear();
  });

  it('manual finish records endReason=manual and completedDeck=false', async () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    vi.advanceTimersByTime(15_000);
    await useGameStore.getState().finish({ reason: 'manual', completedDeck: false });
    expect(useGameStore.getState().finished).toBe(true);
    expect(useGameStore.getState().endReason).toBe('manual');
    expect(useGameStore.getState().completedDeck).toBe(false);
    expect(recordSession).toHaveBeenCalledTimes(1);
    const arg = (recordSession as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
    expect(arg.endReason).toBe('manual');
    expect(arg.completedDeck).toBe(false);
  });

  it('drawNext on last card auto-finishes with endReason=deck completedDeck=true', async () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    const oneAce: Card = { type: 'ace', suit: 'hearts' };
    useGameStore.setState({ deck: [oneAce] });
    useGameStore.getState().drawNext();
    // give the awaited finish a tick
    await Promise.resolve();
    await Promise.resolve();
    expect(useGameStore.getState().finished).toBe(true);
    expect(useGameStore.getState().endReason).toBe('deck');
    expect(useGameStore.getState().completedDeck).toBe(true);
  });

  it('finish is idempotent', async () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    await useGameStore.getState().finish({ reason: 'manual', completedDeck: false });
    await useGameStore.getState().finish({ reason: 'manual', completedDeck: false });
    expect(recordSession).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/gameStore.finish.test.ts`
Expected: FAIL — `endReason`, `completedDeck`, and `finish({reason,...})` signature don't exist; deck-empty auto-finish missing.

- [ ] **Step 3: Modify db schema**

```ts
// src/store/db.ts — extend SessionRow and bump schema
export type EndReason = 'deck' | 'manual';

export type SessionRow = {
  id?: number;
  startedAt: number;
  durationSec: number;
  drawnCount: number;
  config: SetupConfig;
  endReason: EndReason;
  completedDeck: boolean;
};

class SweatDeckDb extends Dexie {
  configs!: Table<ConfigRow, 'last'>;
  sessions!: Table<SessionRow, number>;
  meta!: Table<MetaRow, MetaRow['key']>;

  constructor() {
    super('sweat-deck');
    this.version(1).stores({
      configs: 'id',
      sessions: '++id, startedAt',
    });
    this.version(2).stores({
      configs: 'id',
      sessions: '++id, startedAt',
      meta: 'key',
    });
    this.version(3).stores({
      configs: 'id',
      sessions: '++id, startedAt',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('sessions').toCollection().modify((row: SessionRow) => {
        if (row.endReason == null) row.endReason = 'manual';
        if (row.completedDeck == null) row.completedDeck = false;
      });
    });
  }
}
```

- [ ] **Step 4: Modify store fields and finish()**

In `src/store/gameStore.ts`:

Add to `GameState`:

```ts
endReason: 'deck' | 'manual' | null;
completedDeck: boolean;
```

Update `makeInitialState` accordingly (`endReason: null, completedDeck: false`).

Replace `finish` action:

```ts
finish: async ({ reason, completedDeck }) => {
  const s = get();
  if (s.finished || !s.startedAt) return;
  const durationSec = Math.floor(
    ((s.pausedAt ?? Date.now()) - s.startedAt - s.pausedAccumMs) / 1000
  );
  set({
    finished: true,
    elapsedSec: durationSec,
    endReason: reason,
    completedDeck,
  });
  await recordSession({
    startedAt: s.startedAt,
    durationSec,
    drawnCount: s.drawn.length,
    config: s.config,
    endReason: reason,
    completedDeck,
  });
},
```

Update `GameActions['finish']` signature:

```ts
finish: (args: { reason: 'deck' | 'manual'; completedDeck: boolean }) => Promise<void>;
```

Update `drawNext` tail to auto-finish on deck-empty:

```ts
drawNext: () => {
  const { deck, drawn, config, rng, finished, pausedAt } = get();
  if (finished || pausedAt || deck.length === 0) return;

  const result = draw({ remaining: deck, difficulty: config.difficulty, rng });
  const nextDrawn = [...drawn, result.card];
  const exercise =
    result.card.type === 'joker'
      ? pickJokerEffect({ history: drawn, rng }).exercise
      : resolve({ card: result.card, config });

  set({ deck: result.remaining, drawn: nextDrawn, current: exercise });

  if (result.remaining.length === 0) {
    void get().finish({ reason: 'deck', completedDeck: true });
  }
},
```

Update `Play.tsx` call site to pass new args (next task pulls everything together; for now adjust the only existing caller):

```ts
// src/routes/Play.tsx — handleFinish
const handleFinish = async () => {
  await finish({ reason: 'manual', completedDeck: false });
  navigate('/summary');
};
```

- [ ] **Step 5: Run tests**

Run: `rtk pnpm vitest run tests/unit/gameStore.finish.test.ts`
Expected: PASS, 3/3. Run full suite: `rtk pnpm vitest run`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/store/gameStore.ts src/store/db.ts src/routes/Play.tsx tests/unit/gameStore.finish.test.ts
rtk git commit -m "feat: endReason+completedDeck on finish; deck-empty auto-finish; db schema v3"
```

---

## Task 7: Ace pacing guards in `drawNext`

**Files:**
- Modify: `src/store/gameStore.ts` (`drawNext`, add `lastRestAtElapsedSec`, helpers)
- Modify: `src/domain/deck.ts` — add helper exports for guard sampling
- Test: `tests/unit/gameStore.acePacing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/gameStore.acePacing.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';
import type { Card } from '@/domain/card';

vi.mock('@/store/db', () => ({
  recordSession: vi.fn(async () => 1),
  saveLastConfig: vi.fn(async () => undefined),
}));

const isAce = (c: Card) => c.type === 'ace';

describe('Ace pacing', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('no Ace in the first 15 draws (unlimited)', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: undefined });
    for (let i = 0; i < 15; i++) {
      useGameStore.getState().drawNext();
      const last = useGameStore.getState().drawn.at(-1)!;
      expect(last.type).not.toBe('ace');
      vi.advanceTimersByTime(1_000);
    }
  });

  it('respects soft floor (no Ace within 0.7× interval after a rest)', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 60 });
    // Force a state with one Ace already taken at elapsed=0
    useGameStore.setState({
      drawn: Array.from({ length: 16 }, (_, i) => ({
        type: 'number', suit: 'hearts', value: 5,
      })) as Card[],
      lastRestAtElapsedSec: 0,
    });
    // intervalSec = (60*60) / (acesRemainingInDeck + 1)
    // soft floor = 0.7 * intervalSec; advance under that
    vi.advanceTimersByTime(30_000);
    useGameStore.getState().tick();
    // Force draw pool to start with an Ace by stubbing deck order
    const aceFirst: Card[] = [
      { type: 'ace', suit: 'hearts' },
      { type: 'number', suit: 'clubs', value: 5 },
      { type: 'number', suit: 'diamonds', value: 6 },
    ];
    useGameStore.setState({ deck: aceFirst });
    useGameStore.getState().drawNext();
    expect(useGameStore.getState().drawn.at(-1)!.type).not.toBe('ace');
  });

  it('forces an Ace once interval elapses and 15-card floor is past', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 1 });
    // 16 number cards drawn already
    useGameStore.setState({
      drawn: Array.from({ length: 16 }, () => ({
        type: 'number', suit: 'hearts', value: 5,
      })) as Card[],
      lastRestAtElapsedSec: 0,
      deck: [
        { type: 'number', suit: 'clubs', value: 5 },
        { type: 'ace', suit: 'spades' },
      ],
    });
    // advance well past intervalSec so force-promotion triggers
    vi.advanceTimersByTime(120_000);
    useGameStore.getState().tick();
    useGameStore.getState().drawNext();
    expect(useGameStore.getState().drawn.at(-1)!.type).toBe('ace');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/gameStore.acePacing.test.ts`
Expected: FAIL — `lastRestAtElapsedSec` and pacing logic do not exist.

- [ ] **Step 3: Implement guards**

In `src/domain/deck.ts` export helpers:

```ts
export const drawNonAce = ({ remaining, difficulty, rng }: DrawArgs): DrawResult | null => {
  const nonAce = remaining.filter((c) => c.type !== 'ace');
  if (nonAce.length === 0) return null;
  const sub = draw({ remaining: nonAce, difficulty, rng });
  // Map back to remaining (preserve original deck order minus drawn card)
  const idx = remaining.indexOf(sub.card);
  return { card: sub.card, remaining: removeAt(remaining, idx) };
};

export const promoteToAce = (remaining: Card[]): { ace: Card; remaining: Card[] } | null => {
  const idx = remaining.findIndex((c) => c.type === 'ace');
  if (idx === -1) return null;
  const ace = remaining[idx]!;
  return { ace, remaining: removeAt(remaining, idx) };
};
```

(`removeAt` is currently file-local; either export it or duplicate the 3-line splice helper inside the new functions.)

In `src/store/gameStore.ts`:

Add field `lastRestAtElapsedSec: number` to `GameState`, init `0` in `makeInitialState`. Reset in `start`.

Replace `drawNext`:

```ts
import { drawNonAce, promoteToAce } from '@/domain/deck';
import { selectAceIntervalSec, selectElapsedSec } from './selectors';

// ...

drawNext: () => {
  const s = get();
  if (s.finished || s.pausedAt || s.deck.length === 0) return;

  const elapsedSec = selectElapsedSec(s, Date.now());
  const intervalSec = selectAceIntervalSec(s);
  const sinceRest = elapsedSec - s.lastRestAtElapsedSec;
  const cardsDrawn = s.drawn.length;

  let result = draw({ remaining: s.deck, difficulty: s.config.difficulty, rng: s.rng });
  let nextLastRest = s.lastRestAtElapsedSec;

  // Ace soft-floor / 15-card floor: reject and resample non-ace
  if (result.card.type === 'ace') {
    const blockedByFloor = cardsDrawn < 15;
    const blockedByCooldown = sinceRest < intervalSec * 0.7;
    if (blockedByFloor || blockedByCooldown) {
      const alt = drawNonAce({ remaining: s.deck, difficulty: s.config.difficulty, rng: s.rng });
      if (alt) result = alt;
    } else {
      nextLastRest = elapsedSec;
    }
  } else if (
    cardsDrawn >= 15 &&
    sinceRest >= intervalSec &&
    s.deck.some((c) => c.type === 'ace')
  ) {
    // Force-promote: swap drawn non-ace for an Ace, return non-ace to deck
    const restored = [result.card, ...result.remaining];
    const promoted = promoteToAce(restored);
    if (promoted) {
      result = { card: promoted.ace, remaining: promoted.remaining };
      nextLastRest = elapsedSec;
    }
  }

  const exercise =
    result.card.type === 'joker'
      ? pickJokerEffect({ history: s.drawn, rng: s.rng }).exercise
      : resolve({ card: result.card, config: s.config });

  set({
    deck: result.remaining,
    drawn: [...s.drawn, result.card],
    current: exercise,
    lastRestAtElapsedSec: nextLastRest,
  });

  if (result.remaining.length === 0) {
    void get().finish({ reason: 'deck', completedDeck: true });
  }
},
```

- [ ] **Step 4: Run tests**

Run: `rtk pnpm vitest run tests/unit/gameStore.acePacing.test.ts tests/unit/gameStore.finish.test.ts tests/unit/deck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/gameStore.ts src/domain/deck.ts tests/unit/gameStore.acePacing.test.ts
rtk git commit -m "feat: Ace pacing guards (15-card floor, 0.7x soft floor, force ceiling)"
```

---

## Task 8: Visibility-driven auto-pause hook

**Files:**
- Create: `src/hooks/useVisibilityPause.ts`
- Test: `tests/unit/useVisibilityPause.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/useVisibilityPause.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';
import { useVisibilityPause } from '@/hooks/useVisibilityPause';

const fireVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useVisibilityPause', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('hidden → pause(visibility); visible → resume', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    renderHook(() => useVisibilityPause());

    fireVisibility('hidden');
    expect(useGameStore.getState().pausedBy).toBe('visibility');
    expect(useGameStore.getState().pausedAt).not.toBeNull();

    fireVisibility('visible');
    expect(useGameStore.getState().pausedAt).toBeNull();
  });

  it('does NOT auto-resume if pause was user-initiated', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    renderHook(() => useVisibilityPause());

    useGameStore.getState().pause('user');
    fireVisibility('hidden');
    fireVisibility('visible');
    expect(useGameStore.getState().pausedAt).not.toBeNull();
    expect(useGameStore.getState().pausedBy).toBe('user');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/useVisibilityPause.test.ts`
Expected: FAIL — hook not implemented.

- [ ] **Step 3: Implement hook**

```ts
// src/hooks/useVisibilityPause.ts
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export const useVisibilityPause = () => {
  useEffect(() => {
    const onChange = () => {
      const s = useGameStore.getState();
      if (document.visibilityState === 'hidden') {
        if (!s.pausedAt && !s.finished && s.startedAt) s.pause('visibility');
      } else if (document.visibilityState === 'visible') {
        if (s.pausedAt && s.pausedBy === 'visibility') s.resume();
      }
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
};
```

- [ ] **Step 4: Run test**

Run: `rtk pnpm vitest run tests/unit/useVisibilityPause.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useVisibilityPause.ts tests/unit/useVisibilityPause.test.ts
rtk git commit -m "feat: visibility-driven auto pause/resume hook"
```

---

## Task 9: Phase-aware Timer component

**Files:**
- Modify: `src/components/Timer.tsx`
- Test: extend or create `tests/unit/Timer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/Timer.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timer } from '@/components/Timer';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('Timer', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('renders countdown when timeLimitMin set and elapsed < limit', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 1 });
    vi.advanceTimersByTime(20_000);
    useGameStore.getState().tick();
    render(<Timer />);
    // 60 - 20 = 40s → "0:40"
    expect(screen.getByLabelText(/remaining/i).textContent).toContain('0:40');
  });

  it('renders overtime with leading + when elapsed > limit', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: 1 });
    vi.advanceTimersByTime(75_000);
    useGameStore.getState().tick();
    render(<Timer />);
    expect(screen.getByLabelText(/overtime/i).textContent).toMatch(/^\+0:15/);
  });

  it('renders stopwatch when no time limit', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, timeLimitMin: undefined });
    vi.advanceTimersByTime(33_000);
    useGameStore.getState().tick();
    render(<Timer />);
    expect(screen.getByLabelText(/elapsed/i).textContent).toContain('0:33');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/Timer.test.tsx`
Expected: FAIL — Timer always shows elapsed.

- [ ] **Step 3: Update Timer component**

```tsx
// src/components/Timer.tsx
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';
import {
  selectPhase,
  selectRemainingSec,
  selectOvertimeSec,
  selectElapsedSec,
} from '@/store/selectors';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const Timer = () => {
  useTimer();
  const state = useGameStore();
  const now = Date.now();
  const phase = selectPhase(state, now);

  if (phase === 'countdown') {
    const remaining = selectRemainingSec(state, now);
    return (
      <time
        className="text-deck-reward text-lg font-semibold tabular-nums tracking-tight"
        aria-label="Remaining session time"
      >
        {fmt(remaining)}
      </time>
    );
  }

  if (phase === 'overtime') {
    const over = selectOvertimeSec(state, now);
    return (
      <time
        className="text-destructive text-lg font-semibold tabular-nums tracking-tight motion-safe:animate-pulse"
        aria-label="Overtime past time limit"
      >
        +{fmt(over)}
      </time>
    );
  }

  const elapsed = selectElapsedSec(state, now);
  return (
    <time
      className="text-deck-reward text-lg font-semibold tabular-nums tracking-tight"
      aria-label="Elapsed session time"
    >
      {fmt(elapsed)}
    </time>
  );
};
```

- [ ] **Step 4: Run tests**

Run: `rtk pnpm vitest run tests/unit/Timer.test.tsx`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/Timer.tsx tests/unit/Timer.test.tsx
rtk git commit -m "feat: phase-aware Timer (countdown/overtime/stopwatch)"
```

---

## Task 10: PauseButton + PausedOverlay

**Files:**
- Create: `src/components/PauseButton.tsx`
- Create: `src/components/PausedOverlay.tsx`
- Test: `tests/unit/Paused.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/Paused.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PauseButton } from '@/components/PauseButton';
import { PausedOverlay } from '@/components/PausedOverlay';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('Pause UI', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  it('PauseButton calls pause("user") on click', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    render(<PauseButton />);
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(useGameStore.getState().pausedBy).toBe('user');
  });

  it('PausedOverlay renders only when pausedAt is set', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    const { rerender } = render(
      <MemoryRouter><PausedOverlay /></MemoryRouter>
    );
    expect(screen.queryByText(/paused/i)).toBeNull();
    useGameStore.getState().pause('user');
    rerender(<MemoryRouter><PausedOverlay /></MemoryRouter>);
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });

  it('Resume button clears pausedAt', () => {
    useGameStore.getState().start(DEFAULT_CONFIG);
    useGameStore.getState().pause('user');
    render(<MemoryRouter><PausedOverlay /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(useGameStore.getState().pausedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/Paused.test.tsx`
Expected: FAIL — components don't exist.

- [ ] **Step 3: Implement PauseButton**

```tsx
// src/components/PauseButton.tsx
import { Pause } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export const PauseButton = () => {
  const pause = useGameStore((s) => s.pause);
  const pausedAt = useGameStore((s) => s.pausedAt);
  const finished = useGameStore((s) => s.finished);
  if (pausedAt || finished) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => pause('user')}
      aria-label="Pause"
    >
      <Pause className="size-5" aria-hidden />
    </Button>
  );
};
```

- [ ] **Step 4: Implement PausedOverlay**

```tsx
// src/components/PausedOverlay.tsx
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export const PausedOverlay = () => {
  const navigate = useNavigate();
  const pausedAt = useGameStore((s) => s.pausedAt);
  const resume = useGameStore((s) => s.resume);
  const finish = useGameStore((s) => s.finish);

  const handleFinish = async () => {
    await finish({ reason: 'manual', completedDeck: false });
    navigate('/summary');
  };

  return (
    <AnimatePresence>
      {pausedAt && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
        >
          <div className="text-center">
            <p className="ui-kicker tracking-[0.18em]">Take a breath</p>
            <h2 className="mt-2 text-4xl font-bold">Paused</h2>
          </div>
          <div className="flex gap-3">
            <Button onClick={resume} className="min-h-11 px-8">Resume</Button>
            <Button onClick={handleFinish} variant="secondary" className="min-h-11 px-8">
              Finish
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 5: Run tests**

Run: `rtk pnpm vitest run tests/unit/Paused.test.tsx`
Expected: PASS, 3/3.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/PauseButton.tsx src/components/PausedOverlay.tsx tests/unit/Paused.test.tsx
rtk git commit -m "feat: pause button + paused overlay"
```

---

## Task 11: DifficultyBadge + DifficultySheet

**Files:**
- Create: `src/components/DifficultyBadge.tsx`
- Create: `src/components/DifficultySheet.tsx`
- Test: `tests/unit/DifficultyBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/DifficultyBadge.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('DifficultyBadge', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('renders the difficulty label from config', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, difficulty: 'hell' });
    render(<DifficultyBadge />);
    expect(screen.getByRole('button', { name: /difficulty: hell/i })).toBeInTheDocument();
    expect(screen.getByText(/hell/i)).toBeInTheDocument();
  });

  it('opens a sheet with description and rep hint on click', () => {
    useGameStore.getState().start({ ...DEFAULT_CONFIG, difficulty: 'beginner' });
    render(<DifficultyBadge />);
    fireEvent.click(screen.getByRole('button', { name: /difficulty: beginner/i }));
    expect(screen.getByText(/build the habit/i)).toBeInTheDocument();
    expect(screen.getByText(/most: 2–4/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/DifficultyBadge.test.tsx`
Expected: FAIL — components don't exist.

- [ ] **Step 3: Implement components**

```tsx
// src/components/DifficultySheet.tsx
import { DIFFICULTY_META } from '@/domain/difficultyMeta';
import type { Difficulty } from '@/domain/difficulty';

export const DifficultySheet = ({ difficulty }: { difficulty: Difficulty }) => {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <div className="space-y-3 p-4">
      <h3 className="text-2xl font-semibold">{meta.label}</h3>
      <p className="text-base text-muted-foreground">{meta.description}</p>
      <p className="text-sm font-medium tabular-nums">{meta.repHint}</p>
    </div>
  );
};
```

```tsx
// src/components/DifficultyBadge.tsx
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { DIFFICULTY_META, type DifficultyTone } from '@/domain/difficultyMeta';
import { DifficultySheet } from './DifficultySheet';

const TONE_CLASSES: Record<DifficultyTone, string> = {
  calm: 'bg-emerald-500/15 text-emerald-300',
  warm: 'bg-amber-500/15 text-amber-300',
  hot: 'bg-orange-500/20 text-orange-300',
  inferno: 'bg-red-500/20 text-red-300',
};

export const DifficultyBadge = () => {
  const difficulty = useGameStore((s) => s.config.difficulty);
  const [open, setOpen] = useState(false);
  const meta = DIFFICULTY_META[difficulty];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${TONE_CLASSES[meta.tone]}`}
        aria-label={`Difficulty: ${meta.label}`}
        aria-expanded={open}
      >
        {meta.label}
      </button>
      {open && (
        <div
          className="absolute inset-x-4 top-20 z-40 rounded-lg border border-border/60 bg-card shadow-lg"
          role="dialog"
          aria-label="Difficulty info"
        >
          <DifficultySheet difficulty={difficulty} />
        </div>
      )}
    </>
  );
};
```

(Plain disclosure for now — if the project already uses a Sheet/Drawer primitive, swap later.)

- [ ] **Step 4: Run tests**

Run: `rtk pnpm vitest run tests/unit/DifficultyBadge.test.tsx`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/DifficultyBadge.tsx src/components/DifficultySheet.tsx tests/unit/DifficultyBadge.test.tsx
rtk git commit -m "feat: difficulty badge + info sheet"
```

---

## Task 12: Enrich `DifficultyStep` with description + repHint

**Files:**
- Modify: `src/components/setup/DifficultyStep.tsx`
- Test: `tests/unit/DifficultyStep.test.tsx`

- [ ] **Step 1: Read current step**

Run: `rtk read src/components/setup/DifficultyStep.tsx`
Note: The step likely renders an OPTIONS array and uses `SetupOptionButton`. Adapt accordingly — the goal is each option shows label (existing), description, repHint.

- [ ] **Step 2: Write the failing test**

```tsx
// tests/unit/DifficultyStep.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DifficultyStep } from '@/components/setup/DifficultyStep';

describe('DifficultyStep', () => {
  it('shows description and repHint for every difficulty option', () => {
    render(<DifficultyStep value="intermediate" onChange={() => {}} />);
    expect(screen.getByText(/build the habit/i)).toBeInTheDocument();
    expect(screen.getByText(/most: 2–4/i)).toBeInTheDocument();
    expect(screen.getByText(/almost only 9s and 10s/i)).toBeInTheDocument();
    expect(screen.getByText(/most: 9–10/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/DifficultyStep.test.tsx`
Expected: FAIL — copy not present.

- [ ] **Step 4: Update the step**

Replace the local OPTIONS array with values pulled from `DIFFICULTY_META`, and pass `description` + `repHint` into the option button (adding props for them if needed). Only the option-rendering portion changes:

```tsx
// src/components/setup/DifficultyStep.tsx — adapt OPTIONS rendering
import { DIFFICULTY_META } from '@/domain/difficultyMeta';
import type { Difficulty } from '@/domain/difficulty';

const ORDER: Difficulty[] = ['beginner', 'intermediate', 'hard', 'advanced', 'hell'];

// In the render:
{ORDER.map((d) => {
  const meta = DIFFICULTY_META[d];
  return (
    <SetupOptionButton
      key={d}
      selected={value === d}
      onClick={() => onChange(d)}
      label={meta.label}
      description={meta.description}
      hint={meta.repHint}
    />
  );
})}
```

If `SetupOptionButton` doesn't accept `hint`, add it:

```tsx
// src/components/setup/SetupOptionButton.tsx — extend props
type Props = {
  label: string;
  description?: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
};

// Inside JSX, render hint below description:
{hint && <p className="mt-1 text-xs tabular-nums text-deck-reward">{hint}</p>}
```

- [ ] **Step 5: Run tests**

Run: `rtk pnpm vitest run tests/unit/DifficultyStep.test.tsx tests/unit/SetupWizard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/setup/DifficultyStep.tsx src/components/setup/SetupOptionButton.tsx tests/unit/DifficultyStep.test.tsx
rtk git commit -m "feat: difficulty step shows description and rep hint"
```

---

## Task 13: Summary kudos buckets + celebration

**Files:**
- Create: `src/lib/summaryKudos.ts`
- Modify: `src/routes/Summary.tsx`
- Test: `tests/unit/summaryKudos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/summaryKudos.test.ts
import { describe, it, expect } from 'vitest';
import { pickKudos } from '@/lib/summaryKudos';

describe('summary kudos', () => {
  it('hell + completedDeck → big victory copy', () => {
    const k = pickKudos({ difficulty: 'hell', completedDeck: true, overtime: false, seed: 1 });
    expect(k.headline.toLowerCase()).toMatch(/hell|finished|deck/);
  });

  it('beginner + manual → encouraging copy', () => {
    const k = pickKudos({ difficulty: 'beginner', completedDeck: false, overtime: false, seed: 1 });
    expect(k.headline.length).toBeGreaterThan(0);
    expect(k.body.length).toBeGreaterThan(0);
  });

  it('any + overtime → past-the-bell line', () => {
    const k = pickKudos({ difficulty: 'intermediate', completedDeck: false, overtime: true, seed: 1 });
    expect(k.body.toLowerCase()).toMatch(/bell|extra|over/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/summaryKudos.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement kudos**

```ts
// src/lib/summaryKudos.ts
import type { Difficulty } from '@/domain/difficulty';

export type Kudos = { headline: string; body: string };

type Args = {
  difficulty: Difficulty;
  completedDeck: boolean;
  overtime: boolean;
  seed: number;
};

const pickFrom = <T>(arr: T[], seed: number): T => arr[seed % arr.length]!;

const COMPLETED_DECK: Record<Difficulty, string[]> = {
  beginner: ['You finished the deck — every card.'],
  intermediate: ['Whole deck, done. Steady work.'],
  hard: ['54 cards down. Big day.'],
  advanced: ['Full deck on Advanced — that is no small thing.'],
  hell: ['You finished the deck. On Hell. That is a flex.'],
};

const MANUAL: Record<Difficulty, string[]> = {
  beginner: ['Start somewhere — you started today.'],
  intermediate: ['Honest grind. Same time tomorrow?'],
  hard: ['That was real work.'],
  advanced: ['No flinching. Strong session.'],
  hell: ['You picked the hardest setting and showed up.'],
};

const OVERTIME_BODIES = [
  'You went past the bell. Bonus round.',
  'Overtime earned, not asked for.',
  'Extra rounds. The clock ran out — you didn’t.',
];

export const pickKudos = ({ difficulty, completedDeck, overtime, seed }: Args): Kudos => {
  const headlinePool = completedDeck ? COMPLETED_DECK[difficulty] : MANUAL[difficulty];
  const headline = pickFrom(headlinePool, seed);
  const body = overtime ? pickFrom(OVERTIME_BODIES, seed) : '';
  return { headline, body };
};
```

- [ ] **Step 4: Wire into Summary**

```tsx
// src/routes/Summary.tsx — replace existing kudos block (look for KUDOS array)
import { pickKudos } from '@/lib/summaryKudos';
import { useGameStore } from '@/store/gameStore';
import { DIFFICULTY_META } from '@/domain/difficultyMeta';

// Inside the component:
const config = useGameStore((s) => s.config);
const completedDeck = useGameStore((s) => s.completedDeck);
const elapsedSec = useGameStore((s) => s.elapsedSec);
const limitSec = config.timeLimitMin ? config.timeLimitMin * 60 : null;
const overtime = limitSec != null && elapsedSec > limitSec;
const kudos = pickKudos({
  difficulty: config.difficulty,
  completedDeck,
  overtime,
  seed: elapsedSec, // deterministic per-session
});
const meta = DIFFICULTY_META[config.difficulty];

// In JSX render headline + body, plus a difficulty stat row using meta.label / meta.tone.
```

- [ ] **Step 5: Run tests**

Run: `rtk pnpm vitest run tests/unit/summaryKudos.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/summaryKudos.ts src/routes/Summary.tsx tests/unit/summaryKudos.test.ts
rtk git commit -m "feat: summary celebration via kudos buckets keyed by difficulty/completion/overtime"
```

---

## Task 14: Wizard seam — harden `start()` + `/play` route guard

**Files:**
- Modify: `src/store/gameStore.ts` (`start` validation)
- Modify: `src/routes/Play.tsx` (route guard)
- Test: `tests/unit/gameStore.start.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/gameStore.start.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('gameStore start', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('start resets every new field', () => {
    useGameStore.setState({
      pausedAt: 999,
      pausedAccumMs: 12_345,
      pausedBy: 'user',
      lastRestAtElapsedSec: 42,
      finished: true,
      endReason: 'manual',
      completedDeck: true,
      elapsedSec: 99,
      drawn: [{ type: 'ace', suit: 'hearts' }],
    });
    useGameStore.getState().start(DEFAULT_CONFIG);
    const s = useGameStore.getState();
    expect(s.pausedAt).toBeNull();
    expect(s.pausedAccumMs).toBe(0);
    expect(s.pausedBy).toBeNull();
    expect(s.lastRestAtElapsedSec).toBe(0);
    expect(s.finished).toBe(false);
    expect(s.endReason).toBeNull();
    expect(s.completedDeck).toBe(false);
    expect(s.elapsedSec).toBe(0);
    expect(s.drawn).toEqual([]);
    expect(s.deck.length).toBe(54);
    expect(s.startedAt).not.toBeNull();
  });

  it('start throws on invalid config', () => {
    const bad = { ...DEFAULT_CONFIG, difficulty: undefined } as never;
    expect(() => useGameStore.getState().start(bad)).toThrow(/difficulty/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pnpm vitest run tests/unit/gameStore.start.test.ts`
Expected: FAIL — no validation, possibly some fields not reset.

- [ ] **Step 3: Harden `start`**

```ts
// src/store/gameStore.ts
start: (config) => {
  if (!config.difficulty) throw new Error('start: missing difficulty');
  if (!config.equipment) throw new Error('start: missing equipment');
  if (!config.theme) throw new Error('start: missing theme');
  void saveLastConfig(config);
  set({
    ...makeInitialState(),
    config,
    deck: build54(),
    startedAt: Date.now(),
    rng: createRng(Date.now()),
  });
},
```

`makeInitialState` must zero every new field (verify): `pausedAt: null, pausedAccumMs: 0, pausedBy: null, lastRestAtElapsedSec: 0, endReason: null, completedDeck: false, elapsedSec: 0`.

- [ ] **Step 4: Add route guard to Play**

```tsx
// src/routes/Play.tsx — at top of component
import { Navigate } from 'react-router-dom';

const startedAt = useGameStore((s) => s.startedAt);
if (!startedAt) return <Navigate to="/setup" replace />;
```

- [ ] **Step 5: Run tests**

Run: `rtk pnpm vitest run tests/unit/gameStore.start.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 6: Commit**

```bash
rtk git add src/store/gameStore.ts src/routes/Play.tsx tests/unit/gameStore.start.test.ts
rtk git commit -m "feat: harden start() validation and add /play route guard"
```

---

## Task 15: Play.tsx integration + E2E

**Files:**
- Modify: `src/routes/Play.tsx`
- Modify: `tests/e2e/play.spec.ts`

- [ ] **Step 1: Wire components and hook**

```tsx
// src/routes/Play.tsx — header section (keep existing motion/layout)
import { Timer } from '@/components/Timer';
import { PauseButton } from '@/components/PauseButton';
import { PausedOverlay } from '@/components/PausedOverlay';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { useVisibilityPause } from '@/hooks/useVisibilityPause';

// Inside component:
useVisibilityPause();

// In JSX header (between title and actions):
<div className="flex items-center gap-3">
  <DifficultyBadge />
  <Timer />
  <PauseButton />
</div>

// Render <PausedOverlay /> at the end of <main>.

// Update Deck onDraw to early-return if paused (already enforced in store).
```

- [ ] **Step 2: Add/extend Playwright E2E**

```ts
// tests/e2e/play.spec.ts — add cases (keep existing draw-5 smoke)
import { test, expect } from '@playwright/test';

test('countdown flips to overtime past time limit', async ({ page }) => {
  // Pre-seed config to a 1-min limit via Dexie addInitScript? See existing setup.
  // ... project-specific setup. Then:
  await page.goto('/play');
  await expect(page.getByLabel(/remaining session time/i)).toBeVisible();
  // Speed: use page.clock.fastForward if available, else verify display shape.
});

test('pause button shows paused overlay with resume action', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: /pause/i }).click();
  await expect(page.getByRole('dialog', { name: /paused/i })).toBeVisible();
  await page.getByRole('button', { name: /resume/i }).click();
  await expect(page.getByRole('dialog', { name: /paused/i })).not.toBeVisible();
});

test('deck-empty triggers Summary celebration', async ({ page }) => {
  // Drain the deck quickly via repeated draws or test hook; assert /summary URL
  // and that headline contains kudos copy.
});
```

(Detailed Playwright wiring depends on existing harness in `tests/e2e/play.spec.ts`. Read it first and pattern-match — do not invent setup.)

- [ ] **Step 3: Run unit + e2e**

Run: `rtk pnpm vitest run` then `rtk pnpm playwright test`
Expected: all green.

- [ ] **Step 4: Manual smoke in browser**

Run: `rtk pnpm dev`
Verify: setup → countdown ticks down → pause works → backgrounding tab pauses, returning resumes → at 0:00 timer flips to red `+0:01` overtime → Finish lands on Summary celebration.

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/Play.tsx tests/e2e/play.spec.ts
rtk git commit -m "feat: integrate timer/pause/badge/overlay/visibility into Play; e2e coverage"
```

---

## Done criteria

- [ ] All 15 task commits land green on `rtk pnpm vitest run` and `rtk pnpm playwright test`
- [ ] Manual flow: timed game → pause → overtime → manual finish → summary kudos correct
- [ ] Manual flow: unlimited game → drain deck → auto-finish with completedDeck celebration
- [ ] Manual flow: tab hide/show auto-pauses and resumes; user pause survives focus return
- [ ] Distribution histogram test stays green for all 5 difficulties
- [ ] No `// TODO`, no `any`, no commented-out code introduced
