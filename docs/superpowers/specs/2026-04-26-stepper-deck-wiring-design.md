# Stepper → Deck Wiring — Design

Date: 2026-04-26
Status: Draft

## Goal

Wire the SetupWizard ("stepper") to the runtime game so that:

- Timer is a **countdown** when `timeLimitMin` is set, **stopwatch** when unlimited
- Clock-zero flips into a visible **overtime** state, not a hard end
- Deck exhaustion is the canonical completion event
- Aces (rest cards) are paced sensibly across effort time, never clumped or at the start
- Difficulty drives the number-card draw distribution (per CONCEPT.md) and is surfaced consistently across wizard, play, and summary
- Pause/resume works (manual + auto on visibility change)

## Context

Current state (`src/store/gameStore.ts`, `src/hooks/useTimer.ts`, `src/components/Timer.tsx`):

- `tick` derives `elapsedSec = floor((Date.now() - startedAt) / 1000)`
- Timer always counts up
- On `elapsedSec >= limit` the store auto-sets `finished: true` (silent hard stop)
- Aces drawn purely by weighted RNG; can clump, can land card #1
- Difficulty silently shifts the number-card distribution; no UI surface
- No pause concept

Wizard → game seam already exists: final step calls `useGameStore.start(config)` and navigates to `/play`. We keep that seam and harden the contract.

## Non-goals

- Persisting paused games across reloads (state is in-memory only)
- Multiple concurrent sessions
- Background-task scheduling beyond `visibilitychange`

---

## 1. Timer state model

### Store fields

```ts
startedAt: number | null
pausedAt: number | null      // wall-clock ms when paused, null while running
pausedAccumMs: number        // total ms spent paused across all pauses
pausedBy: 'user' | 'visibility' | null
finished: boolean
endReason: 'deck' | 'manual' | null
completedDeck: boolean
```

`config.timeLimitMin` already lives in setup config; `null` (or `0`) means unlimited.

### Elapsed (derived, not stored)

```ts
const live = pausedAt ?? Date.now()
elapsedSec = Math.floor((live - startedAt - pausedAccumMs) / 1000)
```

Single source of truth. Drift-free. Pause-aware.

### Phase / display (derived)

```ts
mode = config.timeLimitMin == null ? 'unlimited' : 'timed'

// timed mode
const limitSec    = config.timeLimitMin * 60
const remaining   = Math.max(0, limitSec - elapsedSec)
const overtime    = Math.max(0, elapsedSec - limitSec)
phase = overtime > 0 ? 'overtime' : 'countdown'

// unlimited mode
phase = 'stopwatch'
```

### Tick

`useTimer` interval runs only while `startedAt && !pausedAt && !finished`. Tick no longer auto-finishes on clock-zero — selectors flip phase to `overtime`.

### UI states

| Phase | Display | Visual |
|---|---|---|
| `countdown` | `MM:SS` remaining | calm/neutral |
| `overtime` | `+MM:SS` past limit | urgent/red, subtle pulse, copy hint ("Bonus round") |
| `stopwatch` | `MM:SS` elapsed | neutral, no end state |

---

## 2. Ace pacing (rest distribution)

### Goal

Aces never appear in the first 15 draws, never clump, and arrive at a cadence proportional to effort time.

### Store addition

```ts
lastRestAtElapsedSec: number   // 0 at start; updated when an Ace is drawn
```

Uses elapsed (pause-excluded) so pauses don't shift cadence — pacing tracks effort.

### Interval target (derived per draw)

```ts
const acesRemaining = deck.filter(c => c.type === 'ace').length
const intervalSec   = config.timeLimitMin
  ? (config.timeLimitMin * 60) / (acesRemaining + 1)
  : 15 * 60     // unlimited
const sinceLastRest = elapsedSec - lastRestAtElapsedSec
```

Adaptive: if a player burns through Aces early, remaining Aces stretch; if they go fast and skip Aces, the cadence catches up.

### Draw guards (in `drawNext`)

```
1. Sample card via existing weighted draw
2. If card is Ace:
     - if drawn.length < 15            → reject; resample from non-Ace pool
     - if sinceLastRest < interval*0.7 → reject; resample from non-Ace pool
     - else accept; set lastRestAtElapsedSec = elapsedSec
3. If card is NOT Ace AND drawn.length >= 15
     AND sinceLastRest >= interval*1.0
     AND acesRemaining > 0:
     → swap with an Ace pulled from remaining deck
       push the sampled non-Ace back into the deck
       set lastRestAtElapsedSec = elapsedSec
```

### Edge cases

- Deck has only Aces left but cooldown blocks → accept Ace anyway (degenerate; rare)
- Joker drawn during cooldown → no effect on rest timer
- Deterministic in tests via seeded `rng`

### Knobs (confirmed)

- 15-card hard floor
- 0.7× soft floor
- 1.0× force-ceiling

---

## 3. Auto-finish & completion

### Triggers (priority order)

1. **Deck empty wins** — after `drawNext`, if `deck.length === 0` → finish with `endReason: 'deck'`, `completedDeck: true`. Celebrated in Summary.
2. **Clock zero (timed mode)** — does NOT auto-finish. Phase flips `countdown → overtime`. Game continues.
3. **User taps Finish** — manual end any time. `endReason: 'manual'`.
4. **Unlimited mode** — only deck-empty or manual ends the game.

### `drawNext` tail

```ts
if (deck.length === 0) {
  void finish({ reason: 'deck', completedDeck: true })
}
```

### `finish({ reason, completedDeck })`

- Sets `finished: true`, freezes timer (selectors stop advancing once `finished`)
- Persists session via existing `recordSession`, extended with `completedDeck` and `endReason`

### Summary celebration

Summary becomes a playful celebration. Copy buckets keyed by `(difficulty × completedDeck × overtime)`:

- Hell + completedDeck → big victory ("You finished the deck. On Hell. That's a flex.")
- Beginner + manual → encouraging ("Start somewhere — you started today.")
- Any + overtime → "you went past the bell" line

Reuse `delightCopy.ts` pattern; add `SUMMARY_KUDOS` keyed buckets.

---

## 4. Pause / resume

### Actions

```ts
pause(by: 'user' | 'visibility'):
  if !pausedAt && !finished:
    pausedAt = Date.now()
    pausedBy = by

resume():
  if pausedAt:
    pausedAccumMs += Date.now() - pausedAt
    pausedAt = null
    pausedBy = null
```

### Visibility auto-pause

`useVisibilityPause` hook on `/play`:

- `visibilitychange → hidden` → `pause('visibility')`
- `visibilitychange → visible` → `resume()` **only if** `pausedBy === 'visibility'`

This way a manual pause survives a tab-switch (won't auto-resume on focus).

### UI

- Pause button in `/play` header (next to Timer, opposite Finish)
- While paused: full-screen dim overlay, large "Paused" + breath copy, two buttons: **Resume** / **Finish**
- Deck non-interactive while paused (`drawNext` early-returns if `pausedAt`)
- Timer display freezes naturally (selectors use `pausedAt` as `live`)

### Edge cases

- Pause during overtime works the same; overtime stops accumulating.
- App killed while paused: in-memory state is lost (acceptable — no persistence in scope).

---

## 5. Difficulty mechanics (per CONCEPT.md)

The difficulty selected in the wizard is the single knob that shifts the **number-card draw distribution**. This is the core "weighted deck" mechanic from CONCEPT.md.

### Levels and means

Five levels (matches `Difficulty` type and `NUMBER_DIST`):

| Level | Mean | Feel (per CONCEPT.md) |
|---|---|---|
| Beginner | 2 | High prob of 2/3/4. A 10 has ~5% chance. |
| Intermediate | 5 | Balanced bell, favors 4/5/6. |
| Hard | 7 | Volume up; 6/7/8 standard. |
| Advanced | 9 | Heavy bias toward 8/9/10. Low cards feel rare. |
| Hell | 10 | Almost entirely 9s and 10s. Drawing a 2 ~5%. |

Sigma (spread) is shared across levels: `sigma = 2.5`. Sampling is normal-truncated to `[2, 10]` then rounded.

### The 5% extreme cap rule

Per CONCEPT.md: *"the extreme outliers are capped at a 5% probability."* Concretely:

- For each difficulty, the rounded probability of the value **furthest from the mean** within `[2, 10]` must be **≤ 5%**, and ideally close to 5% (so the extreme is rare but not impossible — drawing a "merciful 2" on Hell is a possible event, just unlikely).

### Implementation contract

Existing `pickTargetValue` (in `src/domain/deck.ts`) uses rejection sampling on a truncated normal. We keep that approach, with an additional acceptance check to enforce the cap:

1. Sample `raw` via `sampleNormal({ mean, sigma=2.5, min: 2, max: 10 })`
2. Round to nearest integer in `[2, 10]`
3. **Cap enforcement**: if the rounded value equals the far extreme for the current difficulty AND a precomputed `extremeP[difficulty]` exceeds 5%, reject and resample (bounded retries, fallback to nearest non-extreme).

`extremeP` is precomputed once per difficulty as the integral of the truncated normal at the far-extreme bucket. If math shows current sigma already yields ≤ 5% at the extremes (likely for means 2 and 10), the cap is a no-op guard — but the rule is still expressed in code so future tuning can't silently violate the concept.

### Tests

- For each difficulty, run 10k seeded draws and assert:
  - Empirical extreme-value frequency ≤ 6% (1% slack for sample noise)
  - Mode is within ±1 of the configured mean
- Snapshot the per-difficulty distribution histogram in a unit test for regression detection.

### Coupling with `repHint`

`DIFFICULTY_META.repHint` (Section 6) copy must reflect the actual distribution:

- Beginner: "Most: 2–4 · Rare: 9–10"
- Intermediate: "Most: 4–6 · Rare: 2 or 10"
- Hard: "Most: 6–8 · Rare: 2–3"
- Advanced: "Most: 8–10 · Rare: 2–3"
- Hell: "Most: 9–10 · Rare: 2"

Static copy (Lingui-friendly), but anchored to the histogram tests above so drift is caught.

---

## 6. Difficulty surfacing

### Shared module

`src/domain/difficultyMeta.ts`:

```ts
export const DIFFICULTY_META: Record<Difficulty, {
  label: string         // "Beginner" | "Intermediate" | "Advanced" | "Hell"
  description: string   // 1-line copy used in wizard + summary
  repHint: string       // "Most: 5–8 · Rare: 2 or 10"
  tone: 'calm' | 'warm' | 'hot' | 'inferno'  // badge color
}>
```

Static copy (Lingui-friendly). Tone maps to semantic color tokens.

### Consumers

- **DifficultyStep (wizard)** — each option shows label + description + repHint
- **Play header badge** — label + tone, tap reveals description + repHint in a Sheet/Drawer
- **Summary** — label + tone in stat row; description used as celebration flavor

No new domain logic. `draw()` already consumes difficulty. This section is pure UI surfacing.

---

## 7. Wizard → game seam

### Contract: `useGameStore.start(config)`

The single entrypoint from wizard to runtime. Hardened to:

1. Validate `config` (Difficulty + Equipment + Theme required; Time + Cardio optional)
2. Reset store to initial state
3. Build deck via `build54()`
4. Initialize:
   - `startedAt = Date.now()`
   - `pausedAt = null`, `pausedAccumMs = 0`, `pausedBy = null`
   - `lastRestAtElapsedSec = 0`
   - `finished = false`, `endReason = null`, `completedDeck = false`
5. Seed `rng` (existing behavior)
6. Persist via `saveLastConfig(config)` (existing behavior)

### Wizard responsibilities end here

The wizard does not know about ticks, pauses, Aces, or overtime. `Play` owns the runtime. (Demeter — small, well-bounded units.)

### TimeStep → countdown wiring

Purely via `config.timeLimitMin`. `null` or `0` → unlimited path. No branching at the seam.

### Route guard for `/play`

If `startedAt == null`, redirect to `/setup`. Prevents deep-link into a broken state.

---

## Testing

- **Unit**
  - Elapsed selector: pause/resume math, multiple pause cycles, overtime phase flip
  - Ace pacing: 15-card floor, soft floor rejection, force-ceiling injection, adaptive interval
  - Difficulty distribution: per-level histogram (10k seeded draws), extreme ≤ 6%, mode within ±1 of mean
  - `start()` resets all fields
  - `finish()` records correct `endReason` / `completedDeck`
- **Integration**
  - drawNext loop with seeded RNG: assert no Ace before card 16, no Ace within 0.7×interval, force at 1.0×interval
  - Deck-exhaustion auto-finish path
- **E2E (Playwright)**
  - Setup → /play → countdown ticks down → overtime visual flip
  - Pause button freezes timer; Resume continues
  - Visibility hidden → time excluded from elapsed
  - Manual Finish from overtime → Summary shows correct phase copy

## Out of scope / follow-ups

- Persistent pause across reloads
- Customizable rest cadence
- Per-difficulty rep ranges tunable from settings
- Telemetry on Ace pacing distributions
