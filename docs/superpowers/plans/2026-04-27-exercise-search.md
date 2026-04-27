# Exercise Search in Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-exercise search sheet on the Review screen so users can pick any movement or face challenge from the DB while keeping curated alts as the fast path.

**Architecture:** New `exerciseDb.ts` builds `ALL_EXERCISES` and `recommendedFor()` from existing `NUMBER_MOVEMENTS` / face challenge tables. `buildPlan` and `resolve` accept any stored `ExerciseId` override; face free-picks inherit the slot default prescription, while curated face alts keep their own reps/duration/distance. UI: Base UI `Dialog` sheet + search field (no autofocus), two modes (empty query = recommended only; active query = flat list, recommended-first).

**Tech Stack:** React 19, Vite, TypeScript, Zustand, Framer Motion, Lingui (`t` / `Trans`), Tailwind v4, Base UI (`@base-ui/react/dialog`), Vitest, Testing Library, Playwright.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/domain/exerciseDb.ts` | `ExerciseEntry`, `ALL_EXERCISES`, `recommendedFor` |
| Modify | `src/domain/plan.ts` | Drop `validIds` gating; any override id becomes `selected` |
| Modify | `src/domain/exercise.ts` | Number: always use override id when set; face: alt match keeps alt rx, else default-slot rx |
| Create | `src/components/review/ExerciseSearchSheet.tsx` | Controlled dialog, search, recommended vs full list, pick handler |
| Modify | `src/components/review/ReviewCard.tsx` | Pass `config`; ghost “Search all exercises”; locked-card entry; sheet wiring |
| Modify | `src/routes/Review.tsx` | Pass `config` into each `ReviewCard` |
| Create | `tests/unit/exerciseDb.test.ts` | Registry + `recommendedFor` |
| Modify | `tests/unit/plan.test.ts` | Invalid override now applies |
| Modify | `tests/unit/exercise.test.ts` | Out-of-catalog overrides + face free-pick rx |
| Modify | `tests/unit/gameStore-workout-overrides.integration.test.ts` | Drain deck with gym id on bodyweight slot |
| Modify | `src/locales/en/messages.po` | New UI strings (via extract) |
| Modify | `src/locales/fr/messages.po` | French translations for new msgids |
| Modify | `tests/e2e/review.spec.ts` | Optional: open search, pick an exercise, assert override dot / persistence |

---

### Task 1: `exerciseDb.ts` — registry + `recommendedFor`

**Files:**
- Create: `src/domain/exerciseDb.ts`
- Test: `tests/unit/exerciseDb.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/exerciseDb.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ALL_EXERCISES, recommendedFor } from '@/domain/exerciseDb';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('ALL_EXERCISES', () => {
  it('includes every movement id at least once', () => {
    const ids = new Set(ALL_EXERCISES.map((e) => e.id));
    expect(ids.has('pushups')).toBe(true);
    expect(ids.has('bench-press')).toBe(true);
  });

  it('tags face challenges with group challenge', () => {
    const burpees = ALL_EXERCISES.find((e) => e.id === 'burpees');
    expect(burpees?.group).toBe('challenge');
  });
});

describe('recommendedFor', () => {
  it('returns default then alts for a suit slot', () => {
    const rows = recommendedFor({ slotKey: 'suit:hearts', config: cfg });
    expect(rows.map((r) => r.id)).toEqual([
      'pushups',
      'pike-pushups',
      'diamond-pushups',
      'decline-pushups',
      'dips',
      'tricep-dips',
    ]);
  });

  it('uses theme and equipment for suit recommendations', () => {
    const rows = recommendedFor({
      slotKey: 'suit:hearts',
      config: { ...cfg, theme: 'upper', equipment: 'gym' },
    });
    expect(rows[0]?.id).toBe('bench-press');
  });

  it('includes cardio face challenges when config.cardio is true', () => {
    const rows = recommendedFor({
      slotKey: 'face:J',
      config: { ...cfg, cardio: true },
    });
    expect(rows.some((r) => r.id === 'skierg')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

Run: `rtk pnpm exec vitest run tests/unit/exerciseDb.test.ts`

Expected: FAIL (module `./exerciseDb` not found or export missing).

- [ ] **Step 3: Add `src/domain/exerciseDb.ts`**

```typescript
import type { FaceRank, Suit } from './card';
import type { Equipment, Theme } from './config';
import type { SetupConfig } from './config';
import type { ExerciseId } from './exercise';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { FaceChallengeId, MovementId } from './mappings';
import type { SlotKey } from './plan';

export type ExerciseGroup = 'push' | 'pull' | 'legs' | 'posterior' | 'challenge';

export type ExerciseEntry = {
  id: ExerciseId;
  group: ExerciseGroup;
  equipment: Equipment[];
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultDistanceM?: number;
};

const THEMES: Theme[] = ['full', 'upper', 'lower'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const EQUIPMENTS: Equipment[] = ['bodyweight', 'weights', 'gym'];
const FACE_ORDER: FaceRank[] = ['J', 'Q', 'K'];

const SUIT_GROUP: Record<Suit, ExerciseGroup> = {
  hearts: 'push',
  diamonds: 'pull',
  clubs: 'legs',
  spades: 'posterior',
};

function buildMovementEntries(): ExerciseEntry[] {
  const meta = new Map<MovementId, { equipment: Set<Equipment>; group: ExerciseGroup }>();

  for (const theme of THEMES) {
    for (const suit of SUITS) {
      const group = SUIT_GROUP[suit];
      for (const eq of EQUIPMENTS) {
        const cell = NUMBER_MOVEMENTS[theme][suit][eq];
        const ids = [cell.id, ...(cell.alts ?? [])] as MovementId[];
        for (const id of ids) {
          let row = meta.get(id);
          if (!row) {
            row = { equipment: new Set(), group };
            meta.set(id, row);
          }
          row.equipment.add(eq);
        }
      }
    }
  }

  return [...meta.entries()]
    .map(([id, row]) => ({
      id: id as ExerciseId,
      group: row.group,
      equipment: [...row.equipment].sort(),
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}

function collectFaceEquipment(): Map<FaceChallengeId, Set<Equipment>> {
  const m = new Map<FaceChallengeId, Set<Equipment>>();
  const add = (id: FaceChallengeId, eq: Equipment) => {
    let s = m.get(id);
    if (!s) {
      s = new Set();
      m.set(id, s);
    }
    s.add(eq);
  };
  for (const rank of FACE_ORDER) {
    for (const eq of EQUIPMENTS) {
      const ch = FACE_CHALLENGES[rank][eq];
      add(ch.id, eq);
      for (const a of ch.alts ?? []) add(a.id, eq);
    }
    const cardio = FACE_CHALLENGES_CARDIO[rank];
    for (const eq of EQUIPMENTS) {
      add(cardio.id, eq);
      for (const a of cardio.alts ?? []) add(a.id, eq);
    }
  }
  return m;
}

function buildFaceEntries(): ExerciseEntry[] {
  const eqMap = collectFaceEquipment();
  const ids = [...eqMap.keys()].sort();
  return ids.map((id) => ({
    id: id as ExerciseId,
    group: 'challenge' as const,
    equipment: [...eqMap.get(id)!].sort(),
  }));
}

export const ALL_EXERCISES: ExerciseEntry[] = (() => {
  const movements = buildMovementEntries();
  const faces = buildFaceEntries();
  return [...movements, ...faces];
})();

export function recommendedFor(args: { slotKey: SlotKey; config: SetupConfig }): ExerciseEntry[] {
  const { slotKey, config } = args;
  const byId = new Map(ALL_EXERCISES.map((e) => [e.id, e]));

  const row = (id: ExerciseId, patch?: Partial<ExerciseEntry>): ExerciseEntry => {
    const base = byId.get(id);
    if (!base) {
      throw new Error(`Unknown exercise id in recommendedFor: ${String(id)}`);
    }
    return { ...base, ...patch };
  };

  if (slotKey.startsWith('suit:')) {
    const suit = slotKey.slice(5) as Suit;
    const cell = NUMBER_MOVEMENTS[config.theme][suit][config.equipment];
    const ids = [cell.id, ...(cell.alts ?? [])] as ExerciseId[];
    return ids.map((id) => row(id));
  }

  const rank = slotKey.slice(5) as FaceRank;
  const src = config.cardio ? FACE_CHALLENGES_CARDIO[rank] : FACE_CHALLENGES[rank][config.equipment];
  const out: ExerciseEntry[] = [];
  out.push(
    row(src.id as ExerciseId, {
      defaultReps: src.reps,
      defaultDurationSec: src.durationSec,
      defaultDistanceM: src.distanceM,
    }),
  );
  for (const a of src.alts ?? []) {
    out.push(
      row(a.id as ExerciseId, {
        defaultReps: a.reps,
        defaultDurationSec: a.durationSec,
        defaultDistanceM: a.distanceM,
      }),
    );
  }
  return out;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `rtk pnpm exec vitest run tests/unit/exerciseDb.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/exerciseDb.ts tests/unit/exerciseDb.test.ts
rtk git commit -m "feat(domain): add exercise registry and recommendedFor"
```

---

### Task 2: `plan.ts` — accept any override id

**Files:**
- Modify: `src/domain/plan.ts` (number block ~27–38, face block ~41–58)
- Modify: `tests/unit/plan.test.ts`

- [ ] **Step 1: Write failing test change**

In `tests/unit/plan.test.ts`, replace the test `ignores an invalid override id not in options` with:

```typescript
  it('applies an override id not in curated options', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': 'bench-press' } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('bench-press');
  });
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `rtk pnpm exec vitest run tests/unit/plan.test.ts -t "applies an override"`

Expected: FAIL (`selected` still `pushups`).

- [ ] **Step 3: Implement**

In `src/domain/plan.ts`, replace the number-slot block:

```typescript
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...(entry.alts ?? []).map((id: MovementId) => ({ id: id as ExerciseId, reps: 0 })),
    ];
    const override = overrides[key];
    const selected: ExerciseId =
      override !== undefined ? override : defaultExercise.id;
    return { key, defaultExercise, options, selected };
```

Replace the face-slot block selection logic:

```typescript
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...((entry.alts ?? []) as Array<{ id: string; reps?: number; durationSec?: number; distanceM?: number }>).map(
        (a) => ({ ...a, id: a.id as ExerciseId }),
      ),
    ];
    const override = overrides[key];
    const selected: ExerciseId =
      override !== undefined ? override : defaultExercise.id;
    return { key, defaultExercise, options, selected };
```

Remove the `validIds` / `selectedOpt` variables entirely in both sections.

- [ ] **Step 4: Run full plan tests**

Run: `rtk pnpm exec vitest run tests/unit/plan.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/domain/plan.ts tests/unit/plan.test.ts
rtk git commit -m "fix(plan): allow any exercise id in review overrides"
```

---

### Task 3: `exercise.ts` — resolve out-of-catalog overrides

**Files:**
- Modify: `src/domain/exercise.ts`
- Modify: `tests/unit/exercise.test.ts`
- Modify: `tests/unit/gameStore-workout-overrides.integration.test.ts`

- [ ] **Step 1: Update unit tests**

In `tests/unit/exercise.test.ts`, replace `ignores a number-card override when id is not in the slot options` with:

```typescript
  it('applies a number-card override even when id is not in the slot options', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'bench-press' };
    const ex = resolve({
      card: { type: 'number', suit: 'hearts', value: 5 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('bench-press');
    expect(ex.reps).toBe(5);
  });
```

Add after the face-card alt test:

```typescript
  it('applies a face-card free-pick with the slot default prescription', () => {
    const overrides: PlanOverrides = { 'face:J': 'bench-press' };
    const ex = resolve({
      card: { type: 'face', suit: 'clubs', rank: 'J' },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('bench-press');
    expect(ex.reps).toBe(15);
    expect(ex.durationSec).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `rtk pnpm exec vitest run tests/unit/exercise.test.ts`

Expected: FAIL on the two new/changed cases.

- [ ] **Step 3: Implement `resolve`**

Replace the `number` branch with:

```typescript
  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    const ov = overrides?.[`suit:${card.suit}`];
    const id = (ov !== undefined ? ov : movement.id) as ExerciseId;
    return { id, reps: card.value };
  }
```

Replace the `face` branch body (keep `ace` / `joker` as-is) with:

```typescript
  if (card.type === 'face') {
    const src = config.cardio ? FACE_CHALLENGES_CARDIO[card.rank] : FACE_CHALLENGES[card.rank][config.equipment];
    const { alts: _alts, ...srcRest } = src as typeof src & { alts?: unknown };
    const ov = overrides?.[`face:${card.rank}`];
    if (ov) {
      const altEntry = (src.alts ?? []).find((a) => a.id === ov);
      if (altEntry) {
        const { id, reps, durationSec, distanceM } = altEntry;
        const ex: Exercise = { id: id as ExerciseId };
        if (reps !== undefined) ex.reps = reps;
        if (durationSec !== undefined) ex.durationSec = durationSec;
        if (distanceM !== undefined) ex.distanceM = distanceM;
        return ex;
      }
      const ex: Exercise = { id: ov as ExerciseId };
      if (src.reps !== undefined) ex.reps = src.reps;
      if (src.durationSec !== undefined) ex.durationSec = src.durationSec;
      if (src.distanceM !== undefined) ex.distanceM = src.distanceM;
      return ex;
    }
    return { ...srcRest, id: src.id as ExerciseId };
  }
```

- [ ] **Step 4: Run exercise unit tests**

Run: `rtk pnpm exec vitest run tests/unit/exercise.test.ts`

Expected: PASS.

- [ ] **Step 5: Add integration coverage**

Append to `tests/unit/gameStore-workout-overrides.integration.test.ts`:

```typescript
  it('applies out-of-catalog suit override through the full deck drain', () => {
    useGameStore.getState().setOverride('suit:hearts', 'bench-press');
    useGameStore.getState().start(cfg);

    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'number' && last.suit === 'hearts') {
        expect(s.current?.id).toBe('bench-press');
        expect(s.current?.reps).toBe(last.value);
      }
    }
  });
```

Run: `rtk pnpm exec vitest run tests/unit/gameStore-workout-overrides.integration.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/domain/exercise.ts tests/unit/exercise.test.ts tests/unit/gameStore-workout-overrides.integration.test.ts
rtk git commit -m "fix(exercise): resolve free-picked overrides outside curated alts"
```

---

### Task 4: `ExerciseSearchSheet` component

**Files:**
- Create: `src/components/review/ExerciseSearchSheet.tsx`
- Create: `tests/unit/ExerciseSearchSheet.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/unit/ExerciseSearchSheet.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { ExerciseSearchSheet } from '@/components/review/ExerciseSearchSheet';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(() => {
  i18n.activate('en');
});

describe('ExerciseSearchSheet', () => {
  it('lists recommended rows when query is empty', () => {
    const onPick = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <ExerciseSearchSheet
          open
          onOpenChange={() => {}}
          slotKey="suit:hearts"
          config={cfg}
          selected="pushups"
          onPick={onPick}
        />
      </I18nProvider>,
    );
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
    const list = screen.getByRole('listbox', { name: /Recommended exercises/i });
    expect(within(list).getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('calls onPick when an option is activated', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <ExerciseSearchSheet
          open
          onOpenChange={() => {}}
          slotKey="suit:hearts"
          config={cfg}
          selected="pushups"
          onPick={onPick}
        />
      </I18nProvider>,
    );
    await user.click(screen.getAllByRole('option')[1]!);
    expect(onPick).toHaveBeenCalledWith('pike-pushups');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `rtk pnpm exec vitest run tests/unit/ExerciseSearchSheet.test.tsx`

Expected: FAIL (component missing or wrong roles).

- [ ] **Step 3: Implement the sheet**

Create `src/components/review/ExerciseSearchSheet.tsx`:

```tsx
import { useMemo, useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { recommendedFor, ALL_EXERCISES, type ExerciseEntry } from '@/domain/exerciseDb';
import type { SlotKey } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';
import { formatMSS } from '@/lib/formatTime';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { Check } from 'lucide-react';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_FAMILY: Record<string, string> = {
  hearts: 'Push',
  diamonds: 'Pull',
  clubs: 'Legs',
  spades: 'Posterior',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: SlotKey;
  config: SetupConfig;
  selected: ExerciseId;
  onPick: (id: ExerciseId) => void;
};

/** Rx label for a row. Suit slots are always card-driven reps (×N). Face rows use entry fields when set (recommended / patched); search hits may omit rx. */
function rxLabel(slotKey: SlotKey, entry: ExerciseEntry): string {
  if (slotKey.startsWith('face:')) {
    if (entry.defaultReps !== undefined) return t`×${entry.defaultReps} reps`;
    if (entry.defaultDurationSec !== undefined) return formatMSS(entry.defaultDurationSec);
    if (entry.defaultDistanceM !== undefined) return t`${entry.defaultDistanceM}m`;
    return '';
  }
  return t`×N reps`;
}

function headerParts(slotKey: SlotKey): { glyph: string; family: string } {
  const m = slotKey.match(/^suit:(.+)$/);
  if (m) {
    const suit = m[1]!;
    return { glyph: SUIT_GLYPH[suit] ?? '', family: SUIT_FAMILY[suit] ?? suit };
  }
  const fm = slotKey.match(/^face:(.+)$/);
  if (fm) return { glyph: fm[1]!, family: t`Challenge` };
  return { glyph: '', family: '' };
}

export function ExerciseSearchSheet({ open, onOpenChange, slotKey, config, selected, onPick }: Props) {
  const { i18n } = useLingui();
  const [query, setQuery] = useState('');
  const recommended = useMemo(() => recommendedFor({ slotKey, config }), [slotKey, config]);
  const recIds = useMemo(() => new Set(recommended.map((r) => r.id)), [recommended]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();
  const { glyph, family } = headerParts(slotKey);

  const filteredSorted = useMemo(() => {
    if (!q) return [];
    const match = (e: ExerciseEntry) => tExercise(e.id).toLowerCase().includes(q);
    const hit = ALL_EXERCISES.filter(match);
    const recFirst = (a: ExerciseEntry, b: ExerciseEntry) => {
      const ar = recIds.has(a.id) ? 0 : 1;
      const br = recIds.has(b.id) ? 0 : 1;
      if (ar !== br) return ar - br;
      return tExercise(a.id).localeCompare(tExercise(b.id), i18n.locale);
    };
    return [...hit].sort(recFirst);
  }, [q, recIds, i18n.locale]);

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    onOpenChange(false);
  };

  const showRecommendedOnly = !q;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Popup
          className={cn(
            'fixed inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] flex-col rounded-t-2xl border border-border/50 bg-background shadow-lg',
            'pb-[env(safe-area-inset-bottom)]',
          )}
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 p-4">
            <Dialog.Title className="font-display text-lg font-semibold">
              {glyph ? (
                <span>
                  {glyph} {family}
                </span>
              ) : (
                family
              )}
            </Dialog.Title>
            <label className="sr-only" htmlFor="exercise-search-input">
              <Trans>Search exercises…</Trans>
            </label>
            <input
              id="exercise-search-input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t`Search exercises…`}
              className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {showRecommendedOnly ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Trans>Recommended</Trans>
                </h2>
                <div role="listbox" aria-label={t`Recommended exercises`} className="flex flex-col gap-2">
                  {recommended.map((entry) => (
                    <ResultRow
                      key={entry.id}
                      entry={entry}
                      selected={selected}
                      rx={rxLabel(slotKey, entry)}
                      onPick={() => handlePick(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div role="listbox" aria-label={t`Search results`} className="flex flex-col gap-2 px-4 py-3">
                {filteredSorted.map((entry) => (
                  <ResultRow
                    key={entry.id}
                    entry={entry}
                    selected={selected}
                    rx={rxLabel(slotKey, entry)}
                    onPick={() => handlePick(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultRow({
  entry,
  selected,
  rx,
  onPick,
}: {
  entry: ExerciseEntry;
  selected: ExerciseId;
  rx: string;
  onPick: () => void;
}) {
  const isSel = entry.id === selected;
  return (
    <div role="option" aria-selected={isSel} className="min-w-0">
      <SetupOptionButton selected={isSel} aria-pressed={isSel} onClick={onPick}>
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {isSel ? <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden /> : null}
            <span className="min-w-0 truncate">{tExercise(entry.id)}</span>
          </span>
          {rx ? (
            <span className="min-w-0 max-w-[45%] shrink truncate text-right text-xs text-muted-foreground">{rx}</span>
          ) : null}
        </span>
      </SetupOptionButton>
    </div>
  );
}
```

Add new msgids to catalogs in Task 6 (`Challenge`, `Recommended exercises`, `Search results`, etc.).

- [ ] **Step 4: Run component test**

Run: `rtk pnpm exec vitest run tests/unit/ExerciseSearchSheet.test.tsx`

Expected: PASS (fix Base UI import path or dialog parts if the bundler resolves `Dialog` differently).

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/review/ExerciseSearchSheet.tsx tests/unit/ExerciseSearchSheet.test.tsx
rtk git commit -m "feat(review): add ExerciseSearchSheet dialog"
```

---

### Task 5: `ReviewCard` + `Review` wiring

**Files:**
- Modify: `src/components/review/ReviewCard.tsx`
- Modify: `src/routes/Review.tsx`

- [ ] **Step 1: Pass `config` from Review**

In `src/routes/Review.tsx`, change the map to:

```tsx
<ReviewCard key={slot.key} config={config} slot={slot} onPick={(id) => handlePick(slot.key, id)} />
```

- [ ] **Step 2: Extend `ReviewCard`**

At top of `ReviewCard.tsx`, add imports:

```typescript
import type { SetupConfig } from '@/domain/config';
import { ExerciseSearchSheet } from '@/components/review/ExerciseSearchSheet';
import { Button } from '@/components/ui/button';
```

Change props:

```typescript
type Props = { config: SetupConfig; slot: PlanSlot; onPick: (id: ExerciseId) => void };
```

Inside the component, after `const [open, setOpen] = useState(false);`, add:

```typescript
  const [searchOpen, setSearchOpen] = useState(false);
```

Replace `selectedOpt` computation with:

```typescript
  const selectedOpt =
    slot.options.find((o) => o.id === slot.selected) ??
    ({ ...slot.defaultExercise, id: slot.selected } as PlanSlot['options'][number]);
```

After the `slot.options.map` loop inside the alts `motion.div`, still only when `open && hasAlts`, append the ghost search button before closing `motion.div`:

```tsx
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 w-full touch-manipulation text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Trans>Search all exercises</Trans>
            </Button>
```

For **locked** cards (`!hasAlts`), render the locked surface `div` **then** the same ghost `Button` below it (not inside the bordered card). Do **not** show the search control when `hasAlts` but the panel is **closed** — spec: search appears only when the alts panel is open.

At the **bottom** of the component (once, after both `hasAlts` / `!hasAlts` branches and after `AnimatePresence`), render a single shared `ExerciseSearchSheet`:

```tsx
      <ExerciseSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        slotKey={slot.key}
        config={config}
        selected={slot.selected}
        onPick={(id) => {
          onPick(id);
          setOpen(false);
        }}
      />
```

Add `Trans` import from `@lingui/react/macro` in `ReviewCard.tsx`.

- [ ] **Step 3: Run full unit suite**

Run: `rtk pnpm test`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/review/ReviewCard.tsx src/routes/Review.tsx
rtk git commit -m "feat(review): wire exercise search from ReviewCard"
```

---

### Task 6: i18n extract + French

**Files:**
- Modify: `src/locales/en/messages.po`
- Modify: `src/locales/fr/messages.po`

- [ ] **Step 1: Extract**

Run: `rtk pnpm run i18n:extract`

Then: `rtk pnpm run i18n:compile`

- [ ] **Step 2: Translate new msgids in `fr/messages.po`**

For every new `msgid` from `ExerciseSearchSheet` / `ReviewCard` (e.g. `Search all exercises`, `Search exercises…`, `Recommended`, `Challenge`, listbox labels), add matching `msgstr` in French. Follow tone of existing `fr` file.

- [ ] **Step 3: Verify**

Run: `rtk pnpm test` and `rtk pnpm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add src/locales/en/messages.po src/locales/fr/messages.po src/locales/en/messages.ts src/locales/fr/messages.ts
rtk git commit -m "chore(i18n): strings for exercise search sheet"
```

(Include any compiled `messages.ts` files if the compile script rewrites them.)

---

### Task 7: Playwright (optional but recommended)

**Files:**
- Modify: `tests/e2e/review.spec.ts`

- [ ] **Step 1: Add test** — after setup lands on review, open a card’s alts, click “Search all exercises”, type a unique substring (e.g. `Bench`), pick “Bench Press”, assert visual override (primary border) or re-open alts and verify selection.

- [ ] **Step 2: Run**

Run: `rtk pnpm run test:e2e -- tests/e2e/review.spec.ts`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
rtk git add tests/e2e/review.spec.ts
rtk git commit -m "test(e2e): exercise search from review"
```

---

## Self-review

**1. Spec coverage**

| Requirement | Task |
|-------------|------|
| `exerciseDb.ts` registry + `recommendedFor` | Task 1 |
| `buildPlan` / `resolve` relax gates; face rx rules | Tasks 2–3 |
| Review UI: search button when alts open + locked escape | Task 5 |
| `ExerciseSearchSheet` layout/behavior (no autofocus, 80dvh, sections, query modes) | Task 4 (+ Task 5) |
| i18n strings | Task 6 |
| Out of scope items | Not planned |

**2. Placeholder scan** — No TBD/TODO/similar placeholders.

**3. Type consistency** — `ExerciseEntry`, `SlotKey`, `ExerciseId`, `SetupConfig` align across domain and UI.

**Execution handoff**

Plan complete and saved to `docs/superpowers/plans/2026-04-27-exercise-search.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Run tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

If **Subagent-Driven** is chosen:

- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development  
- Fresh subagent per task + two-stage review.

If **Inline Execution** is chosen:

- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans  
- Batch execution with checkpoints for review.
