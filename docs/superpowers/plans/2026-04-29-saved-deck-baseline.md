# Saved Deck Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Highlight slots as "Changed", show the Reset button, and gate the Summary save-invite based on a *saved-deck baseline* (the last-saved overrides) instead of the default plan.

**Architecture:** Introduce a `savedBaseline` (config + overrides) in `gameStore`. Compute equality with a small pure helper in `src/lib/planDiff.ts`. `useDeckComposer` exposes `hasUnsavedChanges` and a per-slot `baselineOverride`. `DeckSlotCard` flips its "overridden" highlight to compare against the baseline override (when set) instead of the default plan. The Reset button restores baseline overrides when present, otherwise clears. Summary hides its save invite when the deck is saved and unchanged.

**Tech Stack:** React 19, Zustand, TypeScript, Vitest (unit) + Playwright (e2e), Lingui macros for copy.

---

## File Structure

- **Create:** `src/lib/planDiff.ts` — pure helpers `slotOverrideEqual`, `overridesEqual`.
- **Create:** `tests/unit/planDiff.test.ts` — covers helpers.
- **Modify:** `src/store/gameStore.ts` — add `savedBaseline`, `setSavedBaseline`; clear in `reset()`.
- **Modify:** `src/hooks/useDeckComposer.ts` — read baseline; expose `hasUnsavedChanges`, `baselineOverride` per slot; rewire `resetOverrides`.
- **Modify:** `src/components/deck/DeckSlotCard.tsx` — accept `baselineOverride` (via `ComposerSlot`); compute highlight against baseline when present.
- **Modify:** `src/routes/DeckBuilder.tsx` — set baseline when loading saved deck; clear when not; use `hasUnsavedChanges` to drive Reset button visibility.
- **Modify:** `src/components/SaveDeckSheet.tsx` — set baseline after save/update.
- **Modify:** `src/routes/Summary.tsx` — gate save invite on `savedDeckId == null || hasUnsavedChanges`.
- **Modify:** `tests/unit/useDeckComposer.test.tsx` — add tests for baseline-driven `hasUnsavedChanges` and reset.
- **Modify:** `tests/unit/DeckSlotCard.test.tsx` — add highlight-vs-baseline test.
- **Modify:** `tests/unit/SaveDeckSheet.test.tsx` — assert baseline set after save/update.
- **Modify:** `tests/e2e/save-replay.spec.ts` — add post-save Summary + builder reset flow.

---

## Task 1: planDiff equality helpers

**Files:**
- Create: `src/lib/planDiff.ts`
- Test: `tests/unit/planDiff.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/planDiff.test.ts
import { describe, it, expect } from 'vitest';
import { slotOverrideEqual, overridesEqual } from '@/lib/planDiff';
import type { PlanOverrides, SlotOverride } from '@/domain/plan';

describe('slotOverrideEqual', () => {
  it('treats undefined as equal', () => {
    expect(slotOverrideEqual(undefined, undefined)).toBe(true);
  });

  it('treats undefined vs empty object as equal', () => {
    expect(slotOverrideEqual(undefined, {})).toBe(true);
    expect(slotOverrideEqual({}, undefined)).toBe(true);
  });

  it('compares all four override fields', () => {
    const base: SlotOverride = { id: 'pushup', reps: 10 };
    expect(slotOverrideEqual(base, { id: 'pushup', reps: 10 })).toBe(true);
    expect(slotOverrideEqual(base, { id: 'pushup', reps: 12 })).toBe(false);
    expect(slotOverrideEqual(base, { id: 'squat', reps: 10 })).toBe(false);
    expect(
      slotOverrideEqual({ durationSec: 30 }, { durationSec: 60 }),
    ).toBe(false);
    expect(
      slotOverrideEqual({ distanceM: 100 }, { distanceM: 100 }),
    ).toBe(true);
  });
});

describe('overridesEqual', () => {
  it('returns true for identical maps', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup', reps: 10 } };
    const b: PlanOverrides = { 'suit:hearts': { id: 'pushup', reps: 10 } };
    expect(overridesEqual(a, b)).toBe(true);
  });

  it('returns false when a key differs', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup' } };
    const b: PlanOverrides = { 'suit:hearts': { id: 'squat' } };
    expect(overridesEqual(a, b)).toBe(false);
  });

  it('returns false when one side has an extra key', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup' } };
    const b: PlanOverrides = {
      'suit:hearts': { id: 'pushup' },
      'face:Q': { id: 'plank' },
    };
    expect(overridesEqual(a, b)).toBe(false);
  });

  it('treats empty equivalents the same', () => {
    expect(overridesEqual({}, {})).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk vitest run tests/unit/planDiff.test.ts`
Expected: FAIL — module `@/lib/planDiff` not found.

- [ ] **Step 3: Implement helpers**

```ts
// src/lib/planDiff.ts
import type { PlanOverrides, SlotKey, SlotOverride } from '@/domain/plan';

const FIELDS = ['id', 'reps', 'durationSec', 'distanceM'] as const;

export function slotOverrideEqual(
  a: SlotOverride | undefined,
  b: SlotOverride | undefined,
): boolean {
  const aa = a ?? {};
  const bb = b ?? {};
  for (const f of FIELDS) {
    if (aa[f] !== bb[f]) return false;
  }
  return true;
}

export function overridesEqual(a: PlanOverrides, b: PlanOverrides): boolean {
  const keys = new Set<SlotKey>([
    ...(Object.keys(a) as SlotKey[]),
    ...(Object.keys(b) as SlotKey[]),
  ]);
  for (const k of keys) {
    if (!slotOverrideEqual(a[k], b[k])) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `rtk vitest run tests/unit/planDiff.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/planDiff.ts tests/unit/planDiff.test.ts
rtk git commit -m "feat: add planDiff equality helpers"
```

---

## Task 2: gameStore — savedBaseline state

**Files:**
- Modify: `src/store/gameStore.ts`
- Test: `tests/unit/gameStore.test.ts`

- [ ] **Step 1: Write failing test**

Append to `tests/unit/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('gameStore.savedBaseline', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts null', () => {
    expect(useGameStore.getState().savedBaseline).toBeNull();
  });

  it('setSavedBaseline updates state', () => {
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: { 'suit:hearts': { id: 'pushup' } },
    });
    expect(useGameStore.getState().savedBaseline).toEqual({
      config: DEFAULT_CONFIG,
      overrides: { 'suit:hearts': { id: 'pushup' } },
    });
  });

  it('reset clears savedBaseline', () => {
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: {},
    });
    useGameStore.getState().reset();
    expect(useGameStore.getState().savedBaseline).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `rtk vitest run tests/unit/gameStore.test.ts -t savedBaseline`
Expected: FAIL — `savedBaseline` and `setSavedBaseline` undefined.

- [ ] **Step 3: Add to gameStore**

In `src/store/gameStore.ts`:

Add type at top of state types:

```ts
export type SavedBaseline = {
  config: SetupConfig;
  overrides: PlanOverrides;
};
```

Update `GameState` to include:

```ts
savedBaseline: SavedBaseline | null;
```

Update `GameActions` to include:

```ts
setSavedBaseline: (baseline: SavedBaseline | null) => void;
```

Update `makeInitialState()` to include:

```ts
savedBaseline: null,
```

Add action in the store body:

```ts
setSavedBaseline: (baseline) => set({ savedBaseline: baseline }),
```

`reset()` already calls `set(makeInitialState())`, so it clears automatically.

In `start()`, baseline must persist across the synthetic reset (mirrors `overrides` and `savedDeckId`):

```ts
const {
  overrides: currentOverrides,
  savedDeckId: currentSavedDeckId,
  savedBaseline: currentBaseline,
} = get();
set({
  ...makeInitialState(),
  config,
  deck: build54(),
  startedAt: Date.now(),
  rng: createRng(Date.now()),
  overrides: currentOverrides,
  savedDeckId: currentSavedDeckId,
  savedBaseline: currentBaseline,
});
```

- [ ] **Step 4: Run tests**

Run: `rtk vitest run tests/unit/gameStore.test.ts`
Expected: PASS including the new `savedBaseline` block.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore.test.ts
rtk git commit -m "feat: add savedBaseline to gameStore"
```

---

## Task 3: useDeckComposer — hasUnsavedChanges + baseline-aware reset

**Files:**
- Modify: `src/hooks/useDeckComposer.ts`
- Test: `tests/unit/useDeckComposer.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `tests/unit/useDeckComposer.test.tsx`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckComposer } from '@/hooks/useDeckComposer';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('useDeckComposer baseline behavior', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('hasUnsavedChanges is false when overrides match baseline', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(() =>
      useDeckComposer({
        mode: 'guided',
        config: DEFAULT_CONFIG,
        initialOverrides: baselineOverrides,
      }),
    );

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('hasUnsavedChanges flips true when an override changes', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(() =>
      useDeckComposer({
        mode: 'guided',
        config: DEFAULT_CONFIG,
        initialOverrides: baselineOverrides,
      }),
    );

    act(() => {
      useGameStore
        .getState()
        .setOverride('suit:hearts', { id: 'squat' });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('resetOverrides restores the baseline when one is set', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(() =>
      useDeckComposer({
        mode: 'guided',
        config: DEFAULT_CONFIG,
        initialOverrides: baselineOverrides,
      }),
    );

    act(() => {
      useGameStore
        .getState()
        .setOverride('suit:hearts', { id: 'squat' });
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => result.current.resetOverrides());

    expect(useGameStore.getState().overrides).toEqual(baselineOverrides);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('without baseline resetOverrides clears overrides (legacy behavior)', () => {
    const { result } = renderHook(() =>
      useDeckComposer({ mode: 'guided', config: DEFAULT_CONFIG }),
    );

    act(() => {
      useGameStore
        .getState()
        .setOverride('suit:hearts', { id: 'squat' });
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => result.current.resetOverrides());
    expect(useGameStore.getState().overrides).toEqual({});
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `rtk vitest run tests/unit/useDeckComposer.test.tsx -t baseline`
Expected: FAIL — `hasUnsavedChanges` not exported on hook return type.

- [ ] **Step 3: Update `useDeckComposer`**

Replace the relevant pieces of `src/hooks/useDeckComposer.ts`:

```ts
import { overridesEqual } from '@/lib/planDiff';
```

Update `ComposerSlot`:

```ts
export type ComposerSlot = {
  key: SlotKey;
  selected: ExerciseId | undefined;
  options: PlanSlot['options'];
  defaultExercise: PlanSlot['defaultExercise'] | undefined;
  prescriptionOverride?: PlanSlot['prescriptionOverride'];
  baselineOverride?: SlotOverride;
};
```

(Add `SlotOverride` to existing `@/domain/plan` import.)

Update `DeckComposerState`:

```ts
export type DeckComposerState = {
  slots: ComposerSlot[];
  isReady: boolean;
  setSlot: (key: SlotKey, id: ExerciseId) => void;
  handleStart: () => Promise<void>;
  footerLocked: boolean;
  showShuffle: boolean;
  hasUnsavedChanges: boolean;
  resetOverrides: () => void;
};
```

Inside the hook body add baseline read + computations:

```ts
const savedBaseline = useGameStore((s) => s.savedBaseline);
```

Replace `hasOverrides` with:

```ts
const hasUnsavedChanges =
  input.mode === 'guided' &&
  (savedBaseline
    ? !overridesEqual(overrides, savedBaseline.overrides)
    : Object.keys(overrides).length > 0);
```

Annotate slots with `baselineOverride`. Replace the slot mapping to:

```ts
const baseSlots: ComposerSlot[] =
  input.mode === 'guided'
    ? buildPlan({ config, overrides }).map((s) => ({
        key: s.key,
        selected: s.selected,
        options: s.options,
        defaultExercise: s.defaultExercise,
        prescriptionOverride: s.prescriptionOverride,
      }))
    : buildManualSlots().map((key) => {
        const ov = overrides[key];
        return {
          key,
          selected: ov?.id,
          options: [] as PlanSlot['options'],
          defaultExercise: undefined,
          prescriptionOverride: prescriptionFromOverride(ov),
        };
      });

const slots: ComposerSlot[] = baseSlots.map((s) =>
  savedBaseline?.overrides[s.key]
    ? { ...s, baselineOverride: savedBaseline.overrides[s.key] }
    : s,
);
```

Replace `resetOverrides`:

```ts
const resetOverrides = () => {
  if (savedBaseline) {
    storeResetOverrides();
    for (const [key, ov] of Object.entries(savedBaseline.overrides)) {
      if (ov) setOverride(key as SlotKey, ov);
    }
  } else {
    storeResetOverrides();
  }
};
```

Update returned object:

```ts
return {
  slots,
  isReady,
  setSlot,
  handleStart,
  footerLocked: showShuffle || isStarting,
  showShuffle,
  hasUnsavedChanges,
  resetOverrides,
};
```

- [ ] **Step 4: Run tests**

Run: `rtk vitest run tests/unit/useDeckComposer.test.tsx`
Expected: PASS (including baseline block + previously-passing tests).

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useDeckComposer.ts tests/unit/useDeckComposer.test.tsx
rtk git commit -m "feat: baseline-aware hasUnsavedChanges + reset in useDeckComposer"
```

---

## Task 4: DeckBuilder — wire baseline + Reset visibility

**Files:**
- Modify: `src/routes/DeckBuilder.tsx`

- [ ] **Step 1: Update imports**

```ts
import { listSavedDecks } from '@/store/db';
```

(Already present.) Add:

```ts
import type { SavedBaseline } from '@/store/gameStore';
```

- [ ] **Step 2: Use `hasUnsavedChanges` + baseline state**

Inside `DeckBuilderInner`, replace destructure:

```ts
const {
  slots,
  isReady,
  setSlot,
  handleStart,
  footerLocked,
  showShuffle,
  hasUnsavedChanges,
  resetOverrides,
} = useDeckComposer(composerInput);
```

Read setters:

```ts
const setSavedBaseline = useGameStore((s) => s.setSavedBaseline);
```

Replace existing saved-deck `useEffect` (the one fetching name) with:

```ts
useEffect(() => {
  if (savedDeckId == null) {
    setSavedDeckName(undefined);
    setSavedBaseline(null);
    return;
  }
  void listSavedDecks().then((rows) => {
    const found = rows.find((r) => r.id === savedDeckId);
    setSavedDeckName(found?.name);
    if (found) {
      setSavedBaseline({ config: found.config, overrides: found.overrides });
    }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [savedDeckId]);
```

In the JSX, change Reset button condition from `hasOverrides` to `hasUnsavedChanges`:

```tsx
{hasUnsavedChanges ? (
  <motion.div ...>
    ...Reset swaps button unchanged...
  </motion.div>
) : null}
```

- [ ] **Step 3: Run unit tests + typecheck**

Run: `rtk vitest run` and `rtk tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Smoke check in browser**

Run: `rtk pnpm dev`. Manually:

1. Open `/saved-decks`, load a saved deck → builder shows no slot highlighted, no Reset button.
2. Swap a slot → highlight + Reset visible.
3. Tap Reset → returns to saved state, no highlight, no Reset.

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/DeckBuilder.tsx
rtk git commit -m "feat: wire savedBaseline + hasUnsavedChanges in DeckBuilder"
```

---

## Task 5: DeckSlotCard — highlight against baseline override

**Files:**
- Modify: `src/components/deck/DeckSlotCard.tsx`
- Test: `tests/unit/DeckSlotCard.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `tests/unit/DeckSlotCard.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DeckSlotCard } from '@/components/deck/DeckSlotCard';
import type { ComposerSlot } from '@/hooks/useDeckComposer';
import { DEFAULT_CONFIG } from '@/domain/config';

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
  it('does NOT highlight when selection matches baseline override', () => {
    const { container } = render(
      <DeckSlotCard
        config={DEFAULT_CONFIG}
        slot={{
          ...baseSlot,
          baselineOverride: { id: 'pushup' },
        }}
        onPick={() => {}}
      />,
    );
    expect(container.querySelector('.ring-primary\\/40')).toBeNull();
  });

  it('highlights when selection differs from baseline override', () => {
    const { container } = render(
      <DeckSlotCard
        config={DEFAULT_CONFIG}
        slot={{
          ...baseSlot,
          baselineOverride: { id: 'squat' },
        }}
        onPick={() => {}}
      />,
    );
    expect(container.querySelector('.ring-primary\\/40')).not.toBeNull();
  });

  it('falls back to default-vs-selection when no baselineOverride', () => {
    const { container } = render(
      <DeckSlotCard
        config={DEFAULT_CONFIG}
        slot={baseSlot}
        onPick={() => {}}
      />,
    );
    // selected (pushup) != defaultExercise.id (squat) → highlight
    expect(container.querySelector('.ring-primary\\/40')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `rtk vitest run tests/unit/DeckSlotCard.test.tsx -t highlight`
Expected: FAIL — first test still highlights because logic ignores baselineOverride.

- [ ] **Step 3: Update DeckSlotCard logic**

In `src/components/deck/DeckSlotCard.tsx`, replace the override computation block:

```ts
import { slotOverrideEqual } from '@/lib/planDiff';
```

Replace:

```ts
const isEmpty = slot.selected === undefined;
const swappedFromDefault =
  slot.defaultExercise !== undefined && slot.selected !== slot.defaultExercise.id;
const rxCustom = slot.prescriptionOverride != null;
const isOverridden = !isEmpty && (swappedFromDefault || rxCustom);
```

With:

```ts
const isEmpty = slot.selected === undefined;

const currentOverrideForCompare = (() => {
  const ov: SlotOverride = {};
  if (slot.selected !== undefined) ov.id = slot.selected;
  const rx = slot.prescriptionOverride;
  if (rx?.reps !== undefined) ov.reps = rx.reps;
  if (rx?.durationSec !== undefined) ov.durationSec = rx.durationSec;
  if (rx?.distanceM !== undefined) ov.distanceM = rx.distanceM;
  return ov;
})();

const isOverridden = (() => {
  if (isEmpty) return false;
  if (slot.baselineOverride) {
    return !slotOverrideEqual(currentOverrideForCompare, slot.baselineOverride);
  }
  const swappedFromDefault =
    slot.defaultExercise !== undefined && slot.selected !== slot.defaultExercise.id;
  const rxCustom = slot.prescriptionOverride != null;
  return swappedFromDefault || rxCustom;
})();
```

Add `SlotOverride` to the existing `@/domain/plan` import.

- [ ] **Step 4: Run tests**

Run: `rtk vitest run tests/unit/DeckSlotCard.test.tsx`
Expected: PASS (3 highlight tests + existing).

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/deck/DeckSlotCard.tsx tests/unit/DeckSlotCard.test.tsx
rtk git commit -m "feat: DeckSlotCard highlights against baseline override"
```

---

## Task 6: SaveDeckSheet — set baseline after save/update

**Files:**
- Modify: `src/components/SaveDeckSheet.tsx`
- Test: `tests/unit/SaveDeckSheet.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `tests/unit/SaveDeckSheet.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';

describe('SaveDeckSheet sets savedBaseline', () => {
  beforeEach(async () => {
    useGameStore.getState().reset();
  });

  it('sets savedBaseline after save', async () => {
    const overrides = { 'suit:hearts': { id: 'pushup' } } as const;
    render(
      <SaveDeckSheet
        open
        onClose={() => {}}
        config={DEFAULT_CONFIG}
        overrides={overrides}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Deck name/i), {
      target: { value: 'My Deck' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(useGameStore.getState().savedBaseline).toEqual({
        config: DEFAULT_CONFIG,
        overrides,
      });
    });
  });
});
```

(If existing tests in this file already render the sheet without resetting Dexie, add a `resetDb` import/call as the existing tests do — copy that pattern from earlier tests in the same file.)

- [ ] **Step 2: Run test to verify failure**

Run: `rtk vitest run tests/unit/SaveDeckSheet.test.tsx -t savedBaseline`
Expected: FAIL — baseline still null after save.

- [ ] **Step 3: Update SaveDeckSheet**

In `src/components/SaveDeckSheet.tsx`, in `handleConfirm`:

```ts
const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);
const setSavedBaseline = useGameStore((s) => s.setSavedBaseline);
```

After the save/update succeeds (still inside the `try` block, before `onClose()`):

```ts
if (isUpdate) {
  await updateSavedDeck(savedDeckId!, { name: trimmed, config, overrides });
} else {
  const id = await saveDeck({ name: trimmed, config, overrides });
  setSavedDeckId(id);
}
setSavedBaseline({ config, overrides });
onClose();
```

- [ ] **Step 4: Run test**

Run: `rtk vitest run tests/unit/SaveDeckSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/SaveDeckSheet.tsx tests/unit/SaveDeckSheet.test.tsx
rtk git commit -m "feat: SaveDeckSheet sets savedBaseline after persistence"
```

---

## Task 7: Summary — gate save invite on dirty state

**Files:**
- Modify: `src/routes/Summary.tsx`

- [ ] **Step 1: Compute dirty state**

In `src/routes/Summary.tsx`, add imports:

```ts
import { overridesEqual } from '@/lib/planDiff';
```

Add the read:

```ts
const savedBaseline = useGameStore((s) => s.savedBaseline);
```

Compute (after existing reads):

```ts
const hasUnsavedChanges = savedBaseline
  ? !overridesEqual(overrides, savedBaseline.overrides)
  : Object.keys(overrides).length > 0;
const showSaveInvite = savedDeckId == null || hasUnsavedChanges;
```

- [ ] **Step 2: Gate the lede + button in JSX**

Wrap the existing lede `<p>` ("Liked the workout? …") AND its sibling `Save deck` / `Update saved deck` button block in:

```tsx
{showSaveInvite ? (
  <>
    <p className="mt-10 max-w-[min(100%,34ch)] text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-12">
      <Trans>
        Liked the workout?{' '}
        <span className="font-medium text-deck-reward">Save it</span> — replays later with one tap.
      </Trans>
    </p>
    <div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:gap-3.5">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full min-w-0 shrink touch-manipulation"
        onClick={() => setSheetOpen(true)}
      >
        <span className="truncate">
          {savedDeckId != null ? <Trans>Update saved deck</Trans> : <Trans>Save deck</Trans>}
        </span>
      </Button>
    </div>
  </>
) : null}
```

The existing `Finish` button must remain rendered unconditionally. Move it out of the gated block — render it in its own `<div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:gap-3.5">` (or, when the invite is hidden, this div is the only one):

```tsx
<div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:gap-3.5">
  <Button
    type="button"
    className="min-h-11 w-full min-w-0 shrink touch-manipulation"
    onClick={finish}
  >
    <span className="truncate">
      <Trans>Finish</Trans>
    </span>
  </Button>
</div>
```

(Net JSX shape: one optional invite block, then the always-on Finish block.)

- [ ] **Step 3: Run unit tests + typecheck**

Run: `rtk vitest run` and `rtk tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Smoke check**

Manually:

1. Finish a workout from a saved deck without modifying anything → Summary shows only Finish.
2. Repeat after swapping a slot → Summary shows "Update saved deck" + Finish.
3. New workout from Setup (no save) → Summary shows "Save deck" + Finish.

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/Summary.tsx
rtk git commit -m "feat: hide Summary save invite when deck is saved and clean"
```

---

## Task 8: e2e — extend save-replay coverage

**Files:**
- Modify: `tests/e2e/save-replay.spec.ts`

- [ ] **Step 1: Add new flow**

Append a test that:

1. Completes a workout from setup (no save).
2. Asserts Summary shows the "Save deck" button.
3. Saves the deck.
4. Asserts the button text becomes "Update saved deck" only if there are pending changes — for this case it should disappear.

```ts
test('summary hides save invite once saved with no edits', async ({ page }) => {
  await resetDb(page);
  await completeWizardToReview(page); // existing helper
  await page.getByRole('button', { name: /Start workout/i }).click();
  // Manually finish workout
  await page.getByRole('button', { name: /Finish/i }).first().click();

  // Save flow
  await page.getByRole('button', { name: /Save deck/i }).click();
  await page.getByLabel(/Deck name/i).fill('Test Deck');
  await page.getByRole('button', { name: /^Save$/i }).click();

  // After save, no save invite remains (button gone)
  await expect(page.getByRole('button', { name: /Update saved deck/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save deck/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Finish$/i })).toBeVisible();
});
```

(If `completeWizardToReview` doesn't exist in this file, copy the in-file helpers used by the sibling test in the same file — keep this self-contained.)

- [ ] **Step 2: Run e2e**

Run: `rtk pnpm exec playwright test tests/e2e/save-replay.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
rtk git add tests/e2e/save-replay.spec.ts
rtk git commit -m "test: e2e for Summary save-invite gating"
```

---

## Final Verification

- [ ] **Step 1: Full test suite**

Run: `rtk vitest run && rtk pnpm exec playwright test`
Expected: all green.

- [ ] **Step 2: Typecheck + lint**

Run: `rtk tsc --noEmit && rtk pnpm lint`
Expected: clean.

- [ ] **Step 3: Manual smoke**

1. New deck, swap slot, save → highlight clears, Reset hidden.
2. Modify saved deck → highlight + Reset return; Reset restores save.
3. Finish saved-and-clean workout → Summary shows only Finish.
4. Finish dirty saved workout → Summary shows "Update saved deck" + Finish.
5. Finish never-saved workout → Summary shows "Save deck" + Finish.

- [ ] **Step 4: Final commit if anything was missed**

```bash
rtk git status
```

---

## Notes

- `savedBaseline` is **not** persisted; it is rebuilt from `savedDeckId` whenever DeckBuilder mounts. Summary inherits it via the in-memory store from the prior DeckBuilder visit (the user always passes through DeckBuilder before Play/Summary).
- This plan deliberately does not compare `baseline.config` against current `config`. Config edits flow through Setup which already clears `savedDeckId`; baseline is wiped via `setSavedBaseline(null)` in DeckBuilder when `savedDeckId == null`.
- `hasUnsavedChanges` is gated on `input.mode === 'guided'` in the hook because manual mode never has a savedBaseline path; if that changes, drop the guard.
