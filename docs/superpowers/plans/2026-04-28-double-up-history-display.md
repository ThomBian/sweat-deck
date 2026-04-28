# Double Up — Show Last 2 Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the Double Up joker is drawn, render the two most recent prior cards inline in `ExercisePanel` so the user can see what to combine without recalling — and add a draw-rule constraint that blocks jokers before draw 10 to guarantee the prior cards exist.

**Architecture:** Two coordinated changes. (1) Domain/store: extend `src/domain/deck.ts` with a `drawNonJoker` helper mirroring the existing `drawNonAce`, then add a joker-block branch to `gameStore.drawNext` parallel to the existing ace-block. (2) UI: replace the joker branch of `ExercisePanel.tsx` with a layout that renders two mini `CardFace`s plus exercise names, joined by `+`. Resolution of prior exercises is pure (`resolve(card, config, overrides)` is deterministic for non-jokers), so no store schema changes are required.

**Tech Stack:** React + TypeScript, Zustand store, Vitest + Testing Library, Tailwind CSS, Lingui i18n, framer-motion.

**Spec:** `docs/superpowers/specs/2026-04-28-double-up-history-display-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/domain/deck.ts` | Modify | Add `drawNonJoker` helper |
| `src/store/gameStore.ts` | Modify | Joker-block branch in `drawNext` |
| `src/components/ExercisePanel.tsx` | Modify | Replace joker branch with history-aware layout |
| `tests/unit/deck.test.ts` | Modify | Tests for `drawNonJoker` |
| `tests/unit/gameStore-draw-rules.test.ts` | Create | Tests for draw rule (no joker before draw 10) |
| `tests/unit/ExercisePanel.test.tsx` | Create | Tests for the new Double Up panel |

---

## Task 1: `drawNonJoker` helper in deck domain

**Files:**
- Modify: `src/domain/deck.ts`
- Modify: `tests/unit/deck.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/deck.test.ts`:

```ts
import { drawNonJoker } from '@/domain/deck';

describe('drawNonJoker', () => {
  it('returns null when only jokers remain', () => {
    const onlyJokers: Card[] = [
      { type: 'joker', id: 1 },
      { type: 'joker', id: 2 },
    ];
    const result = drawNonJoker({
      remaining: onlyJokers,
      difficulty: 'intermediate',
      rng: createRng(1),
    });
    expect(result).toBeNull();
  });

  it('never picks a joker and keeps jokers in the returned remaining pile', () => {
    const deck = build54();
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const result = drawNonJoker({ remaining: deck, difficulty: 'intermediate', rng });
      expect(result).not.toBeNull();
      expect(result!.card.type).not.toBe('joker');
      const jokersInRem = result!.remaining.filter((c) => c.type === 'joker').length;
      expect(jokersInRem).toBe(2);
      expect(result!.remaining).toHaveLength(53);
    }
  });
});
```

You will also need to import `Card` at the top of the file:

```ts
import type { Card } from '@/domain/card';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk vitest run tests/unit/deck.test.ts`
Expected: FAIL — `drawNonJoker` is not exported.

- [ ] **Step 3: Implement `drawNonJoker` in `src/domain/deck.ts`**

Add directly below the existing `drawNonAce` definition (after line 45):

```ts
/** Draw only from non-Joker cards; all Jokers stay in the returned remaining pile. */
export const drawNonJoker = ({ remaining, difficulty, rng }: DrawArgs): DrawResult | null => {
  const pool = remaining.filter((c) => c.type !== 'joker');
  if (pool.length === 0) return null;
  const { card, remaining: poolRem } = draw({ remaining: pool, difficulty, rng });
  const jokers = remaining.filter((c) => c.type === 'joker');
  return { card, remaining: [...poolRem, ...jokers] };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk vitest run tests/unit/deck.test.ts`
Expected: PASS — all `drawNonJoker` tests green; existing tests still green.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/deck.ts tests/unit/deck.test.ts
rtk git commit -m "feat: add drawNonJoker deck helper"
```

---

## Task 2: Block jokers before draw 10 in `gameStore.drawNext`

**Files:**
- Modify: `src/store/gameStore.ts:118-183` (the `drawNext` action)
- Create: `tests/unit/gameStore-draw-rules.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/gameStore-draw-rules.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

const startSession = () => {
  useGameStore.getState().reset();
  useGameStore.getState().start({
    difficulty: 'intermediate',
    equipment: 'bodyweight',
    theme: 'full',
    cardio: false,
  });
};

describe('drawNext — joker block before draw 10', () => {
  beforeEach(() => {
    startSession();
  });

  it('never produces a joker in the first 10 draws across many seeded sessions', () => {
    for (let session = 0; session < 50; session++) {
      startSession();
      for (let i = 0; i < 10; i++) {
        useGameStore.getState().drawNext();
      }
      const drawn = useGameStore.getState().drawn;
      expect(drawn).toHaveLength(10);
      const jokerCount = drawn.filter((c) => c.type === 'joker').length;
      expect(jokerCount).toBe(0);
    }
  });

  it('jokers remain in the deck during the block window', () => {
    for (let i = 0; i < 10; i++) useGameStore.getState().drawNext();
    const remainingJokers = useGameStore
      .getState()
      .deck.filter((c) => c.type === 'joker').length;
    expect(remainingJokers).toBe(2);
  });

  it('jokers become eligible after draw 10', () => {
    let sawJokerAfter = false;
    for (let session = 0; session < 30; session++) {
      startSession();
      for (let i = 0; i < 30; i++) useGameStore.getState().drawNext();
      const after = useGameStore.getState().drawn.slice(10);
      if (after.some((c) => c.type === 'joker')) {
        sawJokerAfter = true;
        break;
      }
    }
    expect(sawJokerAfter).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk vitest run tests/unit/gameStore-draw-rules.test.ts`
Expected: FAIL — at least one of the seeded sessions draws a joker before draw 10.

- [ ] **Step 3: Add `drawNonJoker` import to gameStore**

Modify the import on `src/store/gameStore.ts:4`:

```ts
import { build54, draw, drawNonAce, drawNonJoker, type DrawResult } from '@/domain/deck';
```

- [ ] **Step 4: Add the joker-block branch in `drawNext`**

In `src/store/gameStore.ts`, immediately after the existing ace-block block (after line 147 — the `if (result.card.type === 'ace') { ... }` block) and before `let { card, remaining: rem } = result;`, insert:

```ts
    if (result.card.type === 'joker' && drawnCount < 10) {
      const full = [result.card, ...result.remaining];
      const canAvoidJoker = full.some((c) => c.type !== 'joker');
      if (canAvoidJoker) {
        const alt = drawNonJoker({ remaining: full, difficulty, rng });
        if (alt) result = alt;
      }
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `rtk vitest run tests/unit/gameStore-draw-rules.test.ts`
Expected: PASS — all three tests green.

- [ ] **Step 6: Run the full test suite**

Run: `rtk vitest run`
Expected: PASS — no regressions in existing tests.

- [ ] **Step 7: Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore-draw-rules.test.ts
rtk git commit -m "feat: block joker draws before draw 10"
```

---

## Task 3: Replace `ExercisePanel` joker branch with history-aware layout

**Files:**
- Modify: `src/components/ExercisePanel.tsx:14-72`
- Create: `tests/unit/ExercisePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ExercisePanel.test.tsx`:

```tsx
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { useGameStore } from '@/store/gameStore';
import type { Card } from '@/domain/card';
import type { Exercise } from '@/domain/exercise';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

import { ExercisePanel } from '@/components/ExercisePanel';

const wrap = (ui: ReactElement) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

const seedDrawn = (cards: Card[]) => {
  useGameStore.setState({ drawn: cards });
};

const SIX_HEARTS: Card = { type: 'number', suit: 'hearts', value: 6 };
const EIGHT_SPADES: Card = { type: 'number', suit: 'spades', value: 8 };
const JOKER: Card = { type: 'joker', id: 1 };
const DOUBLE_UP: Exercise = { id: 'double-up' };

beforeEach(() => {
  i18n.activate('en');
  useGameStore.getState().reset();
});

describe('ExercisePanel — Double Up', () => {
  it('renders the heading "Double up"', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    expect(screen.getByText(/double up/i)).toBeInTheDocument();
  });

  it('renders both prior card values (6 and 8)', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    // CardFace renders the value at top-left of each mini
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('renders the "10 reps each" line', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    expect(screen.getByText(/10 reps each/i)).toBeInTheDocument();
  });

  it('does NOT render the joker card inside the panel (top Deck row owns that)', () => {
    seedDrawn([SIX_HEARTS, EIGHT_SPADES, JOKER]);
    render(wrap(<ExercisePanel exercise={DOUBLE_UP} />));
    // The joker label is "★" — it should not appear in the panel
    expect(screen.queryByText('★')).not.toBeInTheDocument();
  });

  it('falls back to plain heading when not double-up', () => {
    seedDrawn([SIX_HEARTS]);
    render(wrap(<ExercisePanel exercise={{ id: 'pushups', reps: 6 }} />));
    expect(screen.getByText('6 reps')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk vitest run tests/unit/ExercisePanel.test.tsx`
Expected: FAIL — current panel renders the joker `★` and the legacy text "Combine the last 2 exercises", not the new layout.

- [ ] **Step 3: Replace the joker branch in `ExercisePanel.tsx`**

Replace `src/components/ExercisePanel.tsx` entirely with:

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { CardFace } from '@/components/CardFace';
import type { Card } from '@/domain/card';
import type { Exercise } from '@/domain/exercise';
import { resolve } from '@/domain/exercise';
import { tExercise } from '@/i18n/exercises';
import { formatMSS } from '@/lib/formatTime';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { useGameStore } from '@/store/gameStore';
import type { ReactNode } from 'react';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  const reduceMotion = useReducedMotion();
  const drawn = useGameStore((s) => s.drawn);
  const config = useGameStore((s) => s.config);
  const overrides = useGameStore((s) => s.overrides);
  const topCard = drawn[drawn.length - 1] ?? null;

  if (!exercise) {
    return (
      <p className="mx-auto w-full max-w-prose text-center text-base leading-relaxed text-muted-foreground">
        <Trans>Tap the stack to draw your first card.</Trans>
      </p>
    );
  }
  const detail = formatDetail(exercise);
  const motionKey = `${exercise.id}-${detail ?? 'x'}`;

  if (exercise.id === 'double-up' && topCard?.type === 'joker') {
    const pair = lastTwoExercises({ drawn, config, overrides });
    if (pair) {
      const [a, b] = pair;
      const nameA = tExercise(a.exercise.id);
      const nameB = tExercise(b.exercise.id);
      return (
        <div className="w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={motionKey}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? DURATION.fast : 0.28, ease: EASE_OUT }}
            >
              <h2 className="text-balance break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {tExercise(exercise.id)}
              </h2>
              <div
                className="mt-4 flex items-center justify-center gap-3"
                role="img"
                aria-label={t`Combine ${nameA} and ${nameB} — 10 reps each`}
              >
                <div className="flex flex-col items-center gap-1" aria-hidden>
                  <CardFace card={a.card} className="!h-24 !w-16 p-2 text-sm [&>span.text-5xl]:text-2xl [&>span.text-2xl]:text-base" />
                  <span className="text-xs text-muted-foreground">{nameA}</span>
                </div>
                <span className="text-xl text-muted-foreground" aria-hidden>+</span>
                <div className="flex flex-col items-center gap-1" aria-hidden>
                  <CardFace card={b.card} className="!h-24 !w-16 p-2 text-sm [&>span.text-5xl]:text-2xl [&>span.text-2xl]:text-base" />
                  <span className="text-xs text-muted-foreground">{nameB}</span>
                </div>
              </div>
              <p className="text-deck-reward mt-4 font-sans text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
                <Trans>10 reps each</Trans>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }
  }

  return (
    <div className="w-full text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={motionKey}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? DURATION.fast : 0.28, ease: EASE_OUT }}
        >
          <h2 className="text-balance break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {tExercise(exercise.id)}
          </h2>
          {detail && (
            <p className="text-deck-reward mt-4 font-sans text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
              {detail}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

type ResolvedPair = { card: Card; exercise: Exercise };

const lastTwoExercises = ({
  drawn,
  config,
  overrides,
}: {
  drawn: Card[];
  config: Parameters<typeof resolve>[0]['config'];
  overrides: Parameters<typeof resolve>[0]['overrides'];
}): [ResolvedPair, ResolvedPair] | null => {
  const picked: ResolvedPair[] = [];
  for (let i = drawn.length - 2; i >= 0 && picked.length < 2; i--) {
    const card = drawn[i]!;
    if (card.type !== 'number' && card.type !== 'face') continue;
    picked.push({ card, exercise: resolve({ card, config, overrides }) });
  }
  if (picked.length < 2) return null;
  return [picked[1]!, picked[0]!];
};

const formatDetail = (ex: Exercise): ReactNode | null => {
  if (ex.reps !== undefined) {
    return (
      <span>
        <Plural value={ex.reps} one="# rep" other="# reps" />
      </span>
    );
  }
  if (ex.durationSec !== undefined) return formatMSS(ex.durationSec);
  if (ex.distanceM !== undefined) return t`${ex.distanceM}m`;
  return null;
};
```

Note on order: `lastTwoExercises` walks backward (newest first) but returns `[older, newer]` so the visual reads chronologically left-to-right.

- [ ] **Step 4: Run the panel tests**

Run: `rtk vitest run tests/unit/ExercisePanel.test.tsx`
Expected: PASS — all five tests green.

- [ ] **Step 5: Run the full test suite**

Run: `rtk vitest run`
Expected: PASS — no regressions.

- [ ] **Step 6: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: PASS.

- [ ] **Step 7: Visual smoke check**

Start the dev server (`rtk pnpm dev` or whatever the project uses) and run a session. Use the browser console:

```js
// quick way to force a Double Up state
const s = window.__store__ ?? null; // skip if not exposed
```

If no store hook is exposed, just play through ≥10 draws until a joker triggers. Verify:
- Top Deck row shows the joker on the right (unchanged).
- Below, the panel shows: heading "Double up", two mini cards with names, `+` between them, "10 reps each" below.
- No duplicated joker card in the panel.

If the dev server can't be started or the joker doesn't surface within reasonable play, **say so explicitly** in the commit body — do not claim visual verification.

- [ ] **Step 8: Commit**

```bash
rtk git add src/components/ExercisePanel.tsx tests/unit/ExercisePanel.test.tsx
rtk git commit -m "feat: show last 2 cards in Double Up panel"
```

---

## Task 4: Update existing translations for the new aria-label

**Files:**
- Modify: `src/locales/en/messages.po` and `src/locales/fr/messages.po` (or compiled `.ts` if source is `.ts`)

- [ ] **Step 1: Extract messages**

Run the project's Lingui extract command (check `package.json` scripts — typically `pnpm lingui:extract` or `rtk pnpm extract`):

```bash
rtk pnpm lingui:extract
```

If the script doesn't exist, look up the project's i18n workflow in `lingui.config.ts` and run the equivalent.

- [ ] **Step 2: Translate the new key in French**

Open `src/locales/fr/messages.po` and find the new entry derived from `` t`Combine ${nameA} and ${nameB} — 10 reps each` ``. Provide the French translation, e.g.:

```
msgid "Combine {0} and {1} — 10 reps each"
msgstr "Combinez {0} et {1} — 10 répétitions chacun"
```

Also translate the new `` <Trans>10 reps each</Trans> ``:

```
msgid "10 reps each"
msgstr "10 répétitions chacun"
```

- [ ] **Step 3: Compile messages**

Run the project's compile script (typically `pnpm lingui:compile`):

```bash
rtk pnpm lingui:compile
```

- [ ] **Step 4: Re-run tests**

Run: `rtk vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/locales
rtk git commit -m "i18n: translate Double Up combine label"
```

---

## Task 5: Append OpenWolf memory entry

**Files:**
- Modify: `.wolf/memory.md`
- Modify: `.wolf/cerebrum.md` (only if a learning surfaced — e.g., draw-block pattern is now a recurring pattern worth remembering)

- [ ] **Step 1: Append to `.wolf/memory.md`**

Append a one-line entry following the project's format `| HH:MM | description | file(s) | outcome | ~tokens |`.

- [ ] **Step 2: Commit**

```bash
rtk git add .wolf/memory.md
rtk git commit -m "chore(wolf): log Double Up history feature"
```

---

## Self-Review

**Spec coverage:**
- Trigger condition (`exercise.id === 'double-up' && topCard?.type === 'joker'`) → Task 3 step 3 ✓
- Two minis joined by `+` with names → Task 3 step 3 + tests ✓
- Joker not duplicated in panel → Task 3 step 1 test 4 ✓
- Lookup walks `drawn` backward and resolves via `resolve(...)` → Task 3 `lastTwoExercises` ✓
- Draw-block rule for jokers before draw 10 → Tasks 1 + 2 ✓
- `drawNonJoker` parallel to `drawNonAce` → Task 1 ✓
- Tests for draw rule + UI → Tasks 2 + 3 ✓
- i18n string change handled → Task 4 ✓

**Placeholder scan:** None.

**Type consistency:**
- `drawNonJoker` signature matches `drawNonAce` (returns `DrawResult | null`) — consistent.
- `lastTwoExercises` returns `[older, newer]` — used directly in render.
- `Card` type imported in both `deck.ts` test additions and `ExercisePanel.tsx`.
