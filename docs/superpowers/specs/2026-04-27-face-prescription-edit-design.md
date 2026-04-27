# Face Card Prescription Editing — Design

## Overview

Allow coaches and users to customize the rep/time/distance prescription on face card slots (J, Q, K) directly in the DeckBuilder. Works for both Guided and Pro (Manual) modes. Jokers are out of scope.

---

## Data Layer

### `PlanOverrides` — extended value type

```ts
// before
type PlanOverrides = Partial<Record<SlotKey, ExerciseId>>;

// after
type SlotOverride = {
  id?: ExerciseId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};
type PlanOverrides = Partial<Record<SlotKey, SlotOverride>>;
```

- Exercise swap sets `{ id }` only — prescription untouched.
- Prescription edit sets `{ reps }` / `{ durationSec }` / `{ distanceM }` only — exercise untouched.
- Both together: `{ id, reps }` etc.
- `resolve()` applies the prescription override after exercise resolution — slot prescription wins over the exercise's own default.

### Propagation

- `buildPlan` reads `SlotOverride.id` for selected exercise (same as before) and forwards `SlotOverride` prescription fields so `ReviewCard` / `DeckSlotCard` can display the current custom value.
- `gameStore.start()` and `drawNext()` forward the full `SlotOverride` to `resolve()`.
- Manual mode (Pro): prescription overrides are included in the `fullOverrides` map alongside exercise overrides.

---

## UI — `PrescriptionStepper` Component

New component, rendered only on face card slots.

```
┌─────────────────────────────────────────────┐
│ K   Devil's Press                        ●  │
│     [−]  ×20 reps  [+]                      │
└─────────────────────────────────────────────┘
```

- `−` and `+` are 44 px tap targets, separate from the card's swap tap area.
- The card's main tap target (swap/search) is scoped to the top row (glyph + exercise name).
- Value label in the center: `×N reps`, `MM:SS`, or `Nm`.

### Step sizes

| Type        | Step |
|-------------|------|
| `reps`      | 1    |
| `durationSec` | 5  |
| `distanceM` | 10   |

### Floor values (strictly > 0)

| Type        | Floor |
|-------------|-------|
| `reps`      | 1     |
| `durationSec` | 5   |
| `distanceM` | 10    |

- `−` is **disabled** (visually and interactively) when `value - step <= 0`.
- Long-press stops firing when floor is reached mid-hold.

### Long-press acceleration

- **Tap:** single step.
- **Long press** (hold > 400 ms): repeats at ~4 steps/sec (interval 250 ms).
- Applies to both `−` and `+`.

---

## `useLongPress` Hook

Generic, reusable hook:

```ts
useLongPress({
  onPress: () => void;       // fires on single tap
  onHold: () => void;        // fires repeatedly while held
  holdDelay?: number;        // ms before repeat starts (default 400)
  holdInterval?: number;     // ms between repeats (default 250)
})
```

Returns pointer/touch event handlers to spread onto a button element.

---

## Component Architecture

### `PrescriptionStepper`

```tsx
type Props = {
  value: number;
  type: 'reps' | 'durationSec' | 'distanceM';
  onChange: (value: number) => void;
};
```

- Computes step and floor from `type`.
- Blocks decrement when `value - step <= 0`.
- Uses `useLongPress` for both `−` and `+` buttons.
- Formats label: `×N reps` / `formatMSS(durationSec)` / `${distanceM}m`.

### `ReviewCard` (and `DeckSlotCard` in pro mode)

- Face slots (`face:J`, `face:Q`, `face:K`) render `<PrescriptionStepper>` below the exercise name row.
- Number slots: unchanged.
- Swap tap target restricted to the top row only.

### `Review.tsx` / `useDeckComposer`

- New callback: `onPrescriptionChange(key: SlotKey, value: number)`.
- Merges into `PlanOverrides`: `{ ...existingOverride, [prescriptionField]: value }`.
- `prescriptionField` derived from the slot's current prescription type (`reps` / `durationSec` / `distanceM`).

---

## Out of Scope

- Number card prescription editing (reps come from card value by design).
- Joker prescription editing.
- Persisting prescription overrides across sessions independently of a deck save.
- Custom step sizes per user.
