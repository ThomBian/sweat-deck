# Timed Exercise Countdown — Design

**Date:** 2026-04-27
**Status:** Approved

---

## Overview

When a card with `durationSec` is drawn (e.g., Queen face card "60-Second Weighted Plank", Ace water break), the player needs help counting the time. A circular countdown ring appears below the exercise name. The user taps it to start counting. When time runs out, the device vibrates + beeps, and the player draws the next card manually.

---

## Section 1 — `useExerciseCountdown` hook

**File:** `src/hooks/useExerciseCountdown.ts`

**Signature:**
```ts
useExerciseCountdown(durationSec: number | undefined): {
  phase: 'idle' | 'running' | 'done';
  remaining: number;   // seconds
  start: () => void;
}
```

**Behavior:**
- Resets to `idle` (and `remaining = durationSec`) whenever `durationSec` changes — i.e., when a new card is drawn.
- `start()` transitions `idle → running`, kicks off a 1s interval.
- Each tick: `remaining -= 1`. When `remaining === 0` → phase becomes `done`, fires completion side-effect (vibrate + beep), clears interval.
- Reads `pausedAt` from `useGameStore`. When truthy, clears interval without resetting `remaining`. When `pausedAt` clears, resumes interval only if phase was `running`.
- No store modifications needed.

---

## Section 2 — `ExerciseCountdown` component

**File:** `src/components/ExerciseCountdown.tsx`

**Props:** `{ durationSec: number; isRest?: boolean }`

**Visual:**
- SVG circular progress ring with `stroke-dashoffset` depleting clockwise.
- Framer Motion for smooth dashoffset transition; respects `useReducedMotion` (instant update if reduced motion).
- `isRest = false` → warm color (`text-deck-reward` / orange) — exercise intensity.
- `isRest = true` → calm color (muted sky/teal, e.g. `text-sky-400`) — rest break.

**State table:**

| Phase | Ring | Center | Interaction |
|-------|------|--------|-------------|
| `idle` | Full, dim | "Tap to start" + total secs | Whole ring is tappable |
| `running` | Depleting | `MM:SS` countdown | — |
| `done` | Empty | ✓ checkmark | — (user draws next card) |

**Completion side-effects (fires once on `done`):**
- `navigator.vibrate([200, 100, 200])` — skipped silently if unsupported.
- Web Audio API two-tone beep (no asset file) — skipped silently if `AudioContext` unavailable.

---

## Section 3 — `Play.tsx` integration

`ExerciseCountdown` renders conditionally below `ExercisePanel`:

```tsx
<ExercisePanel exercise={current} />
{current?.durationSec !== undefined && (
  <ExerciseCountdown
    durationSec={current.durationSec}
    isRest={current.id === 'water-break'}
  />
)}
```

`ExercisePanel` unconditionally suppresses the `durationSec` detail text (the `{N}s` line) — the ring always replaces it whenever a timed exercise is active. No conditional prop needed. No other files need changes.

---

## Section 4 — Testing

**`tests/unit/useExerciseCountdown.test.ts`** (uses `vi.useFakeTimers()`):
- Starts in `idle` with `remaining === durationSec`.
- `start()` → transitions to `running`, ticks down each second.
- Reaches 0 → phase becomes `done`, completion callback fired exactly once.
- Resets to `idle` when `durationSec` changes (simulating new card draw).
- Pauses interval when `pausedAt` is set; resumes on clear without losing remaining time.

**`tests/unit/ExerciseCountdown.test.tsx`**:
- Renders "Tap to start" in idle state.
- Clicking ring calls `start()`; shows countdown.
- Shows checkmark on done state.

No E2E changes needed — existing play smoke test covers draw flow end-to-end.

---

## Files changed

| File | Action |
|------|--------|
| `src/hooks/useExerciseCountdown.ts` | Create |
| `src/components/ExerciseCountdown.tsx` | Create |
| `src/routes/Play.tsx` | Edit — add `ExerciseCountdown` below `ExercisePanel` |
| `src/components/ExercisePanel.tsx` | Edit — hide `durationSec` detail when ring is shown |
| `tests/unit/useExerciseCountdown.test.ts` | Create |
| `tests/unit/ExerciseCountdown.test.tsx` | Create |
