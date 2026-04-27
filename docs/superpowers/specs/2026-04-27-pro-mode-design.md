# Pro Mode (Manual Deck Setup) — Design

## Overview

Two paths to start a workout from the landing page:

- **Guided** — existing wizard (Difficulty → Equipment → Theme → Cardio → Time) auto-resolves exercises from config, then shows the deck for review/swaps.
- **Manual** — coach jumps directly to the deck builder, assigns an exercise to every card slot by hand, then starts the workout.

Both paths converge on the same `/deck` route.

---

## Landing Page

### Toggle + descriptor

A segmented toggle replaces the single "Continue" CTA:

```
[ Guided ]  [ Manual ]
```

Below the toggle, a small muted descriptor line updates on selection:

- **Guided:** "We'll build your deck based on your level and gear."
- **Manual:** "Assign an exercise to every card yourself."

### CTA

Single button: **"Go!"**

- Guided → wizard → `/deck` (pre-filled from config)
- Manual → `/deck` directly (all slots blank)

### Copy

Landing heading and body copy updated to reflect the two paths (guided for beginners, manual for coaches who know exactly what they want).

---

## Rename: Review → Deck Builder

All "review" naming is replaced to reflect the shared purpose: **deck definition**.

| Old | New |
|---|---|
| route `/review` | `/deck` |
| `src/routes/Review.tsx` | `src/routes/DeckBuilder.tsx` |
| `src/components/review/` | `src/components/deck/` |
| `ReviewCard.tsx` | `DeckSlotCard.tsx` |
| `ExerciseSearchSheet.tsx` | `ExercisePickerSheet.tsx` |

---

## `useDeckComposer` Hook

Owns all slot state for both modes. `DeckBuilder` is a thin shell on top of it.

```ts
type ComposerInput =
  | { mode: 'guided'; config: SetupConfig }
  | { mode: 'manual' };

useDeckComposer(input): {
  slots: PlanSlot[];
  overrides: PlanOverrides;
  setSlot(key: SlotKey, exercise: Exercise): void;
  isReady: boolean;       // guided: always true | manual: all assignable slots filled
  handleStart(): void;    // saves config (guided) or skips config save (manual), navigates to play
}
```

### Guided mode behavior
- Init slots from `buildPlan(config, {})`.
- `isReady` is always `true` — "Start workout" always enabled.
- `handleStart` saves config to IndexedDB, navigates to play.

### Manual mode behavior
- Init all assignable slots as `undefined` (blank).
- `isReady` becomes `true` only when every assignable slot has an exercise.
- `handleStart` navigates to play with no config save (no SetupConfig in manual mode).
- Jokers (2) and Aces (4) are fixed — not included in assignable slots, not shown for manual assignment.

---

## DeckBuilder Route

Route is always `/deck`. Mode is passed via React Router state (same pattern as the existing `/review` route):

```ts
// Guided (from wizard)
navigate('/deck', { state: { mode: 'guided', config: SetupConfig } });

// Manual (from landing)
navigate('/deck', { state: { mode: 'manual' } });
```

`DeckBuilder.tsx` reads router state, calls `useDeckComposer`, renders slot cards. No mode-specific conditionals in the component tree — all differences live in the hook.

### "Start workout" CTA

- Guided: always enabled.
- Manual: disabled + visually muted until `isReady`.
- No progress pill or fill counter shown.

---

## Fixed Cards (Manual Mode)

Jokers and Aces retain their engine-level behavior and are not presented for manual assignment:

- **Aces (4):** rest break — fixed.
- **Jokers (2):** context-aware wildcard (reads drawn history) — fixed.

---

## Data Flow

```
Landing (Guided) → Wizard → /deck { mode: guided, config }
                                     ↓
                              useDeckComposer(guided)
                                     ↓
                              buildPlan(config, overrides)
                                     ↓
                              gameStore.start(config, overrides)

Landing (Manual) → /deck { mode: manual }
                                     ↓
                              useDeckComposer(manual)
                                     ↓
                              all slots blank → user fills
                                     ↓
                              gameStore.start(DEFAULT_CONFIG, fullOverrides)
```

In manual mode, `DEFAULT_CONFIG` is passed as a silent base to `gameStore.start` so the store API remains unchanged. The full overrides map covers every assignable slot, so the base config has no effect on exercise resolution.

---

## Out of Scope

- Fill-progress pill / counter (not needed for now).
- Saving/loading manual deck configurations across sessions.
- Partial manual decks (all slots must be filled before starting).
- Per-card reps customization (reps still come from card value).
