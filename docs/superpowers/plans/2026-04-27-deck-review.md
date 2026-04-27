# Deck Review & Exercise Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a `/review` route between Setup and Play that lets the user swap any of the 7 exercise slots before the game begins.

**Architecture:** Thin domain layer (`plan.ts` + mappings alts) feeds a store slice (overrides) that `resolve()` reads at draw time. Review UI is a standalone route with a per-card inline alt picker.

**Tech Stack:** React 19, Vite 8, TypeScript, Zustand, Framer Motion, Lingui (t/Trans macros), Tailwind v4, Vitest, Playwright.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/domain/mappings.ts` | Add `alts?` to `SuitMovement` + `FaceChallenge` types; populate alt catalog |
| Create | `src/domain/plan.ts` | `SlotKey`, `PlanOverrides`, `PlanSlot`, `buildPlan` |
| Modify | `src/domain/exercise.ts` | Add `overrides?: PlanOverrides` to `resolve` |
| Modify | `src/store/gameStore.ts` | Add `overrides`, `setOverride`, `clearOverride`, `resetOverrides`; preserve overrides in `start` |
| Modify | `src/components/SetupWizard.tsx` | Final-step CTA navigates to `/review` instead of `/play`; remove shuffle |
| Modify | `src/App.tsx` | Register `/review` route |
| Create | `src/routes/Review.tsx` | Review page — grid of slots, sticky bar, shuffle → `/play` |
| Create | `src/components/review/ReviewCard.tsx` | Per-slot card with inline alt picker |
| Create | `tests/unit/plan.test.ts` | `buildPlan` unit tests |
| Modify | `tests/unit/exercise.test.ts` | Override behaviour tests |
| Create | `tests/unit/gameStore.test.ts` | Override store action tests |
| Modify | `tests/e2e/play.spec.ts` | Update `completeOnboardingAndSetup` helper to pass through `/review` |
| Create | `tests/e2e/review.spec.ts` | E2E review flow |

---

### Task 1: Extend mappings.ts — types + alt catalog

**Files:**
- Modify: `src/domain/mappings.ts`

- [ ] **Step 1: Update `SuitMovement` and `FaceChallenge` types**

Replace the two type definitions (lines 49 and 120-125 in the current file):

```ts
type SuitMovement = { id: MovementId; alts?: MovementId[] };

type FaceAlt = { id: FaceChallengeId; reps?: number; durationSec?: number; distanceM?: number };
type FaceChallenge = {
  id: FaceChallengeId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  alts?: FaceAlt[];
};
```

Export `FaceAlt` — it's needed by `plan.ts`:

```ts
export type FaceAlt = { id: FaceChallengeId; reps?: number; durationSec?: number; distanceM?: number };
```

- [ ] **Step 2: Populate alts in NUMBER_MOVEMENTS**

Add `alts` to each `SuitMovement` entry. Use only existing `MovementId` values — no new ids required. The constraint: alts must be appropriate for the same equipment tier as the slot.

Replace the `NUMBER_MOVEMENTS` constant with the version below (only the `alts` lines are new):

```ts
export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: { id: 'pushups', alts: ['pike-pushups'] },
      weights:    { id: 'dumbbell-floor-press', alts: ['dumbbell-press'] },
      gym:        { id: 'bench-press', alts: ['overhead-press'] },
    },
    diamonds: {
      bodyweight: { id: 'bodyweight-rows' },
      weights:    { id: 'dumbbell-rows', alts: ['renegade-rows'] },
      gym:        { id: 'pullups', alts: ['lat-pulldown'] },
    },
    clubs: {
      bodyweight: { id: 'jump-squats', alts: ['squats'] },
      weights:    { id: 'goblet-squats', alts: ['walking-lunges'] },
      gym:        { id: 'back-squats', alts: ['bulgarian-split-squats'] },
    },
    spades: {
      bodyweight: { id: 'glute-bridges', alts: ['lunges'] },
      weights:    { id: 'kettlebell-swings', alts: ['hip-thrusts'] },
      gym:        { id: 'romanian-deadlifts', alts: ['barbell-hip-thrusts'] },
    },
  },
  upper: {
    hearts: {
      bodyweight: { id: 'pushups', alts: ['pike-pushups'] },
      weights:    { id: 'dumbbell-press', alts: ['shoulder-press'] },
      gym:        { id: 'bench-press', alts: ['overhead-press'] },
    },
    diamonds: {
      bodyweight: { id: 'pullups', alts: ['bodyweight-rows'] },
      weights:    { id: 'dumbbell-rows', alts: ['renegade-rows'] },
      gym:        { id: 'lat-pulldown', alts: ['pullups', 'cable-rows'] },
    },
    clubs: {
      bodyweight: { id: 'pike-pushups', alts: ['pushups'] },
      weights:    { id: 'shoulder-press', alts: ['dumbbell-press'] },
      gym:        { id: 'overhead-press', alts: ['bench-press'] },
    },
    spades: {
      bodyweight: { id: 'plank-to-pushup' },
      weights:    { id: 'renegade-rows', alts: ['dumbbell-rows'] },
      gym:        { id: 'cable-rows', alts: ['lat-pulldown'] },
    },
  },
  lower: {
    hearts: {
      bodyweight: { id: 'lunges', alts: ['squats'] },
      weights:    { id: 'walking-lunges', alts: ['goblet-squats'] },
      gym:        { id: 'bulgarian-split-squats', alts: ['back-squats'] },
    },
    diamonds: {
      bodyweight: { id: 'squats', alts: ['jump-squats', 'lunges'] },
      weights:    { id: 'goblet-squats', alts: ['walking-lunges'] },
      gym:        { id: 'back-squats', alts: ['bulgarian-split-squats'] },
    },
    clubs: {
      bodyweight: { id: 'glute-bridges' },
      weights:    { id: 'hip-thrusts', alts: ['kettlebell-swings'] },
      gym:        { id: 'barbell-hip-thrusts', alts: ['romanian-deadlifts'] },
    },
    spades: {
      bodyweight: { id: 'calf-raises' },
      weights:    { id: 'weighted-calf-raises' },
      gym:        { id: 'standing-calf-raises' },
    },
  },
};
```

- [ ] **Step 3: Populate alts in FACE_CHALLENGES and FACE_CHALLENGES_CARDIO**

Replace the two face constants:

```ts
export const FACE_CHALLENGES: Record<FaceRank, Record<Equipment, FaceChallenge>> = {
  J: {
    bodyweight: { id: 'burpees', reps: 15, alts: [{ id: 'hollow-body-hold', durationSec: 45 }] },
    weights:    { id: 'thrusters', reps: 15, alts: [{ id: 'man-makers', reps: 10 }] },
    gym:        { id: 'wall-balls', reps: 15, alts: [{ id: 'thrusters', reps: 12 }] },
  },
  Q: {
    bodyweight: { id: 'hollow-body-hold', durationSec: 60, alts: [{ id: 'burpees', reps: 10 }] },
    weights:    { id: 'weighted-plank', durationSec: 60, alts: [{ id: 'man-makers', reps: 8 }] },
    gym:        { id: 'plank-hold', durationSec: 60, alts: [{ id: 'wall-balls', reps: 12 }] },
  },
  K: {
    bodyweight: { id: 'broad-jumps', reps: 20, alts: [{ id: 'burpees', reps: 15 }] },
    weights:    { id: 'man-makers', reps: 20, alts: [{ id: 'thrusters', reps: 15 }] },
    gym:        { id: 'heavy-sled-push', distanceM: 20, alts: [{ id: 'wall-balls', reps: 25 }] },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: { id: 'skierg', reps: 15, alts: [{ id: 'row', distanceM: 300 }] },
  Q: { id: 'battle-ropes', durationSec: 60, alts: [{ id: 'skierg', durationSec: 45 }] },
  K: { id: 'row', distanceM: 500, alts: [{ id: 'battle-ropes', durationSec: 90 }] },
};
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/domain/mappings.ts
rtk git commit -m "feat: add alts catalog to SuitMovement and FaceChallenge"
```

---

### Task 2: Create plan.ts (TDD)

**Files:**
- Create: `src/domain/plan.ts`
- Create: `tests/unit/plan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/plan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPlan } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('buildPlan', () => {
  it('returns exactly 7 slots in order: hearts diamonds clubs spades J Q K', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.key)).toEqual([
      'suit:hearts', 'suit:diamonds', 'suit:clubs', 'suit:spades',
      'face:J', 'face:Q', 'face:K',
    ]);
  });

  it('defaultExercise is the first option', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    for (const slot of slots) {
      expect(slot.options[0]).toEqual(slot.defaultExercise);
    }
  });

  it('selected equals default id when no overrides', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    for (const slot of slots) {
      expect(slot.selected).toBe(slot.defaultExercise.id);
    }
  });

  it('selected reflects a valid override', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': 'pike-pushups' } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('pike-pushups');
  });

  it('ignores an invalid override id not in options', () => {
    // 'bench-press' is a gym movement, invalid for bodyweight hearts
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': 'bench-press' } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('pushups');
  });

  it('number slots have reps: 0 placeholder', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    const numberSlots = slots.filter((s) => s.key.startsWith('suit:'));
    for (const slot of numberSlots) {
      expect(slot.defaultExercise.reps).toBe(0);
    }
  });

  it('face slots have actual prescription', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.defaultExercise.id).toBe('burpees');
    expect(j.defaultExercise.reps).toBe(15);
  });

  it('cardio=true changes face slot sources', () => {
    const slots = buildPlan({ config: { ...cfg, cardio: true }, overrides: {} });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.defaultExercise.id).toBe('skierg');
  });
});
```

- [ ] **Step 2: Run to verify all tests fail**

```bash
rtk vitest run tests/unit/plan.test.ts
```

Expected: all fail with "Cannot find module '@/domain/plan'".

- [ ] **Step 3: Implement plan.ts**

Create `src/domain/plan.ts`:

```ts
import type { Suit, FaceRank } from './card';
import type { SetupConfig } from './config';
import type { ExerciseId } from './exercise';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId } from './mappings';

export type SlotKey = `suit:${Suit}` | `face:${FaceRank}`;
export type PlanOverrides = Partial<Record<SlotKey, ExerciseId>>;

export type PlanSlot = {
  key: SlotKey;
  defaultExercise: { id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number };
  options: Array<{ id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number }>;
  selected: ExerciseId;
};

const SUIT_ORDER: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const FACE_ORDER: FaceRank[] = ['J', 'Q', 'K'];

export const buildPlan = ({
  config,
  overrides,
}: {
  config: SetupConfig;
  overrides: PlanOverrides;
}): PlanSlot[] => {
  const numberSlots: PlanSlot[] = SUIT_ORDER.map((suit) => {
    const key: SlotKey = `suit:${suit}`;
    const entry = NUMBER_MOVEMENTS[config.theme][suit][config.equipment];
    const defaultExercise = { id: entry.id as ExerciseId, reps: 0 };
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...(entry.alts ?? []).map((id: MovementId) => ({ id: id as ExerciseId, reps: 0 })),
    ];
    const validIds = new Set(options.map((o) => o.id));
    const override = overrides[key];
    const selected: ExerciseId = override && validIds.has(override) ? override : defaultExercise.id;
    return { key, defaultExercise, options, selected };
  });

  const faceSlots: PlanSlot[] = FACE_ORDER.map((rank) => {
    const key: SlotKey = `face:${rank}`;
    const entry = config.cardio
      ? FACE_CHALLENGES_CARDIO[rank]
      : FACE_CHALLENGES[rank][config.equipment];
    const { alts, ...rest } = entry as typeof entry & { alts?: unknown };
    const defaultExercise = { ...rest, id: entry.id as ExerciseId };
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...((entry.alts ?? []) as Array<{ id: string; reps?: number; durationSec?: number; distanceM?: number }>).map(
        (a) => ({ ...a, id: a.id as ExerciseId }),
      ),
    ];
    const validIds = new Set(options.map((o) => o.id));
    const override = overrides[key];
    const selectedOpt = override && validIds.has(override)
      ? options.find((o) => o.id === override)!
      : defaultExercise;
    return { key, defaultExercise, options, selected: selectedOpt.id };
  });

  return [...numberSlots, ...faceSlots];
};
```

- [ ] **Step 4: Run to verify all tests pass**

```bash
rtk vitest run tests/unit/plan.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/plan.ts tests/unit/plan.test.ts
rtk git commit -m "feat: add buildPlan domain function with TDD"
```

---

### Task 3: Extend exercise.ts with override support (TDD)

**Files:**
- Modify: `src/domain/exercise.ts`
- Modify: `tests/unit/exercise.test.ts`

- [ ] **Step 1: Add override test cases to exercise.test.ts**

Append to `tests/unit/exercise.test.ts`:

```ts
import type { PlanOverrides } from '@/domain/plan';

describe('resolve with overrides', () => {
  it('applies a number-card override and preserves reps from card value', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'pike-pushups' };
    const ex = resolve({
      card: { type: 'number', suit: 'hearts', value: 9 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('pike-pushups');
    expect(ex.reps).toBe(9);
  });

  it('ignores a number-card override when id is not in the slot options', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'bench-press' }; // gym, not bodyweight
    const ex = resolve({
      card: { type: 'number', suit: 'hearts', value: 5 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('pushups');
  });

  it('applies a face-card override with its own prescription', () => {
    const overrides: PlanOverrides = { 'face:J': 'hollow-body-hold' };
    const ex = resolve({
      card: { type: 'face', suit: 'clubs', rank: 'J' },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('hollow-body-hold');
    expect(ex.durationSec).toBe(45); // from alt definition in FACE_CHALLENGES
    expect(ex.reps).toBeUndefined();
  });

  it('ignores overrides for aces', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'pike-pushups' };
    const ex = resolve({
      card: { type: 'ace', suit: 'hearts' },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('water-break');
  });

  it('ignores overrides for jokers', () => {
    const overrides: PlanOverrides = { 'face:J': 'hollow-body-hold' };
    const ex = resolve({
      card: { type: 'joker', id: 1 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('max-effort-leg-burnout');
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
rtk vitest run tests/unit/exercise.test.ts
```

Expected: original 5 tests pass; new 5 tests fail with TypeScript or runtime errors.

- [ ] **Step 3: Update resolve in exercise.ts**

Replace the content of `src/domain/exercise.ts`:

```ts
import type { Card } from './card';
import type { SetupConfig } from './config';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId, FaceChallengeId } from './mappings';
import type { PlanOverrides } from './plan';

export type ExerciseId = MovementId | FaceChallengeId | 'water-break' | JokerExerciseId;

export type JokerExerciseId =
  | 'max-effort-leg-burnout'
  | 'sudden-death-50-burpees'
  | 'sudden-death-100m-sprint'
  | 'sudden-death-500m-skierg'
  | 'double-up';

export type Exercise = {
  id: ExerciseId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type ResolveArgs = { card: Card; config: SetupConfig; overrides?: PlanOverrides };

export const resolve = ({ card, config, overrides }: ResolveArgs): Exercise => {
  if (card.type === 'ace') return { id: 'water-break', durationSec: 60 };

  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    const validIds: ExerciseId[] = [movement.id, ...(movement.alts ?? [])];
    const ov = overrides?.[`suit:${card.suit}`];
    const id = ov && (validIds as string[]).includes(ov) ? (ov as ExerciseId) : movement.id;
    return { id, reps: card.value };
  }

  if (card.type === 'face') {
    const src = config.cardio
      ? FACE_CHALLENGES_CARDIO[card.rank]
      : FACE_CHALLENGES[card.rank][config.equipment];
    const { alts, ...srcRest } = src as typeof src & { alts?: unknown };
    const ov = overrides?.[`face:${card.rank}`];
    if (ov) {
      const altEntry = (src.alts ?? []).find((a) => a.id === ov);
      if (altEntry) {
        const { id, reps, durationSec, distanceM } = altEntry;
        return { id: id as ExerciseId, reps, durationSec, distanceM };
      }
    }
    return { ...srcRest, id: src.id as ExerciseId };
  }

  return { id: 'max-effort-leg-burnout' };
};
```

- [ ] **Step 4: Run all unit tests to verify pass**

```bash
rtk vitest run tests/unit/exercise.test.ts
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/exercise.ts tests/unit/exercise.test.ts
rtk git commit -m "feat: resolve() accepts PlanOverrides for number and face cards"
```

---

### Task 4: Add override state to gameStore (TDD)

**Files:**
- Modify: `src/store/gameStore.ts`
- Create: `tests/unit/gameStore.test.ts`

- [ ] **Step 1: Write failing gameStore override tests**

Create `tests/unit/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('override actions', () => {
  it('overrides starts empty', () => {
    expect(useGameStore.getState().overrides).toEqual({});
  });

  it('setOverride stores a key/id pair', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    expect(useGameStore.getState().overrides['suit:hearts']).toBe('pike-pushups');
  });

  it('clearOverride removes a single key', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    useGameStore.getState().setOverride('face:J', 'hollow-body-hold');
    useGameStore.getState().clearOverride('suit:hearts');
    expect(useGameStore.getState().overrides['suit:hearts']).toBeUndefined();
    expect(useGameStore.getState().overrides['face:J']).toBe('hollow-body-hold');
  });

  it('resetOverrides clears all keys', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    useGameStore.getState().setOverride('face:K', 'burpees');
    useGameStore.getState().resetOverrides();
    expect(useGameStore.getState().overrides).toEqual({});
  });

  it('start() preserves overrides set before it is called', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    useGameStore.getState().start({
      difficulty: 'intermediate',
      equipment: 'bodyweight',
      theme: 'full',
      cardio: false,
    });
    expect(useGameStore.getState().overrides['suit:hearts']).toBe('pike-pushups');
  });

  it('reset() clears overrides', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    useGameStore.getState().reset();
    expect(useGameStore.getState().overrides).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify all fail**

```bash
rtk vitest run tests/unit/gameStore.test.ts
```

Expected: fails — `overrides` property not found and actions don't exist.

- [ ] **Step 3: Add override state to gameStore**

In `src/store/gameStore.ts`, make these changes:

**Add import at top:**
```ts
import type { PlanOverrides, SlotKey } from '@/domain/plan';
```

**Add to `GameState` type:**
```ts
overrides: PlanOverrides;
```

**Add to `GameActions` type:**
```ts
setOverride: (key: SlotKey, id: ExerciseId) => void;
clearOverride: (key: SlotKey) => void;
resetOverrides: () => void;
```

**Add to `makeInitialState()`:**
```ts
overrides: {},
```

**In `start` action, preserve overrides (do NOT call makeInitialState wholesale; keep existing overrides):**

Replace the `start` action body:
```ts
start: (config) => {
  if (!validateConfig(config)) return;
  void saveLastConfig(config);
  const currentOverrides = get().overrides;
  set({
    ...makeInitialState(),
    config,
    deck: build54(),
    startedAt: Date.now(),
    rng: createRng(Date.now()),
    overrides: currentOverrides,
  });
},
```

**Add new actions (after `reset`):**
```ts
setOverride: (key, id) =>
  set((s) => ({ overrides: { ...s.overrides, [key]: id } })),

clearOverride: (key) =>
  set((s) => {
    const next = { ...s.overrides };
    delete next[key];
    return { overrides: next };
  }),

resetOverrides: () => set({ overrides: {} }),
```

**Update `exerciseFromCard` to pass overrides:**
```ts
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
```

**Update the `drawNext` call to `exerciseFromCard`:**
```ts
const exercise = exerciseFromCard(card, config, s0.overrides, historyBefore, rng);
```

- [ ] **Step 4: Run tests to verify pass**

```bash
rtk vitest run tests/unit/gameStore.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Run full unit suite to catch regressions**

```bash
rtk vitest run tests/unit/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore.test.ts
rtk git commit -m "feat: add override state and actions to gameStore"
```

---

### Task 5: Wire routing — SetupWizard + App.tsx

**Files:**
- Modify: `src/components/SetupWizard.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/e2e/play.spec.ts`

- [ ] **Step 1: Change SetupWizard CTA to navigate to /review**

In `src/components/SetupWizard.tsx`:

1. Remove `useGameStore` import (wizard no longer starts the game).
2. Remove `saveLastConfig` import — Review will handle this.
3. Remove `showShuffle` state and the `<ShuffleTransition>` JSX.
4. Remove `starting` and `startError` state.
5. Replace `handleStart` with a simpler `handleGoToReview`:

```ts
const handleGoToReview = async () => {
  try {
    await saveLastConfig(draft);
  } catch {
    // non-blocking; config save failure shouldn't block review
  }
  navigate('/review', { state: { config: draft } });
};
```

6. Update the final-step CTA button:

```tsx
<Button
  type="button"
  className="min-h-11 touch-manipulation"
  onClick={() => void handleGoToReview()}
>
  <Trans>Review your deck</Trans>
</Button>
```

7. Remove `startError` alert paragraph above the button (no longer applies).

- [ ] **Step 2: Register /review route in App.tsx**

In `src/App.tsx`, add the Review import and route:

```tsx
import Review from './routes/Review';
```

Inside `<Routes>` next to the other routes:
```tsx
<Route path="/review" element={<Review />} />
```

- [ ] **Step 3: Update existing e2e helper to pass through /review**

In `tests/e2e/play.spec.ts`, update `completeOnboardingAndSetup`:

```ts
async function completeOnboardingAndSetup(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review your deck' }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/\/play$/, { timeout: 15_000 });
}
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/SetupWizard.tsx src/App.tsx tests/e2e/play.spec.ts
rtk git commit -m "feat: wire /review route between setup wizard and play"
```

---

### Task 6: Create ReviewCard component

**Files:**
- Create: `src/components/review/ReviewCard.tsx`

- [ ] **Step 1: Create the ReviewCard component**

Create `src/components/review/ReviewCard.tsx`:

```tsx
import { useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import type { PlanSlot } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import { DURATION, EASE_OUT } from '@/lib/motion';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-suit-hearts', diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs', spades: 'text-suit-spades',
};

function prescriptionLabel(opt: PlanSlot['options'][number]): string {
  if (opt.reps === 0) return t`×N reps`;
  if (opt.reps != null) return t`×${opt.reps} reps`;
  if (opt.durationSec != null) return t`${opt.durationSec}s`;
  if (opt.distanceM != null) return t`${opt.distanceM}m`;
  return '';
}

type Props = { slot: PlanSlot; onPick: (id: ExerciseId) => void };

export function ReviewCard({ slot, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const isOverridden = slot.selected !== slot.defaultExercise.id;
  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;
  const hasAlts = slot.options.length > 1;
  const selectedOpt = slot.options.find((o) => o.id === slot.selected) ?? slot.defaultExercise;

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        disabled={!hasAlts}
        aria-expanded={open}
        aria-label={hasAlts ? t`Swap ${tExercise(slot.selected as ExerciseId)}` : undefined}
        onClick={() => hasAlts && setOpen((v) => !v)}
        className={cn(
          'relative flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-[border-color,box-shadow] duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isOverridden
            ? 'border-primary ring-2 ring-primary/40'
            : 'border-border/50 bg-card/60',
          !hasAlts && 'cursor-default opacity-70',
        )}
      >
        <span className={cn('font-display text-xl font-bold', suitColor)}>{glyph}</span>
        <span className="text-sm font-semibold leading-snug break-words">
          {tExercise(slot.selected as ExerciseId)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {prescriptionLabel(selectedOpt)}
        </span>
        {isOverridden && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" aria-hidden />
        )}
        {!hasAlts && (
          <span className="mt-0.5 text-xs text-muted-foreground/70">
            <Trans>No alternatives</Trans>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="radiogroup"
            aria-label={t`Alternative exercises for this slot`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : DURATION.pageOut, ease: EASE_OUT }}
            className="flex flex-col gap-1.5 overflow-hidden"
          >
            {slot.options.map((opt) => (
              <SetupOptionButton
                key={opt.id}
                selected={opt.id === slot.selected}
                aria-pressed={opt.id === slot.selected}
                onClick={() => handlePick(opt.id as ExerciseId)}
              >
                <span className="flex items-center justify-between gap-2 min-w-0">
                  <span className="min-w-0 truncate">{tExercise(opt.id as ExerciseId)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {prescriptionLabel(opt)}
                  </span>
                </span>
              </SetupOptionButton>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/review/ReviewCard.tsx
rtk git commit -m "feat: ReviewCard component with inline alt picker"
```

---

### Task 7: Create Review route

**Files:**
- Create: `src/routes/Review.tsx`

- [ ] **Step 1: Create Review.tsx**

Create `src/routes/Review.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useGameStore } from '@/store/gameStore';
import { buildPlan } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import type { SlotKey } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';
import { ReviewCard } from '@/components/review/ReviewCard';
import { Button } from '@/components/ui/button';
import { ShuffleTransition } from '@/components/ShuffleTransition';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SHELL_SETUP } from '@/lib/layout';
import { saveLastConfig } from '@/store/db';

export default function Review() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const config: SetupConfig | undefined = (location.state as { config?: SetupConfig } | null)?.config;

  const overrides = useGameStore((s) => s.overrides);
  const setOverride = useGameStore((s) => s.setOverride);
  const resetOverrides = useGameStore((s) => s.resetOverrides);
  const start = useGameStore((s) => s.start);

  const [showShuffle, setShowShuffle] = useState(false);

  useEffect(() => {
    if (!config) {
      navigate('/setup', { replace: true });
      return;
    }
    resetOverrides();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: run once on mount only

  if (!config) return null;

  const plan = buildPlan({ config, overrides });
  const hasOverrides = Object.keys(overrides).length > 0;

  const handlePick = (key: SlotKey, id: ExerciseId) => {
    setOverride(key, id);
  };

  const handleStart = async () => {
    try {
      await saveLastConfig(config);
    } catch {
      // non-blocking
    }
    start(config);
    setShowShuffle(true);
  };

  return (
    <main
      id="main-content"
      className={['relative flex flex-col', SHELL_SETUP, MAIN_PAD, 'min-h-dvh pb-32'].join(' ')}
    >
      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
            <Trans>Review your deck</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Tap a card to swap</Trans>
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
          aria-label={t`Exercise slots`}
        >
          {plan.map((slot) => (
            <ReviewCard
              key={slot.key}
              slot={slot}
              onPick={(id) => handlePick(slot.key, id)}
            />
          ))}
        </div>
      </motion.div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 touch-manipulation"
            onClick={() => navigate('/setup', { state: { config } })}
          >
            <Trans>Back</Trans>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 touch-manipulation text-muted-foreground"
              disabled={!hasOverrides}
              onClick={() => resetOverrides()}
            >
              <Trans>Reset swaps</Trans>
            </Button>
            <Button
              type="button"
              className="min-h-11 touch-manipulation"
              onClick={() => void handleStart()}
            >
              <Trans>Start workout</Trans>
            </Button>
          </div>
        </div>
      </footer>

      {showShuffle ? (
        <ShuffleTransition onComplete={() => navigate('/play', { replace: true })} />
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Handle Back → preserve draft in Setup**

The Back button passes `{ config }` in router state to `/setup`. In `src/routes/Setup.tsx`, when the wizard mounts and we have `location.state?.config`, pre-seed the wizard's draft.

In `src/routes/Setup.tsx`, read location state:

```tsx
import { useLocation } from 'react-router-dom';
```

Inside `Setup()`:
```tsx
const location = useLocation();
const returnedConfig = (location.state as { config?: SetupConfig } | null)?.config;
```

Pass `returnedConfig` to `SetupWizard` as an optional `initialConfig` prop:

```tsx
<SetupWizard
  onLeaveToLanding={() => setPhase('landing')}
  initialConfig={returnedConfig}
/>
```

In `src/components/SetupWizard.tsx`, accept the new prop and use it to override persisted config:

```tsx
type Props = { onLeaveToLanding?: () => void; initialConfig?: SetupConfig };

export default function SetupWizard({ onLeaveToLanding, initialConfig }: Props) {
```

In the `useEffect` that seeds the draft:
```ts
useEffect(() => {
  if (!loaded || seededRef.current) return;
  setDraft(initialConfig ?? persisted);
  seededRef.current = true;
}, [loaded, persisted, initialConfig]);
```

- [ ] **Step 3: Add missing SetupConfig import to Setup.tsx**

In `src/routes/Setup.tsx`, ensure `SetupConfig` is imported:

```tsx
import type { SetupConfig } from '@/domain/config';
```

- [ ] **Step 4: Run dev server and verify visually**

```bash
pnpm dev
```

Navigate: `/setup` → fill wizard → "Review your deck" → verify 7 slots appear → tap a card with alts → pick an alt → verify accent ring appears → "Start workout" → verify shuffle → land on `/play` → draw a card matching the overridden slot → verify overridden exercise shows.

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/Review.tsx src/routes/Setup.tsx src/components/SetupWizard.tsx
rtk git commit -m "feat: Review route with slot grid, alt picker, and shuffle to play"
```

---

### Task 8: E2E test for review flow

**Files:**
- Create: `tests/e2e/review.spec.ts`

- [ ] **Step 1: Write the e2e test**

Create `tests/e2e/review.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test';

async function resetDb(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('sweat-deck');
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
        req.onsuccess = () => resolve();
      })
  );
  await page.goto('/');
}

async function completeWizardToReview(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$|\/$/);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review your deck' }).click();
  await expect(page).toHaveURL(/\/review$/);
}

test.describe('review route', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page);
  });

  test('completing wizard lands on /review with 7 slot cards', async ({ page }) => {
    await completeWizardToReview(page);
    const cards = page.locator('[aria-label*="Swap"]');
    // 7 slots total; some may be non-interactive (no alts), so count all card containers
    const grid = page.locator('[aria-label="Exercise slots"] > div');
    await expect(grid).toHaveCount(7);
  });

  test('"Start workout" navigates to /play', async ({ page }) => {
    await completeWizardToReview(page);
    await page.getByRole('button', { name: 'Start workout' }).click();
    await expect(page).toHaveURL(/\/play$/, { timeout: 15_000 });
  });

  test('"Reset swaps" is disabled when no overrides', async ({ page }) => {
    await completeWizardToReview(page);
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toBeDisabled();
  });

  test('picking an alt enables "Reset swaps" and shows accent ring', async ({ page }) => {
    await completeWizardToReview(page);
    // Open the first swappable card (hearts — pushups has alt pike-pushups)
    const heartCard = page.locator('button[aria-label*="Swap Push-ups"]');
    await heartCard.click();
    // Pick the alt option
    await page.getByRole('button', { name: /Pike Push-ups/i }).click();
    // Accent ring: the card button should now have the override class (ring-2)
    await expect(heartCard).toHaveClass(/ring-2/);
    // Reset becomes enabled
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toBeEnabled();
  });

  test('"Reset swaps" clears the override and disables itself', async ({ page }) => {
    await completeWizardToReview(page);
    const heartCard = page.locator('button[aria-label*="Swap Push-ups"]');
    await heartCard.click();
    await page.getByRole('button', { name: /Pike Push-ups/i }).click();
    await page.getByRole('button', { name: 'Reset swaps' }).click();
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toBeDisabled();
    await expect(heartCard).not.toHaveClass(/ring-primary/);
  });

  test('Back from /review preserves draft and returns to /setup', async ({ page }) => {
    await completeWizardToReview(page);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    // Wizard should still be visible (not landing page)
    await expect(page.getByRole('button', { name: 'Review your deck' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run e2e tests**

```bash
rtk playwright test tests/e2e/review.spec.ts
```

Expected: all 5 tests pass. Fix any failures before proceeding.

- [ ] **Step 3: Run full e2e suite to catch regressions**

```bash
rtk playwright test
```

Expected: all tests pass (including the updated `play.spec.ts`).

- [ ] **Step 4: Commit**

```bash
rtk git add tests/e2e/review.spec.ts
rtk git commit -m "test(e2e): review route flow — slots, swap, reset, back"
```

---

## Self-Review

### Spec Coverage

| Spec section | Task(s) covering it |
|---|---|
| 7 reviewable slots per session | Task 2 (buildPlan returns 7 slots) |
| Swaps per-session only | Task 4 (overrides in store, reset on mount) |
| 0–3 curated alternatives per slot, respecting theme+equipment | Task 1 (alt catalog) + Task 2 (buildPlan validation) |
| Ace stays water-break; Jokers untouched | Task 3 (resolve test: ace/joker ignore overrides) |
| SlotKey, PlanOverrides, PlanSlot, buildPlan | Task 2 |
| resolve gains overrides param | Task 3 |
| store: overrides, setOverride, clearOverride, resetOverrides | Task 4 |
| startNewGame resets overrides | Task 4 (resetOverrides on Review mount) |
| Config change clears overrides | Task 4 (resetOverrides on Review mount) |
| All draw paths pass overrides to resolve | Task 4 (exerciseFromCard) |
| Route /review, AnimatedLayout | Task 5 (App.tsx), Task 7 (Review.tsx) |
| Setup → /review CTA, Review → /play CTA | Task 5 (SetupWizard), Task 7 (Review) |
| Back from /review preserves draft | Task 7 (navigate with state) |
| Header + subtitle + 7 ReviewCards | Task 7 |
| 2-col small / 4-col md grid | Task 7 (grid-cols-2 md:grid-cols-4) |
| Sticky bottom bar: Start + Reset swaps | Task 7 |
| ReviewCard: CardFace suit/rank, exercise name, prescription pill | Task 6 |
| Alt picker inline | Task 6 (AnimatePresence expand) |
| Accent ring + dot on override | Task 6 (ring-2 ring-primary/40, filled dot) |
| No alts → non-interactive + muted hint | Task 6 (disabled, "No alternatives") |
| Reduced motion | Task 6 + Task 7 (useReducedMotion) |
| Keyboard focusable, aria-expanded | Task 6 (button, aria-expanded) |
| i18n via Lingui | Task 6 + Task 7 (t/Trans macros) |
| No new exercise ids (reusing existing) | Task 1 (alt catalog uses existing IDs only) |
| Unit: buildPlan | Task 2 |
| Unit: resolve overrides | Task 3 |
| Unit: gameStore overrides | Task 4 |
| E2E: wizard → /review, swap, reset, back | Task 8 |

### Type Consistency Check

- `SlotKey` defined in `plan.ts`, used in `exercise.ts` (via import), `gameStore.ts`, `ReviewCard.tsx`, `Review.tsx` ✓
- `PlanOverrides` defined in `plan.ts`, imported by `exercise.ts`, `gameStore.ts`, `Review.tsx` ✓
- `PlanSlot` defined in `plan.ts`, used as prop type in `ReviewCard.tsx` ✓
- `exerciseFromCard` updated in Task 4 to accept `overrides: PlanOverrides` as third param ✓
- `resetOverrides` called in Review mount (Task 7) matches action defined in Task 4 ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-deck-review.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
