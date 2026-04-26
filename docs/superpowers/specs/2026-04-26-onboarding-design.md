# Sweat Deck — Onboarding & Setup Design

**Date:** 2026-04-26
**Status:** Approved (pre-implementation)

## Goal

Replace the current auto-start `Setup.tsx` with a real onboarding flow: a first-launch concept explainer, a 5-step setup wizard, and a brief shuffle transition into `/play`. Returning users skip the explainer but always go through the wizard with their last config pre-selected.

## Scope

In:
- New `/onboarding` route (single-screen concept explainer, first-launch only).
- Rewritten `/setup` route hosting a stepped wizard for the five `SetupConfig` params.
- 1.5s shuffle transition between wizard completion and `/play`.
- IndexedDB flag `hasOnboarded` controlling whether the explainer auto-shows.
- Replay tutorial entry point from `/setup`.

Out:
- No mid-game setup edits.
- No config summary/confirm step (defaults pre-selected, "Start" commits).
- No quick-start shortcut for returning users (always wizard).

## Flow

```
launch (/)
  ├─ hasOnboarded === true  → /setup
  └─ hasOnboarded !== true  → /onboarding → "Got it" → /setup
                                              (writes hasOnboarded=true)

/setup (wizard)
  Step 1: Difficulty
  Step 2: Equipment
  Step 3: Theme
  Step 4: Cardio
  Step 5: Time
  → "Start" → ShuffleTransition (1.5s) → /play
```

`/setup` exposes a "?" button that routes to `/onboarding?replay=1` (does not rewrite `hasOnboarded`).

## Routes

| Route                      | Component         | Purpose                                  |
| -------------------------- | ----------------- | ---------------------------------------- |
| `/`                        | `Index.tsx` (new) | Reads `hasOnboarded`, redirects.         |
| `/onboarding`              | `Onboarding.tsx`  | First-launch explainer; replayable.      |
| `/setup`                   | `Setup.tsx`       | Hosts `SetupWizard`.                     |
| `/play`, `/summary`, `/history` | (existing)   | Unchanged.                               |

## Components

```
src/components/
  SetupWizard.tsx          // owns step index, draft config, Next/Back, progress
  ShuffleTransition.tsx    // 1.5s overlay animation
  setup/
    DifficultyStep.tsx     // value + onChange (Difficulty)
    EquipmentStep.tsx      // value + onChange (Equipment)
    ThemeStep.tsx          // value + onChange (Theme)
    CardioStep.tsx         // value + onChange (boolean)
    TimeStep.tsx           // value + onChange (number | undefined)
```

Each step component is a single-responsibility presentational component:
- Props: `value`, `onChange`. No wizard logic.
- Renders a question heading + 2–5 tappable option cards.
- "No limit" in `TimeStep` maps to `undefined` on `SetupConfig.timeLimitMin`.

`SetupWizard`:
- Local `useState<SetupConfig>` initialized from `usePersistedConfig`.
- Local `useState<number>` for current step (0–4).
- Renders progress bar (5 segments) + active step + footer (`Back` / `Next` or `Start`).
- On final "Start": call `saveLastConfig(draft)`, `useGameStore.getState().start(draft)`, mount `ShuffleTransition`, then navigate to `/play`.

## State & persistence

- Wizard draft state is local to `SetupWizard` — not zustand. Reason: transient until "Start" commits.
- `usePersistedConfig()` continues to load last config from IndexedDB; `SetupWizard` seeds from it once `loaded === true`.
- New `useHasOnboarded()` hook + `db.ts` helpers `loadHasOnboarded()` / `saveHasOnboarded(true)`. Stored in the existing Dexie `meta` table (or a new key — implementation plan decides).
- Tutorial replay (`?replay=1`) does NOT write `hasOnboarded` and does NOT redirect on completion (returns to `/setup`).

## Defaults

- First launch: `DEFAULT_CONFIG` from `src/domain/config.ts` (intermediate / bodyweight / full / cardio off / no time limit).
- Subsequent launches: last persisted config.
- Defaults pre-select an option in every step, so "Next" is always enabled.

## UX details

### Onboarding screen

Single card (centered):
- Title: "Welcome to Sweat Deck"
- 6 bullets covering: 54-card deck, suits = movement pattern, numbers = reps, face cards = challenges, aces = rest, jokers = chaos.
- Primary CTA: "Got it" → writes `hasOnboarded=true` (unless `?replay=1`) and navigates to `/setup`.

### Wizard step layout

- Top: progress bar, 5 segments, filled left-to-right.
- Heading: the question (e.g., "How hard?").
- Body: option cards (large touch targets, existing surface/border tokens from `globals.css`).
- Footer: `Back` (hidden on step 1) + `Next` (label `Start` on step 5).

### Step content

| Step | Options                                                       |
| ---- | ------------------------------------------------------------- |
| 1 Difficulty | Beginner · Intermediate · Hard · Advanced · Hell        |
| 2 Equipment  | Bodyweight · Weights · Full Gym                         |
| 3 Theme      | Upper · Lower · Full Body                               |
| 4 Cardio     | Off · On — with one-line explainer "Affects face cards" |
| 5 Time       | 15 min · 30 min · 45 min · No limit                     |

### Shuffle transition

- Full-screen overlay (z-above /play).
- Plays a 1.5s deck-shuffle animation (CSS or framer-motion — already a dep).
- After animation, navigates to `/play` (deck waits face-down for first tap, existing behavior).

### Replay tutorial

- "?" icon button, top-right of `/setup`, links to `/onboarding?replay=1`.

## Data model changes

Add to IndexedDB (Dexie schema in `src/store/db.ts`):
- `hasOnboarded: boolean` flag, single-row meta entry.

No changes to `SetupConfig`, `Card`, `Deck`, or `GameSession`.

`Summary.tsx` navigates to `/` for "play again" — still works after the change because `/` resolves to `Index`, which routes to `/setup` (onboarding only auto-shows when `hasOnboarded` is false).

## Testing

Unit (`tests/unit/`):
- `SetupWizard.test.tsx`: forward/back navigation, defaults seed from persisted config, "Start" calls `saveLastConfig` + `start` with the draft.
- `useHasOnboarded.test.ts`: read/write round-trip.

E2E (`tests/e2e/`):
- Extend `play.spec.ts` (or split into `onboarding.spec.ts`):
  - First launch: lands on `/onboarding`, taps "Got it", walks the 5 steps, sees shuffle overlay, lands on `/play`.
  - Second launch: skips onboarding, lands on `/setup`, defaults match prior config.

## Files touched

New:
- `src/routes/Index.tsx`
- `src/routes/Onboarding.tsx`
- `src/components/SetupWizard.tsx`
- `src/components/ShuffleTransition.tsx`
- `src/components/setup/{DifficultyStep,EquipmentStep,ThemeStep,CardioStep,TimeStep}.tsx`
- `src/hooks/useHasOnboarded.ts`

Modified:
- `src/routes/Setup.tsx` — rewrite to host wizard.
- `src/store/db.ts` — add `hasOnboarded` accessors.
- `src/App.tsx` — register `/` (`Index`) and `/onboarding`; route `/setup` instead of `/`.
- `tests/e2e/play.spec.ts` — onboarding flow.

## Open questions

None at spec time. Implementation plan resolves: animation impl detail (CSS vs framer-motion), exact Dexie schema migration approach.
