# Sweat Deck — React Web Project Setup

**Date:** 2026-04-26
**Status:** Draft

## Goal

Scaffold the Sweat Deck app as a mobile-first React PWA. V1 ships a **skeleton** that proves the core draw loop: build deck → draw card → display exercise → repeat. No setup wizard, no history view, hardcoded mappings for one config (Full Body / Bodyweight / no cardio). Foundation must support the full feature set in `docs/CONCEPT.md` without rework.

## Non-Goals (V1)

- Setup wizard UI (defaults applied silently)
- History/summary persistence UI (sessions written to DB but not rendered)
- All theme/equipment combinations
- Smart Joker history-aware logic (V1 picks uniformly from 3 effects)

## Stack

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict) | Fast HMR, minimal config, no SSR needed |
| Styling | Tailwind CSS v4 | Utility-first, mobile-friendly |
| UI primitives | shadcn/ui (CLI-installed) | Copy-paste, customizable, no runtime lib |
| Animation | Framer Motion | Card flip, deck stack, page transitions |
| State | Zustand | Lightweight session store |
| Persistence | Dexie.js (IndexedDB) | Configs + workout log, offline-ready |
| PWA | `vite-plugin-pwa` | Manifest, service worker, installable |
| Routing | React Router | `/play` is V1; `/setup`, `/summary`, `/history` stubbed |
| Lint/Format | ESLint + Prettier | Standard |
| Test | Vitest + RTL + Playwright | Unit + smoke E2E |
| Package manager | pnpm | Fast, disk-efficient |

## File Structure

```
sweat-deck/
├── public/
│   ├── icons/                # PWA icons (192, 512, maskable)
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx              # entry, registers SW
│   ├── App.tsx               # router shell
│   ├── routes/
│   │   ├── Setup.tsx         # V1: stub, applies defaults
│   │   ├── Play.tsx          # game board (deck + exercise)
│   │   ├── Summary.tsx       # post-workout
│   │   └── History.tsx       # V1: stub
│   ├── domain/               # pure logic, no React
│   │   ├── card.ts           # Card type
│   │   ├── deck.ts           # build54(), draw()
│   │   ├── exercise.ts       # resolve(card, config)
│   │   ├── joker.ts          # pickJokerEffect(history)
│   │   └── mappings.ts       # suit/face → exercise tables
│   ├── store/
│   │   ├── gameStore.ts      # Zustand session state
│   │   └── db.ts             # Dexie schema
│   ├── components/
│   │   ├── ui/               # shadcn primitives
│   │   ├── Deck.tsx
│   │   ├── CardFace.tsx
│   │   ├── Timer.tsx
│   │   └── ExercisePanel.tsx
│   ├── hooks/
│   │   ├── useTimer.ts
│   │   └── usePersistedConfig.ts
│   ├── lib/
│   │   ├── rng.ts            # seeded RNG + normal-dist sampler
│   │   └── cn.ts             # Tailwind class merger
│   └── styles/
│       └── globals.css
├── tests/
│   ├── unit/                 # domain/* tests
│   └── e2e/                  # Playwright smoke
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Key boundary:** `src/domain/` is pure TS — no React, no Zustand, no Dexie. Trivially unit-testable, swappable later.

## Domain Model

```ts
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type CardType = 'number' | 'ace' | 'face' | 'joker';
type Difficulty = 'beginner' | 'intermediate' | 'hard' | 'advanced' | 'hell';
type Equipment = 'bodyweight' | 'weights' | 'gym';
type Theme = 'upper' | 'lower' | 'full';

type Card =
  | { type: 'number'; suit: Suit; value: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }
  | { type: 'face'; suit: Suit; rank: 'J' | 'Q' | 'K' }
  | { type: 'ace'; suit: Suit }
  | { type: 'joker'; id: 1 | 2 };

type Exercise = {
  name: string;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type SetupConfig = {
  difficulty: Difficulty;
  equipment: Equipment;
  theme: Theme;
  cardio: boolean;
  timeLimitMin?: number;
};
```

## Core Logic

### `deck.ts` — Build & Draw

- `build54(): Card[]` — 52 standard + 2 jokers
- `draw(remaining: Card[], config: SetupConfig, rng: RNG): { card: Card; remaining: Card[] }`
  - For **number cards** in the remaining pool: weight selection by normal distribution. Mean shifts per difficulty (`beginner→2, intermediate→5, hard→7, advanced→9, hell→10`). σ tuned so the tail at the extreme opposite end is ≤ 5%.
  - **Aces, face cards, jokers**: drawn at unweighted base probability.
  - Implementation: roll for category proportional to remaining counts, then within "number" apply weighted pick.

### `exercise.ts` — Resolution

- `resolve(card: Card, config: SetupConfig): Exercise` — pure lookup.
- Reads from `mappings.ts`:
  - Numbers: keyed by `[theme][suit][equipment]` → movement name. Reps = card value.
  - Face: keyed by `[rank][equipment][cardio]` → fixed challenge (reps OR durationSec OR distanceM).
  - Ace: `{ name: 'Water Break', durationSec: 60 }`.
  - Joker: handled separately (see below).
- **V1:** full table populated for `theme=full, equipment=bodyweight, cardio=off`. Other combinations return a placeholder exercise so the app doesn't crash.

### `joker.ts` — Wildcard

- `pickJokerEffect(history: Card[]): JokerEffect` — V1 picks uniformly from `combo-breaker | double-up | sudden-death`.
- `combo-breaker`: scans last 3 drawn cards for "all upper body" trigger; if matched, returns leg burnout exercise. If not, falls through to a random alt.
- `double-up`: combines last 2 drawn exercises, 10 reps each.
- `sudden-death`: random from a fixed cardio challenge list.

### `lib/rng.ts`

- Seedable RNG (mulberry32) for deterministic tests.
- `sampleNormal(mean, sigma, min, max)` — clamped normal-dist sampler.

## State

### Zustand `gameStore`

```ts
{
  config: SetupConfig;
  deck: Card[];           // remaining
  drawn: Card[];          // history (for joker logic)
  current: Exercise | null;
  startedAt: number;
  elapsedSec: number;
  finished: boolean;
  drawNext(): void;       // pops from deck, resolves exercise, pushes to drawn
  tick(): void;           // increments elapsedSec, ends if timeLimit hit
  finish(): void;         // persists session via Dexie
}
```

### Dexie schema (`db.ts`)

- `configs` table: `{ id: 'last', config: SetupConfig }` — single-row pattern for last-used setup.
- `sessions` table: `{ id: auto, startedAt, durationSec, drawnCount, config }` — written on `finish()`.

## V1 User Flow

1. App boots → loads last config from Dexie (or defaults: `intermediate / bodyweight / full / cardio:false`).
2. Lands on `/play`.
3. Tap deck → `drawNext()` → card flips (Framer Motion) → exercise panel updates.
4. Repeat until deck empty or timer hits limit (V1: no timer limit by default — "no limit" mode).
5. On finish → navigate `/summary` → show drawnCount + elapsed → "Done" persists session.

## Testing Strategy

- **Unit (`tests/unit/`):**
  - `deck.test.ts` — distribution check at each difficulty (run draw 10k times with seeded RNG, assert mean within tolerance, extremes ≤ 5%)
  - `exercise.test.ts` — resolution lookup correctness
  - `joker.test.ts` — combo-breaker trigger logic
  - `rng.test.ts` — determinism, normal-dist properties
- **Component (RTL):** `Play.tsx` flow — render, click deck, assert card revealed and exercise updated.
- **E2E (Playwright):** smoke — load app, draw 5 cards, finish, summary appears.

## PWA Configuration

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Manifest: `display: standalone`, `orientation: portrait`, `theme_color`, icons (192/512/maskable)
- Service worker: cache-first for app shell, runtime cache for assets
- Verify: Lighthouse PWA score in CI (later)

## Open Questions / Deferred

- Visual design (card art, theme palette, animations) — separate design pass after skeleton works
- Sound/haptic feedback — out of scope V1
- Accessibility audit — basic semantic HTML in V1, full audit later
- Analytics — none in V1

## Acceptance Criteria

- `pnpm dev` launches app at localhost
- `pnpm build` produces installable PWA artifact
- `pnpm test` passes unit tests
- `pnpm test:e2e` passes smoke test
- User can: open app on phone → tap deck 5 times → see 5 different exercises with reps → tap "Finish" → see summary → reopen app and last config persists
