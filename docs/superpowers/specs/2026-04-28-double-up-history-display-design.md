# Double Up — show the last 2 cards

**Date:** 2026-04-28
**Scope:** UI (`ExercisePanel` joker branch) + draw-rule constraint (block jokers before draw 10)
**Files touched:** `ExercisePanel.tsx`, `gameStore.ts` (draw rule), tests for both

## Problem

When the **Double Up** joker is drawn, `ExercisePanel` displays the joker card and the text *"Combine the last 2 exercises — 10 reps each"*. The user has no visual recall of what those last two exercises were and must remember them, breaking flow mid-workout.

## Goal

Surface the last two exercises directly in the panel so the user can read what to combine without recalling.

## Non-goals

- No changes to other jokers (Combo Breaker, Sudden Death).
- No changes to the top Deck row layout.
- No changes to joker *resolution* logic (`pickJokerEffect` unchanged).
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

### Draw-rule constraint (new) — block jokers before draw 10

To guarantee at least 2 prior real-exercise cards exist whenever Double Up fires, the draw logic must block jokers before draw 10. This mirrors the existing ace-blocking pattern in `gameStore.drawNext` (`mustBlockAce = drawnCount < 15`).

**Implementation in `gameStore.drawNext`:**
- After the initial `draw(...)` call, if `result.card.type === 'joker'` AND `drawnCount < 10`, attempt to swap it out — pick a non-joker card from the combined `[card, ...remaining]` pool, leaving the joker in the remaining deck.
- Add a small helper `drawNonJoker({ remaining, difficulty, rng })` parallel to the existing `drawNonAce` in `src/domain/deck.ts`. Or generalize: a single `drawExcluding({ remaining, difficulty, rng, excludeTypes })` helper that both ace-block and joker-block paths call. Decide during planning.
- If the pool contains *only* jokers (impossible in a real session before draw 10 — the deck has 52 non-joker cards out of 54), fall through and let the joker draw.

**Result:** when the Double Up branch in `ExercisePanel` fires, `drawn.length >= 11`. Combined with the existing ace-block (no aces before draw 15), the prior 2 cards in history are always number/face — no empty-state, no ace-skip needed in the UI lookup.

The UI lookup logic is therefore simplified: take the last 2 entries of `drawn` (excluding the joker just drawn), resolve each via `resolve(...)`, render. The "skip aces / skip earlier jokers" walk-back is no longer required for correctness, though keeping it as a defensive measure is cheap.

### `CardFace` sizing

`CardFace` already accepts a `className` override and the codebase uses the `!h-X !w-Y` Tailwind override pattern (see existing joker branch: `!h-56 !w-40`). The mini variant uses the same pattern (e.g. `!h-24 !w-16`) — no component API change.

### Accessibility

`role="img"` with `aria-label={t\`Combine ${nameA} and ${nameB} — 10 reps each\`}` on the wrapper. Inner mini cards and labels are `aria-hidden` to avoid duplicate announcements.

## Files

- **`src/store/gameStore.ts`** — `drawNext`: after the initial draw, swap jokers drawn before `drawnCount === 10` for a non-joker card from the same pool, mirroring the ace-block pattern.
- **`src/domain/deck.ts`** — add `drawNonJoker` (or a generalized `drawExcluding`) helper.
- **`src/components/ExercisePanel.tsx`** — replace lines 38–56 (the existing joker branch) with the new layout. Inline helper to take the last two cards from `drawn` and resolve them via `resolve(...)`.
- **`src/components/ExercisePanel.test.tsx`** *(create if absent)* — see Testing.
- **Tests for the draw rule** — extend the existing `tests/unit` deck/store tests to assert no joker appears before draw 10.

## Testing

**Draw rule (`gameStore` / `deck`):**
1. With a seeded RNG that would otherwise draw a joker first, the first 10 draws contain no joker.
2. After draw 10, jokers are eligible again.
3. Existing ace-block behavior is unchanged.

**ExercisePanel (UI):**
1. Renders both mini cards with correct exercise names when Double Up is drawn after a sequence of number/face cards.
2. Heading "Double Up" and the "10 reps each" line are present.
3. The joker `CardFace` is **not** duplicated inside the panel (it lives in the Deck row only).

## Risks

- **i18n string change** — the existing `aria-label` `"Combine the last 2 exercises — 10 reps each"` is replaced by an interpolated label including exercise names. Existing translation entries become stale; new entries needed. Low risk — handled in the same pass.
- **Layout on small screens** — two minis + `+` + labels must fit on a 320px viewport. Mini sizing chosen to leave horizontal padding; verify in design QC after implementation.

## Out of scope

- Surfacing history for Combo Breaker or Sudden Death.
- Animating the minis in/out independently of the joker.
- Tapping a mini to inspect the prior card.
