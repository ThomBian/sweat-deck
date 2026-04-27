# Face Card Prescription Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to customize reps/time/distance on face card slots (J, Q, K) directly in the DeckBuilder via an inline stepper with long-press acceleration.

**Architecture:** Extend `PlanOverrides` to carry prescription fields alongside the exercise id; update `resolve()` to apply those overrides; add a `useLongPress` hook and `PrescriptionStepper` component; restructure `ReviewCard` face-slot layout to embed the stepper below the swap button.

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react, Tailwind v4, Framer Motion

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/domain/plan.ts` | Add `SlotOverride` type, update `PlanOverrides`, extend `PlanSlot` with `prescriptionOverride`, update `buildPlan` |
| Modify | `src/domain/exercise.ts` | Apply prescription fields from `SlotOverride` in `resolve()` |
| Modify | `src/store/gameStore.ts` | Update `setOverride` to accept `SlotOverride`; add `mergePrescriptionOverride` |
| Create | `src/hooks/useLongPress.ts` | Generic pointer + keyboard long-press hook |
| Create | `src/components/review/PrescriptionStepper.tsx` | `−` / label / `+` stepper with floor guard |
| Modify | `src/components/review/ReviewCard.tsx` | Add `onPrescriptionChange` prop; split face-slot layout |
| Modify | `src/routes/Review.tsx` | Wire `mergePrescriptionOverride` and `onPrescriptionChange` |
| Modify | `tests/unit/plan.test.ts` | Update override format; add prescription override tests |
| Modify | `tests/unit/exercise.test.ts` | Add prescription override resolve tests |
| Modify | `tests/unit/gameStore-workout-overrides.integration.test.ts` | Update `setOverride` call sites |
| Create | `tests/unit/useLongPress.test.ts` | Hook behaviour tests |
| Create | `tests/unit/PrescriptionStepper.test.tsx` | Component behaviour tests |

---

## Task 1: Extend domain types — `SlotOverride`, `PlanOverrides`, `PlanSlot`, `buildPlan`

**Files:**
- Modify: `src/domain/plan.ts`
- Modify: `tests/unit/plan.test.ts`

- [ ] **Step 1.1 — Write failing tests for new override format and prescription fields**

Add to `tests/unit/plan.test.ts`:

```ts
it('selected reflects id in SlotOverride', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
  const hearts = slots.find((s) => s.key === 'suit:hearts')!;
  expect(hearts.selected).toBe('pike-pushups');
});

it('face slot prescriptionOverride is set when override has reps', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'face:J': { reps: 30 } } });
  const j = slots.find((s) => s.key === 'face:J')!;
  expect(j.prescriptionOverride).toEqual({ reps: 30 });
  expect(j.selected).toBe(j.defaultExercise.id);
});

it('face slot prescriptionOverride is undefined when no override', () => {
  const slots = buildPlan({ config: cfg, overrides: {} });
  const j = slots.find((s) => s.key === 'face:J')!;
  expect(j.prescriptionOverride).toBeUndefined();
});

it('face slot prescriptionOverride combined with id override', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'face:J': { id: 'hollow-body-hold', durationSec: 90 } } });
  const j = slots.find((s) => s.key === 'face:J')!;
  expect(j.selected).toBe('hollow-body-hold');
  expect(j.prescriptionOverride).toEqual({ durationSec: 90 });
});

it('number slots have no prescriptionOverride', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
  const hearts = slots.find((s) => s.key === 'suit:hearts')!;
  expect(hearts.prescriptionOverride).toBeUndefined();
});
```

- [ ] **Step 1.2 — Also update the existing overrides test that uses the old string format**

In `tests/unit/plan.test.ts`, update:
```ts
// before
it('selected reflects a valid override', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': 'pike-pushups' } });
  ...
});

it('applies an override id not in curated options', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': 'bench-press' } });
  ...
});

// after — wrap ids in object
it('selected reflects a valid override', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
  const hearts = slots.find((s) => s.key === 'suit:hearts')!;
  expect(hearts.selected).toBe('pike-pushups');
});

it('applies an override id not in curated options', () => {
  const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'bench-press' } } });
  const hearts = slots.find((s) => s.key === 'suit:hearts')!;
  expect(hearts.selected).toBe('bench-press');
});
```

- [ ] **Step 1.3 — Run tests to confirm failures**

```bash
rtk vitest run tests/unit/plan.test.ts
```

Expected: multiple FAIL — type errors and `prescriptionOverride` missing.

- [ ] **Step 1.4 — Replace `src/domain/plan.ts` with updated implementation**

```ts
import type { FaceRank, Suit } from './card';
import type { SetupConfig } from './config';
import type { ExerciseId } from './exercise';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId } from './mappings';

export type SlotKey = `suit:${Suit}` | `face:${FaceRank}`;

export type SlotOverride = {
  id?: ExerciseId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

export type PlanOverrides = Partial<Record<SlotKey, SlotOverride>>;

export type PlanSlot = {
  key: SlotKey;
  defaultExercise: { id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number };
  options: Array<{ id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number }>;
  selected: ExerciseId;
  prescriptionOverride?: { reps?: number; durationSec?: number; distanceM?: number };
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
    const override = overrides[key];
    const selected: ExerciseId = override?.id ?? defaultExercise.id;
    return { key, defaultExercise, options, selected };
  });

  const faceSlots: PlanSlot[] = FACE_ORDER.map((rank) => {
    const key: SlotKey = `face:${rank}`;
    const entry = config.cardio
      ? FACE_CHALLENGES_CARDIO[rank]
      : FACE_CHALLENGES[rank][config.equipment];
    const { alts: _alts, ...rest } = entry as typeof entry & { alts?: unknown };
    const defaultExercise = { ...rest, id: entry.id as ExerciseId };
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...((entry.alts ?? []) as Array<{ id: string; reps?: number; durationSec?: number; distanceM?: number }>).map(
        (a) => ({ ...a, id: a.id as ExerciseId }),
      ),
    ];
    const override = overrides[key];
    const selected: ExerciseId = override?.id ?? defaultExercise.id;
    const prescriptionOverride =
      override &&
      (override.reps !== undefined || override.durationSec !== undefined || override.distanceM !== undefined)
        ? {
            ...(override.reps !== undefined && { reps: override.reps }),
            ...(override.durationSec !== undefined && { durationSec: override.durationSec }),
            ...(override.distanceM !== undefined && { distanceM: override.distanceM }),
          }
        : undefined;
    return { key, defaultExercise, options, selected, prescriptionOverride };
  });

  return [...numberSlots, ...faceSlots];
};
```

- [ ] **Step 1.5 — Run tests to confirm they pass**

```bash
rtk vitest run tests/unit/plan.test.ts
```

Expected: all PASS.

- [ ] **Step 1.6 — Commit**

```bash
rtk git add src/domain/plan.ts tests/unit/plan.test.ts
rtk git commit -m "feat: extend PlanOverrides to SlotOverride with prescription fields"
```

---

## Task 2: Update `resolve()` to apply prescription overrides

**Files:**
- Modify: `src/domain/exercise.ts`
- Modify: `tests/unit/exercise.test.ts`

- [ ] **Step 2.1 — Write failing tests**

Add to `tests/unit/exercise.test.ts`:

```ts
it('reps override on face J applies over default', () => {
  const overrides: PlanOverrides = { 'face:J': { reps: 30 } };
  const ex = resolve({
    card: { type: 'face', suit: 'clubs', rank: 'J' },
    config: baseConfig,
    overrides,
  });
  expect(ex.id).toBe('burpees');
  expect(ex.reps).toBe(30);
});

it('durationSec override on face J with id override applies over exercise default', () => {
  const overrides: PlanOverrides = { 'face:J': { id: 'hollow-body-hold', durationSec: 90 } };
  const ex = resolve({
    card: { type: 'face', suit: 'clubs', rank: 'J' },
    config: baseConfig,
    overrides,
  });
  expect(ex.id).toBe('hollow-body-hold');
  expect(ex.durationSec).toBe(90);
});

it('distanceM override on face K cardio applies over default', () => {
  const overrides: PlanOverrides = { 'face:K': { distanceM: 1000 } };
  const ex = resolve({
    card: { type: 'face', suit: 'clubs', rank: 'K' },
    config: { ...baseConfig, cardio: true },
    overrides,
  });
  expect(ex.distanceM).toBe(1000);
});

it('number card override id still uses card value for reps', () => {
  const overrides: PlanOverrides = { 'suit:hearts': { id: 'pike-pushups' } };
  const ex = resolve({ card: { type: 'number', suit: 'hearts', value: 7 }, config: baseConfig, overrides });
  expect(ex.id).toBe('pike-pushups');
  expect(ex.reps).toBe(7);
});
```

- [ ] **Step 2.2 — Run tests to confirm failures**

```bash
rtk vitest run tests/unit/exercise.test.ts
```

Expected: new tests FAIL (type mismatch on overrides; prescription override not applied).

- [ ] **Step 2.3 — Replace `src/domain/exercise.ts` with updated implementation**

```ts
import type { Card } from './card';
import type { SetupConfig } from './config';
import { faceFreePickPrescription } from './exerciseDb';
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
    const ov = overrides?.[`suit:${card.suit}`];
    const id = (ov?.id !== undefined ? ov.id : movement.id) as ExerciseId;
    return { id, reps: card.value };
  }

  if (card.type === 'face') {
    const src = config.cardio ? FACE_CHALLENGES_CARDIO[card.rank] : FACE_CHALLENGES[card.rank][config.equipment];
    const { alts: _alts, ...srcRest } = src as typeof src & { alts?: unknown };
    const ov = overrides?.[`face:${card.rank}`];
    const ovId = ov?.id;

    let ex: Exercise;
    if (ovId) {
      const altEntry = (src.alts ?? []).find((a) => a.id === ovId);
      if (altEntry) {
        const { id, reps, durationSec, distanceM } = altEntry;
        ex = { id: id as ExerciseId };
        if (reps !== undefined) ex.reps = reps;
        if (durationSec !== undefined) ex.durationSec = durationSec;
        if (distanceM !== undefined) ex.distanceM = distanceM;
      } else {
        const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
        if (src.reps !== undefined) defaultSrc.reps = src.reps;
        if (src.durationSec !== undefined) defaultSrc.durationSec = src.durationSec;
        if (src.distanceM !== undefined) defaultSrc.distanceM = src.distanceM;
        const rx = faceFreePickPrescription(ovId as ExerciseId, defaultSrc, card.rank);
        ex = { id: ovId as ExerciseId };
        if (rx.reps !== undefined) ex.reps = rx.reps;
        if (rx.durationSec !== undefined) ex.durationSec = rx.durationSec;
        if (rx.distanceM !== undefined) ex.distanceM = rx.distanceM;
      }
    } else {
      ex = { ...srcRest, id: src.id as ExerciseId };
    }

    // Prescription override wins over exercise default
    if (ov?.reps !== undefined) ex.reps = ov.reps;
    if (ov?.durationSec !== undefined) ex.durationSec = ov.durationSec;
    if (ov?.distanceM !== undefined) ex.distanceM = ov.distanceM;

    return ex;
  }

  return { id: 'max-effort-leg-burnout' };
};
```

- [ ] **Step 2.4 — Run tests to confirm they pass**

```bash
rtk vitest run tests/unit/exercise.test.ts
```

Expected: all PASS.

- [ ] **Step 2.5 — Commit**

```bash
rtk git add src/domain/exercise.ts tests/unit/exercise.test.ts
rtk git commit -m "feat: resolve() applies prescription override from SlotOverride"
```

---

## Task 3: Update `gameStore` — new `setOverride` signature + `mergePrescriptionOverride`

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `tests/unit/gameStore-workout-overrides.integration.test.ts`

- [ ] **Step 3.1 — Update the integration test call sites and add prescription test**

Replace the three `setOverride` calls in `tests/unit/gameStore-workout-overrides.integration.test.ts`:

```ts
// Test 1 — change
useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });

// Test 2 — change
useGameStore.getState().setOverride('face:J', { id: 'hollow-body-hold' });

// Test 3 — change
useGameStore.getState().setOverride('suit:hearts', { id: 'bench-press' });
```

Add a new describe block at the bottom:

```ts
describe('prescription overrides flow through start() → drawNext()', () => {
  it('applies face:J durationSec prescription override', () => {
    useGameStore.getState().setOverride('face:J', { id: 'hollow-body-hold' });
    useGameStore.getState().mergePrescriptionOverride('face:J', 'durationSec', 90);
    useGameStore.getState().start(cfg);

    let jackCount = 0;
    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'face' && last.rank === 'J') {
        jackCount += 1;
        expect(s.current?.id).toBe('hollow-body-hold');
        expect(s.current?.durationSec).toBe(90);
      }
    }
    expect(jackCount).toBe(4);
  });

  it('prescription-only override (no id change) applies', () => {
    useGameStore.getState().mergePrescriptionOverride('face:J', 'reps', 30);
    useGameStore.getState().start(cfg);

    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'face' && last.rank === 'J') {
        expect(s.current?.id).toBe('burpees');
        expect(s.current?.reps).toBe(30);
      }
    }
  });

  it('setOverride (exercise swap) clears previous prescription override', () => {
    useGameStore.getState().mergePrescriptionOverride('face:J', 'reps', 30);
    // Swap exercise — prescription should be cleared
    useGameStore.getState().setOverride('face:J', { id: 'burpees' });
    const overrides = useGameStore.getState().overrides;
    expect(overrides['face:J']).toEqual({ id: 'burpees' });
    expect((overrides['face:J'] as { reps?: number }).reps).toBeUndefined();
  });
});
```

- [ ] **Step 3.2 — Run tests to confirm failures**

```bash
rtk vitest run tests/unit/gameStore-workout-overrides.integration.test.ts
```

Expected: FAIL — `setOverride` type mismatch, `mergePrescriptionOverride` not found.

- [ ] **Step 3.3 — Update `src/store/gameStore.ts`**

Add `SlotOverride` to the import:
```ts
import type { PlanOverrides, SlotKey, SlotOverride } from '@/domain/plan';
```

Update `GameActions` type:
```ts
type GameActions = {
  start: (config: SetupConfig) => void;
  drawNext: () => void;
  tick: () => void;
  finish: (opts?: FinishOpts) => Promise<void>;
  pause: (by: 'user' | 'visibility') => void;
  resume: () => void;
  reset: () => void;
  setOverride: (key: SlotKey, override: SlotOverride) => void;
  mergePrescriptionOverride: (key: SlotKey, field: 'reps' | 'durationSec' | 'distanceM', value: number) => void;
  clearOverride: (key: SlotKey) => void;
  resetOverrides: () => void;
};
```

Replace `setOverride` and add `mergePrescriptionOverride` in the store body:
```ts
setOverride: (key, override) =>
  set((s) => ({ overrides: { ...s.overrides, [key]: override } })),

mergePrescriptionOverride: (key, field, value) =>
  set((s) => ({
    overrides: {
      ...s.overrides,
      [key]: { ...s.overrides[key], [field]: value },
    },
  })),
```

- [ ] **Step 3.4 — Run tests to confirm they pass**

```bash
rtk vitest run tests/unit/gameStore-workout-overrides.integration.test.ts
```

Expected: all PASS.

- [ ] **Step 3.5 — Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore-workout-overrides.integration.test.ts
rtk git commit -m "feat: gameStore setOverride accepts SlotOverride; add mergePrescriptionOverride"
```

---

## Task 4: Create `useLongPress` hook

**Files:**
- Create: `src/hooks/useLongPress.ts`
- Create: `tests/unit/useLongPress.test.ts`

- [ ] **Step 4.1 — Write the failing tests**

Create `tests/unit/useLongPress.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '@/hooks/useLongPress';

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onPress immediately on pointerdown', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => { result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as React.PointerEvent); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not start hold before holdDelay', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400 }));
    act(() => { result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(onHold).not.toHaveBeenCalled();
  });

  it('fires onHold repeatedly after holdDelay at holdInterval', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => { result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(400); }); // hold starts
    act(() => { vi.advanceTimersByTime(750); }); // 3 interval ticks
    expect(onHold).toHaveBeenCalledTimes(3);
  });

  it('stops hold on pointerup before interval fires', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => { result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { result.current.onPointerUp(); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(onHold).not.toHaveBeenCalled();
  });

  it('stops hold on pointerLeave mid-hold', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => { result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as React.PointerEvent); });
    act(() => { vi.advanceTimersByTime(650); }); // hold starts + 1 tick
    act(() => { result.current.onPointerLeave(); });
    act(() => { vi.advanceTimersByTime(500); }); // would be 2 more ticks
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('fires onPress for keyboard click (detail: 0)', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => { result.current.onClick({ detail: 0 } as React.MouseEvent); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress for mouse click (detail: 1)', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => { result.current.onClick({ detail: 1 } as React.MouseEvent); });
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4.2 — Run tests to confirm failures**

```bash
rtk vitest run tests/unit/useLongPress.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4.3 — Create `src/hooks/useLongPress.ts`**

```ts
import { useRef, useEffect, useCallback } from 'react';

export type UseLongPressOptions = {
  onPress: () => void;
  onHold: () => void;
  holdDelay?: number;
  holdInterval?: number;
};

export type UseLongPressHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onClick: (e: React.MouseEvent) => void;
};

export function useLongPress({
  onPress,
  onHold,
  holdDelay = 400,
  holdInterval = 250,
}: UseLongPressOptions): UseLongPressHandlers {
  const onPressRef = useRef(onPress);
  const onHoldRef = useRef(onHold);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onHoldRef.current = onHold; }, [onHold]);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onPressRef.current();
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => onHoldRef.current(), holdInterval);
      }, holdDelay);
    },
    [holdDelay, holdInterval],
  );

  const onClick = useCallback((e: React.MouseEvent) => {
    // detail === 0 means keyboard-triggered (Enter/Space), not mouse click
    if (e.detail === 0) onPressRef.current();
  }, []);

  return { onPointerDown, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, onClick };
}
```

- [ ] **Step 4.4 — Run tests to confirm they pass**

```bash
rtk vitest run tests/unit/useLongPress.test.ts
```

Expected: all PASS.

- [ ] **Step 4.5 — Commit**

```bash
rtk git add src/hooks/useLongPress.ts tests/unit/useLongPress.test.ts
rtk git commit -m "feat: add useLongPress hook with hold acceleration and keyboard support"
```

---

## Task 5: Create `PrescriptionStepper` component

**Files:**
- Create: `src/components/review/PrescriptionStepper.tsx`
- Create: `tests/unit/PrescriptionStepper.test.tsx`

- [ ] **Step 5.1 — Write the failing tests**

Create `tests/unit/PrescriptionStepper.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PrescriptionStepper } from '@/components/review/PrescriptionStepper';

describe('PrescriptionStepper', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders reps label', () => {
    render(<PrescriptionStepper value={20} type="reps" onChange={vi.fn()} />);
    expect(screen.getByText('×20 reps')).toBeTruthy();
  });

  it('renders formatted time for durationSec', () => {
    render(<PrescriptionStepper value={90} type="durationSec" onChange={vi.fn()} />);
    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('renders distance label', () => {
    render(<PrescriptionStepper value={100} type="distanceM" onChange={vi.fn()} />);
    expect(screen.getByText('100m')).toBeTruthy();
  });

  it('calls onChange with value + 1 on reps increment', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(21);
  });

  it('calls onChange with value − 1 on reps decrement', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(19);
  });

  it('− button is disabled when value is at reps floor (1)', () => {
    render(<PrescriptionStepper value={1} type="reps" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('− button is disabled when value is at durationSec floor (5)', () => {
    render(<PrescriptionStepper value={5} type="durationSec" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('− button is disabled when value is at distanceM floor (10)', () => {
    render(<PrescriptionStepper value={10} type="distanceM" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('does not call onChange when − is disabled', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={1} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses step 5 for durationSec increment', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={30} type="durationSec" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(35);
  });

  it('uses step 10 for distanceM decrement', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={100} type="distanceM" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('fires multiple times during long press hold', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    act(() => { fireEvent.pointerDown(screen.getByLabelText('Increase')); });
    act(() => { vi.advanceTimersByTime(400); });
    act(() => { vi.advanceTimersByTime(750); }); // 3 hold ticks
    expect(onChange).toHaveBeenCalledTimes(4); // 1 immediate + 3 hold
  });
});
```

- [ ] **Step 5.2 — Run tests to confirm failures**

```bash
rtk vitest run tests/unit/PrescriptionStepper.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 5.3 — Create `src/components/review/PrescriptionStepper.tsx`**

```tsx
import { cn } from '@/lib/utils';
import { formatMSS } from '@/lib/formatTime';
import { useLongPress } from '@/hooks/useLongPress';

export type PrescriptionType = 'reps' | 'durationSec' | 'distanceM';

const STEP: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };
const FLOOR: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };

export function formatPrescriptionLabel(value: number, type: PrescriptionType): string {
  if (type === 'reps') return `×${value} reps`;
  if (type === 'durationSec') return formatMSS(value);
  return `${value}m`;
}

type Props = {
  value: number;
  type: PrescriptionType;
  onChange: (value: number) => void;
};

export function PrescriptionStepper({ value, type, onChange }: Props) {
  const step = STEP[type];
  const floor = FLOOR[type];
  const atFloor = value - step < floor;

  const decrement = () => {
    if (value - step >= floor) onChange(value - step);
  };
  const increment = () => onChange(value + step);

  const decrementHandlers = useLongPress({ onPress: decrement, onHold: decrement });
  const incrementHandlers = useLongPress({ onPress: increment, onHold: increment });

  const stepperBtn = cn(
    'flex size-11 items-center justify-center rounded-lg text-lg font-semibold',
    'touch-manipulation transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Decrease"
        disabled={atFloor}
        className={cn(
          stepperBtn,
          atFloor
            ? 'cursor-not-allowed text-muted-foreground/30'
            : 'text-foreground/70 hover:bg-muted active:bg-muted/80',
        )}
        {...decrementHandlers}
      >
        −
      </button>

      <span className="min-w-[5ch] text-center text-sm font-semibold tabular-nums">
        {formatPrescriptionLabel(value, type)}
      </span>

      <button
        type="button"
        aria-label="Increase"
        className={cn(stepperBtn, 'text-foreground/70 hover:bg-muted active:bg-muted/80')}
        {...incrementHandlers}
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 5.4 — Run tests to confirm they pass**

```bash
rtk vitest run tests/unit/PrescriptionStepper.test.tsx
```

Expected: all PASS.

- [ ] **Step 5.5 — Commit**

```bash
rtk git add src/components/review/PrescriptionStepper.tsx tests/unit/PrescriptionStepper.test.tsx
rtk git commit -m "feat: add PrescriptionStepper component with long-press acceleration"
```

---

## Task 6: Update `ReviewCard` — face slot split layout with stepper

**Files:**
- Modify: `src/components/review/ReviewCard.tsx`

- [ ] **Step 6.1 — Update `ReviewCard`**

Replace the full content of `src/components/review/ReviewCard.tsx` with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { Button } from '@/components/ui/button';
import { ExerciseSearchSheet } from '@/components/review/ExerciseSearchSheet';
import { PrescriptionStepper } from '@/components/review/PrescriptionStepper';
import type { PrescriptionType } from '@/components/review/PrescriptionStepper';
import type { FaceRank } from '@/domain/card';
import { faceFreePickPrescription } from '@/domain/exerciseDb';
import type { PlanSlot } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';
import { formatMSS } from '@/lib/formatTime';
import { slotHeaderParts } from '@/lib/reviewSlotContext';
import { DURATION, EASE_OUT } from '@/lib/motion';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

function prescriptionLabel(opt: PlanSlot['options'][number]): string {
  if (opt.reps === 0) return t`×N reps`;
  if (opt.reps != null) return t`×${opt.reps} reps`;
  if (opt.durationSec != null) return formatMSS(opt.durationSec);
  if (opt.distanceM != null) return t`${opt.distanceM}m`;
  return '';
}

function getPrescriptionType(opt: PlanSlot['options'][number]): PrescriptionType | null {
  if (opt.reps != null && opt.reps !== 0) return 'reps';
  if (opt.durationSec != null) return 'durationSec';
  if (opt.distanceM != null) return 'distanceM';
  return null;
}

type Props = {
  config: SetupConfig;
  slot: PlanSlot;
  onPick: (id: ExerciseId) => void;
  onPrescriptionChange?: (field: PrescriptionType, value: number) => void;
};

export function ReviewCard({ config, slot, onPick, onPrescriptionChange }: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAlts = slot.options.length > 1;

  const scrollSectionIntoView = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [reduceMotion]);

  /** Keep the active swap UI in view: search sheet opens immediately; alt list after expand. */
  useEffect(() => {
    if (!open && !searchOpen) return;
    if (searchOpen) {
      const id = requestAnimationFrame(() => scrollSectionIntoView());
      return () => cancelAnimationFrame(id);
    }
    if (open && hasAlts) {
      const ms = reduceMotion ? 0 : Math.round(DURATION.pageOut * 1000);
      const timeoutId = window.setTimeout(scrollSectionIntoView, ms);
      return () => clearTimeout(timeoutId);
    }
  }, [open, searchOpen, hasAlts, reduceMotion, scrollSectionIntoView]);

  const isFaceSlot = slot.key.startsWith('face:');
  const isOverridden =
    slot.selected !== slot.defaultExercise.id || slot.prescriptionOverride !== undefined;

  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;

  const selectedOpt = (() => {
    const fromOptions = slot.options.find((o) => o.id === slot.selected);
    if (fromOptions) return fromOptions;
    const face = slot.key.match(/^face:(.+)$/);
    if (face) {
      const rank = face[1] as FaceRank;
      const d = slot.defaultExercise;
      const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
      if (d.reps !== undefined) defaultSrc.reps = d.reps;
      if (d.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
      if (d.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
      const rx = faceFreePickPrescription(slot.selected, defaultSrc, rank);
      return { id: slot.selected, ...rx } as PlanSlot['options'][number];
    }
    return { ...slot.defaultExercise, id: slot.selected } as PlanSlot['options'][number];
  })();

  const prescriptionType = isFaceSlot ? getPrescriptionType(selectedOpt) : null;
  const prescriptionValue = prescriptionType
    ? (slot.prescriptionOverride?.[prescriptionType] ?? selectedOpt[prescriptionType] ?? 1)
    : 0;

  const selectedName = tExercise(slot.selected as ExerciseId);
  const slotParts = slotHeaderParts(slot.key);
  const swapContextHeadingId = `review-swap-h-${slot.key.replaceAll(':', '-')}`;
  const altPanelId = `review-alts-${slot.key.replaceAll(':', '-')}`;
  const rxLabel = prescriptionLabel(selectedOpt);

  useEffect(() => {
    if (!hasAlts || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      queueMicrotask(() => toggleRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasAlts, open]);

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    setOpen(false);
  };

  const handleCardActivate = () => {
    if (hasAlts) setOpen((v) => !v);
    else setSearchOpen(true);
  };

  const cardSurface = cn(
    'relative flex min-h-14 min-w-0 w-full flex-col gap-2.5 rounded-xl border py-3 ps-4 pe-10 text-left text-base font-medium break-words outline-none',
    'transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-out',
    isOverridden
      ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
      : 'border-border/50 bg-card/60',
  );

  const statusCorner = isOverridden ? (
    <span className="absolute end-3 top-3 size-2 rounded-full bg-primary" aria-hidden />
  ) : null;

  // Face slots use a split layout: swap button on top + stepper below
  const cardBody =
    isFaceSlot && prescriptionType ? (
      <div className={cardSurface}>
        {statusCorner}
        <motion.button
          ref={toggleRef}
          type="button"
          aria-expanded={hasAlts ? open : undefined}
          aria-haspopup={hasAlts ? undefined : 'dialog'}
          {...(open && hasAlts ? { 'aria-controls': altPanelId } : {})}
          aria-label={hasAlts ? t`Swap ${selectedName}` : t`Search or change ${selectedName}`}
          onClick={handleCardActivate}
          className={cn(
            'flex min-w-0 items-start gap-2 text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm',
            !isOverridden ? 'hover:opacity-80' : 'hover:opacity-90',
          )}
          {...(!reduceMotion ? { whileTap: { scale: 0.985 } } : {})}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          <span className="font-display text-xl font-bold leading-none">{glyph}</span>
          <span className="min-w-0 text-sm font-semibold leading-snug break-words">{selectedName}</span>
        </motion.button>
        <PrescriptionStepper
          value={prescriptionValue}
          type={prescriptionType}
          onChange={(v) => onPrescriptionChange?.(prescriptionType, v)}
        />
      </div>
    ) : (
      <motion.button
        ref={toggleRef}
        type="button"
        aria-expanded={hasAlts ? open : undefined}
        aria-haspopup={hasAlts ? undefined : 'dialog'}
        {...(open && hasAlts ? { 'aria-controls': altPanelId } : {})}
        aria-label={hasAlts ? t`Swap ${selectedName}` : t`Search or change ${selectedName}`}
        onClick={handleCardActivate}
        className={cn(
          cardSurface,
          'touch-manipulation focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
          !isOverridden ? 'hover:bg-card/90' : 'hover:bg-primary/20',
        )}
        {...(!reduceMotion
          ? { whileHover: { y: -2 }, whileTap: { scale: 0.985 } }
          : {})}
        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
      >
        <span className={cn('font-display text-xl font-bold leading-none', suitColor)}>{glyph}</span>
        <span className="min-w-0 text-sm font-semibold leading-snug break-words">{selectedName}</span>
        {rxLabel ? (
          <span className="inline-block max-w-full rounded-full bg-muted px-2 py-0.5 text-xs font-medium break-words text-muted-foreground/90">
            {rxLabel}
          </span>
        ) : null}
        {statusCorner}
      </motion.button>
    );

  return (
    <div
      ref={sectionRef}
      className="relative flex min-w-0 w-full scroll-mt-4 flex-col gap-3 sm:scroll-mt-5"
    >
      {cardBody}

      <AnimatePresence>
        {open && hasAlts ? (
          <motion.div
            id={altPanelId}
            role="radiogroup"
            aria-labelledby={swapContextHeadingId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : DURATION.pageOut, ease: EASE_OUT }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
              <h3
                id={swapContextHeadingId}
                className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <Trans>Choose an alternative</Trans>
              </h3>
              <p className="text-sm text-foreground/90 [overflow-wrap:anywhere]">
                <span className={cn('font-display text-lg font-bold leading-none', suitColor)}>
                  {slotParts.glyph}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span>{slotParts.family}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium">{selectedName}</span>
              </p>
            </div>
            {slot.options.map((opt) => (
              <SetupOptionButton
                key={opt.id}
                selected={opt.id === slot.selected}
                aria-pressed={opt.id === slot.selected}
                onClick={() => handlePick(opt.id as ExerciseId)}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{tExercise(opt.id as ExerciseId)}</span>
                  <span className="min-w-0 max-w-[45%] shrink truncate text-right text-xs text-muted-foreground">
                    {prescriptionLabel(opt)}
                  </span>
                </span>
              </SetupOptionButton>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full touch-manipulation text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Trans>Search all exercises</Trans>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ExerciseSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        slotKey={slot.key}
        config={config}
        selected={slot.selected}
        {...(slot.key.startsWith('face:')
          ? (() => {
              const d = slot.defaultExercise;
              const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
              if (d.reps !== undefined) defaultSrc.reps = d.reps;
              if (d.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
              if (d.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
              return { facePrescriptionCtx: { rank: slot.key.slice(5) as FaceRank, defaultSrc } };
            })()
          : {})}
        onPick={(id) => {
          onPick(id);
          setOpen(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6.2 — Run all unit tests to check for type errors**

```bash
rtk vitest run
```

Expected: all PASS. Fix any TypeScript errors in `ReviewCard.tsx` before continuing.

- [ ] **Step 6.3 — Commit**

```bash
rtk git add src/components/review/ReviewCard.tsx src/components/review/PrescriptionStepper.tsx
rtk git commit -m "feat: ReviewCard face slots show inline PrescriptionStepper"
```

---

## Task 7: Wire `Review.tsx` — connect `mergePrescriptionOverride` to `ReviewCard`

**Files:**
- Modify: `src/routes/Review.tsx`

- [ ] **Step 7.1 — Update `Review.tsx`**

Add `mergePrescriptionOverride` to the store selectors and update `handlePick`. Replace the relevant section:

```ts
// Add to store selectors (near setOverride):
const mergePrescriptionOverride = useGameStore((s) => s.mergePrescriptionOverride);
```

Update `handlePick` to use the new signature:
```ts
const handlePick = (key: SlotKey, id: ExerciseId) => {
  setOverride(key, { id });
};
```

Add `handlePrescriptionChange`:
```ts
const handlePrescriptionChange = (
  key: SlotKey,
  field: 'reps' | 'durationSec' | 'distanceM',
  value: number,
) => {
  mergePrescriptionOverride(key, field, value);
};
```

Update the `ReviewCard` render call in the grid:
```tsx
<ReviewCard
  key={slot.key}
  config={config}
  slot={slot}
  onPick={(id) => handlePick(slot.key, id)}
  onPrescriptionChange={(field, value) => handlePrescriptionChange(slot.key, field, value)}
/>
```

- [ ] **Step 7.2 — Run the full test suite**

```bash
rtk vitest run
```

Expected: all PASS.

- [ ] **Step 7.3 — Run TypeScript check**

```bash
rtk tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7.4 — Commit**

```bash
rtk git add src/routes/Review.tsx
rtk git commit -m "feat: wire prescription change from ReviewCard to gameStore"
```

---

## Task 8: Smoke-test the full flow in the browser

- [ ] **Step 8.1 — Start the dev server and navigate to Review**

```bash
pnpm dev
```

Open `http://localhost:5173`, complete the wizard, land on `/review`.

- [ ] **Step 8.2 — Verify face card stepper renders**

- Face cards (J, Q, K) should show `−` / label / `+` below the exercise name.
- Number cards (suits) should look unchanged.

- [ ] **Step 8.3 — Verify tap increments and decrements**

- Single tap `+` on a face card increments the value by 1 (reps) / 5 (time) / 10 (distance).
- Single tap `−` decrements.
- At floor, `−` is disabled and greyed out.

- [ ] **Step 8.4 — Verify long press accelerates**

- Hold `+` for > 400ms: value should continue incrementing at ~4/sec.
- Release: stops immediately.

- [ ] **Step 8.5 — Verify prescription persists into workout**

- Set J reps to 30, start workout, draw a Jack → panel should show reps: 30.

- [ ] **Step 8.6 — Verify exercise swap clears prescription**

- Edit J reps to 30, then swap J to a different exercise → prescription resets (new exercise shows its default prescription).

- [ ] **Step 8.7 — Commit**

```bash
rtk git add -A
rtk git commit -m "feat: face card prescription editing complete"
```
