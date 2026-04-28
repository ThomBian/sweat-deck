# Double Up — show the last 2 cards

**Date:** 2026-04-28
**Scope:** UI only — `ExercisePanel` joker branch
**Files touched:** 1 component, 1 test file

## Problem

When the **Double Up** joker is drawn, `ExercisePanel` displays the joker card and the text *"Combine the last 2 exercises — 10 reps each"*. The user has no visual recall of what those last two exercises were and must remember them, breaking flow mid-workout.

## Goal

Surface the last two exercises directly in the panel so the user can read what to combine without recalling.

## Non-goals

- No changes to other jokers (Combo Breaker, Sudden Death).
- No changes to the top Deck row layout.
- No changes to the game store, domain logic, or joker resolution.
- No new component API.

## Design

### Trigger
The existing condition is reused:
```ts
exercise.id === 'double-up' && topCard?.type === 'joker'
```

### Layout
Top of the screen (Deck row) is untouched — the joker continues to appear in the drawn-card slot. The panel below is replaced with:

```
            Double Up
        ┌────┐  +  ┌────┐
        │ 6♥ │     │ 8♠ │
        └────┘     └────┘
       Push-ups   Squats
         10 reps each
```

- Heading: "Double Up" (existing `tExercise('double-up')`).
- Two mini `CardFace`s, side by side, joined by a centered `+`.
- Each mini has its exercise name underneath via `tExercise(resolvedExercise.id)`.
- "10 reps each" line below.
- The joker `CardFace` previously rendered inside the panel is **removed** — it would duplicate the one already shown in the Deck row above.

### Lookup logic

Walk `drawn` backward starting from index `length - 2` (skip the joker itself). Collect the first two cards whose type is `number` or `face`. Skip `ace` (Ace = water break — doubling a rest is meaningless) and skip any earlier `joker`.

For each picked card, resolve its exercise via:
```ts
resolve({ card, config, overrides })
```
This is deterministic for non-joker cards (no RNG), so re-resolving on render is safe and stateless. `config` and `overrides` are read from `useGameStore`.

### Constraint that removes the empty-state edge case

The game already prevents jokers from being drawn before draw 10 *(per product decision)*. Therefore when the Double Up branch fires, `drawn.length >= 11` and at least 2 prior cards are number/face (aces are blocked before draw 15). No fallback rendering is needed.

### `CardFace` sizing

`CardFace` already accepts a `className` override and the codebase uses the `!h-X !w-Y` Tailwind override pattern (see existing joker branch: `!h-56 !w-40`). The mini variant uses the same pattern (e.g. `!h-24 !w-16`) — no component API change.

### Accessibility

`role="img"` with `aria-label={t\`Combine ${nameA} and ${nameB} — 10 reps each\`}` on the wrapper. Inner mini cards and labels are `aria-hidden` to avoid duplicate announcements.

## Files

- **`src/components/ExercisePanel.tsx`** — replace lines 38–56 (the existing joker branch) with the new layout. Add a small inline helper (or a tiny utility) that returns the last two non-ace, non-joker cards from `drawn` and their resolved exercises.
- **`src/components/ExercisePanel.test.tsx`** *(create if absent)* — see Testing.

## Testing

Unit tests with the game store seeded:

1. Renders both mini cards with correct exercise names when Double Up is drawn after a sequence of number/face cards.
2. Skips an intervening Ace: history `[6♥, A♣, 8♠, JOKER]` → minis show `6♥` (Push-ups) and `8♠` (Squats), not the Ace.
3. Skips an earlier joker if one exists in history.
4. Heading "Double Up" and the "10 reps each" line are present.

## Risks

- **i18n string change** — the existing `aria-label` `"Combine the last 2 exercises — 10 reps each"` is replaced by an interpolated label including exercise names. Existing translation entries become stale; new entries needed. Low risk — handled in the same pass.
- **Layout on small screens** — two minis + `+` + labels must fit on a 320px viewport. Mini sizing chosen to leave horizontal padding; verify in design QC after implementation.

## Out of scope

- Surfacing history for Combo Breaker or Sudden Death.
- Animating the minis in/out independently of the joker.
- Tapping a mini to inspect the prior card.
