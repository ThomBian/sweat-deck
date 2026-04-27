# Exercise Search in Review — Design

## Overview

Extend the Review screen's per-card swap UI with a full-exercise search sheet. Existing curated alts stay as the fast path; Search is the escape hatch for any exercise in the DB. Recommendations are derived from the slot's movement family and the session's setup config (equipment + theme).

---

## Architecture

### `src/domain/exerciseDb.ts` (new)

Flat registry of all exercises. Each entry:

```ts
type ExerciseEntry = {
  id: ExerciseId;
  group: 'push' | 'pull' | 'legs' | 'posterior' | 'challenge'; // display grouping only
  equipment: Equipment[]; // which equipment levels list this exercise
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultDistanceM?: number;
};
```

`group` is a display-only label used to organise the "All exercises" section. It is **not** used for recommendations.

Equipment tags come from which Equipment keys list the exercise in `NUMBER_MOVEMENTS`.

Exports:
- `ALL_EXERCISES: ExerciseEntry[]` — full flat list
- `recommendedFor({ slotKey, config }): ExerciseEntry[]` — theme-aware recommendations (see below)

**`recommendedFor` logic:**
- For `suit:X` slots: collect all exercises that appear in `NUMBER_MOVEMENTS[config.theme][X]` across **all equipment levels**. This naturally respects the theme — e.g. for Upper Body, clubs and spades surface upper-body movements, not legs.
- For `face:X` slots: collect exercises from `FACE_CHALLENGES[X]` across all equipment levels + `FACE_CHALLENGES_CARDIO[X]`.
- Deduplicate, then sort: exercises compatible with `config.equipment` first.

### Plan / resolve relaxation

`buildPlan()` currently gates overrides against `validIds` (curated alts only). Remove that gate — any `ExerciseId` stored as an override is accepted.

`resolve()` same: if override is set, use it directly without checking alts list.

**Prescription for free-picked exercises:**
- Number slots: reps = `card.value` as usual — no change needed.
- Face slots: free-pick inherits the slot's default prescription shape. If slot J normally gives 15 reps, a free-picked exercise for slot J also gets 15 reps. This avoids a per-exercise prescription lookup.

---

## ReviewCard changes

- Existing inline alts panel: unchanged.
- When the alts panel is **open**: a **"Search all exercises"** ghost button appears at the bottom of the alts list.
- For **locked cards** (no alts, shows Lock icon): a "Search all exercises" ghost button appears directly on the card — giving locked slots an escape hatch.
- Tapping Search opens `ExerciseSearchSheet` with the slot's context.
- After picking in the sheet: `onPick(id)` is called, sheet closes, card shows override dot as usual.

---

## ExerciseSearchSheet component

**Location:** `src/components/review/ExerciseSearchSheet.tsx`

**Props:**
```ts
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: SlotKey;
  config: SetupConfig;
  selected: ExerciseId;
  onPick: (id: ExerciseId) => void;
};
```

**Layout:**

```
┌─────────────────────────────┐
│ ♥ Hearts — Push             │  ← slot label + family pill
│ [Search exercises…________] │  ← input, NO autofocus
├─────────────────────────────┤
│ Recommended                 │  ← visible when query empty
│ • Bench Press      ×N reps  │
│ • Push-ups         ×N reps  │
├─────────────────────────────┤
│ All exercises               │  ← collapsed when query empty
│ ...                         │
└─────────────────────────────┘
```

**Behavior:**
- **No autofocus** on search input — user taps to activate keyboard deliberately.
- `max-height: 80dvh` — sheet shrinks when keyboard opens, no layout fighting.
- Search input pinned at top of sheet; results list is `flex-1 overflow-y-auto`.
- Results list has `pb-[env(safe-area-inset-bottom)]` to clear home indicator.
- **Empty query**: Recommended section shown (union of curated alts + DB exercises matching family + equipment), All exercises section hidden.
- **Active query**: single flat list across full DB, recommended-first sort, no section split.
- Currently selected exercise shows a checkmark.
- Tapping a result calls `onPick(id)` and closes sheet.
- Swipe down or Escape closes sheet without picking.

**Recommended set** = `recommendedFor({ slotKey, config })` — derived from `NUMBER_MOVEMENTS[config.theme][suit]` across all equipment levels, so it always respects the active theme (Upper Body, Lower Body, Full Body).

---

## i18n

New strings:
- `"Search all exercises"` — ghost button label
- `"Search exercises…"` — input placeholder
- `"Recommended"` — section header
- `"All exercises"` — section header

All wrapped in `t\`\`` / `<Trans>` as per project convention.

---

## Out of scope

- Custom exercise creation (free-text name entry)
- Per-exercise prescription overrides (reps count stays card-driven for number slots)
- Search in Play mid-workout
