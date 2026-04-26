# Onboarding & Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-start `Setup.tsx` with a real onboarding flow — first-launch concept explainer, 5-step setup wizard (Difficulty → Equipment → Theme → Cardio → Time), and a 1.5s shuffle transition into `/play`.

**Architecture:** New `/onboarding` route gated by a `hasOnboarded` flag stored in a new Dexie `meta` table. `/setup` hosts a `SetupWizard` that owns local draft state seeded from `usePersistedConfig`, then commits via `useGameStore.start` on the final step. A new `/` Index route redirects based on the flag. Step components are dumb (`value`/`onChange`) and live under `src/components/setup/`.

**Tech Stack:** React 19, react-router-dom 7, zustand, dexie 4, framer-motion 12, vitest + @testing-library/react, Playwright. Tailwind v4 + design tokens already present in `globals.css`.

**Spec:** `docs/superpowers/specs/2026-04-26-onboarding-design.md`

---

## File Structure

**New files:**
- `src/store/db.ts` — extended (new table; not new file)
- `src/hooks/useHasOnboarded.ts` — read/write the flag with loading state
- `src/routes/Index.tsx` — redirect based on flag
- `src/routes/Onboarding.tsx` — explainer screen
- `src/components/SetupWizard.tsx` — step state + footer
- `src/components/ShuffleTransition.tsx` — 1.5s overlay
- `src/components/setup/DifficultyStep.tsx`
- `src/components/setup/EquipmentStep.tsx`
- `src/components/setup/ThemeStep.tsx`
- `src/components/setup/CardioStep.tsx`
- `src/components/setup/TimeStep.tsx`
- `src/components/setup/StepShell.tsx` — shared step layout (heading + option list)
- `tests/unit/useHasOnboarded.test.ts`
- `tests/unit/SetupWizard.test.tsx`
- `tests/unit/db-meta.test.ts`
- `tests/e2e/onboarding.spec.ts`

**Modified:**
- `src/store/db.ts` — add Dexie version 2 with `meta` table + `loadHasOnboarded` / `saveHasOnboarded`
- `src/routes/Setup.tsx` — rewrite to host `SetupWizard`
- `src/App.tsx` — register `/`, `/onboarding`, `/setup`
- `tests/e2e/play.spec.ts` — adapt to new entry path

---

## Task 1: Dexie meta table + hasOnboarded helpers

**Files:**
- Modify: `src/store/db.ts`
- Test: `tests/unit/db-meta.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/db-meta.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, loadHasOnboarded, saveHasOnboarded } from '@/store/db';

describe('hasOnboarded persistence', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('returns false when never written', async () => {
    expect(await loadHasOnboarded()).toBe(false);
  });

  it('round-trips true', async () => {
    await saveHasOnboarded(true);
    expect(await loadHasOnboarded()).toBe(true);
  });

  it('round-trips false after true', async () => {
    await saveHasOnboarded(true);
    await saveHasOnboarded(false);
    expect(await loadHasOnboarded()).toBe(false);
  });
});
```

- [ ] **Step 2: Add fake-indexeddb dev dep if missing**

Run: `pnpm list fake-indexeddb 2>&1 | grep -q fake-indexeddb || pnpm add -D fake-indexeddb`
Expected: dependency installed (or already present).

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/unit/db-meta.test.ts`
Expected: FAIL — `loadHasOnboarded` / `saveHasOnboarded` not exported.

- [ ] **Step 4: Implement the schema bump and helpers**

Replace the body of `src/store/db.ts` with:

```ts
import Dexie, { type Table } from 'dexie';
import type { SetupConfig } from '@/domain/config';

export type ConfigRow = { id: 'last'; config: SetupConfig };

export type SessionRow = {
  id?: number;
  startedAt: number;
  durationSec: number;
  drawnCount: number;
  config: SetupConfig;
};

export type MetaRow = { key: string; value: unknown };

class SweatDeckDb extends Dexie {
  configs!: Table<ConfigRow, 'last'>;
  sessions!: Table<SessionRow, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('sweat-deck');
    this.version(1).stores({
      configs: 'id',
      sessions: '++id, startedAt',
    });
    this.version(2).stores({
      configs: 'id',
      sessions: '++id, startedAt',
      meta: 'key',
    });
  }
}

export const db = new SweatDeckDb();

export const loadLastConfig = async (): Promise<SetupConfig | null> => {
  const row = await db.configs.get('last');
  return row?.config ?? null;
};

export const saveLastConfig = async (config: SetupConfig): Promise<void> => {
  await db.configs.put({ id: 'last', config });
};

export const recordSession = async (row: Omit<SessionRow, 'id'>): Promise<number> => {
  return db.sessions.add(row);
};

const HAS_ONBOARDED_KEY = 'hasOnboarded';

export const loadHasOnboarded = async (): Promise<boolean> => {
  const row = await db.meta.get(HAS_ONBOARDED_KEY);
  return row?.value === true;
};

export const saveHasOnboarded = async (value: boolean): Promise<void> => {
  await db.meta.put({ key: HAS_ONBOARDED_KEY, value });
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/unit/db-meta.test.ts`
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add src/store/db.ts tests/unit/db-meta.test.ts package.json pnpm-lock.yaml
git commit -m "feat(store): add meta table + hasOnboarded helpers"
```

---

## Task 2: `useHasOnboarded` hook

**Files:**
- Create: `src/hooks/useHasOnboarded.ts`
- Test: `tests/unit/useHasOnboarded.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/useHasOnboarded.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor, act } from '@testing-library/react';
import { db, saveHasOnboarded } from '@/store/db';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';

describe('useHasOnboarded', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('starts loading false, then resolves to false on fresh db', async () => {
    const { result } = renderHook(() => useHasOnboarded());
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasOnboarded).toBe(false);
  });

  it('reads stored true', async () => {
    await saveHasOnboarded(true);
    const { result } = renderHook(() => useHasOnboarded());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.hasOnboarded).toBe(true);
  });

  it('markOnboarded() persists and updates state', async () => {
    const { result } = renderHook(() => useHasOnboarded());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      await result.current.markOnboarded();
    });
    expect(result.current.hasOnboarded).toBe(true);
    const { result: r2 } = renderHook(() => useHasOnboarded());
    await waitFor(() => expect(r2.current.loaded).toBe(true));
    expect(r2.current.hasOnboarded).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/useHasOnboarded.test.ts`
Expected: FAIL — hook not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useHasOnboarded.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { loadHasOnboarded, saveHasOnboarded } from '@/store/db';

type State = { loaded: boolean; hasOnboarded: boolean };

export const useHasOnboarded = () => {
  const [state, setState] = useState<State>({ loaded: false, hasOnboarded: false });

  useEffect(() => {
    let cancelled = false;
    loadHasOnboarded().then((v) => {
      if (!cancelled) setState({ loaded: true, hasOnboarded: v });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markOnboarded = useCallback(async () => {
    await saveHasOnboarded(true);
    setState({ loaded: true, hasOnboarded: true });
  }, []);

  return { ...state, markOnboarded };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/useHasOnboarded.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHasOnboarded.ts tests/unit/useHasOnboarded.test.ts
git commit -m "feat(hooks): add useHasOnboarded"
```

---

## Task 3: Step shell + Difficulty step

**Files:**
- Create: `src/components/setup/StepShell.tsx`
- Create: `src/components/setup/DifficultyStep.tsx`

`StepShell` is the shared layout for every step: heading, optional sub-text, vertical option list. Each option is a button that calls `onSelect`. The selected one gets a `data-selected` attr for styling and tests.

- [ ] **Step 1: Create the step shell**

Create `src/components/setup/StepShell.tsx`:

```tsx
import { type ReactNode } from 'react';

export type StepOption<T extends string | number | boolean> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string | number | boolean> = {
  heading: string;
  subtitle?: string;
  options: ReadonlyArray<StepOption<T>>;
  value: T;
  onSelect: (value: T) => void;
  footer?: ReactNode;
};

export function StepShell<T extends string | number | boolean>(props: Props<T>) {
  const { heading, subtitle, options, value, onSelect } = props;
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
        {subtitle ? <p className="text-deck-muted text-sm">{subtitle}</p> : null}
      </header>
      <ul className="flex flex-col gap-2" role="radiogroup" aria-label={heading}>
        {options.map((opt) => {
          const selected = String(opt.value) === String(value);
          return (
            <li key={String(opt.value)}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                data-selected={selected || undefined}
                onClick={() => onSelect(opt.value)}
                className="border-deck-border/40 hover:border-deck-border data-[selected]:border-deck-reward data-[selected]:bg-deck-surface flex w-full items-center justify-between rounded-xl border bg-transparent px-4 py-4 text-left transition-colors"
              >
                <span className="font-medium">{opt.label}</span>
                {opt.hint ? <span className="text-deck-muted text-xs">{opt.hint}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Create the Difficulty step**

Create `src/components/setup/DifficultyStep.tsx`:

```tsx
import type { Difficulty } from '@/domain/difficulty';
import { StepShell, type StepOption } from './StepShell';

const OPTIONS: ReadonlyArray<StepOption<Difficulty>> = [
  { value: 'beginner', label: 'Beginner', hint: 'Light reps' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Balanced' },
  { value: 'hard', label: 'Hard', hint: 'High volume' },
  { value: 'advanced', label: 'Advanced', hint: 'Heavy bias' },
  { value: 'hell', label: 'Hell', hint: 'Survival mode' },
];

type Props = { value: Difficulty; onChange: (v: Difficulty) => void };

export function DifficultyStep({ value, onChange }: Props) {
  return (
    <StepShell
      heading="How hard?"
      subtitle="Shifts the deck toward higher rep counts."
      options={OPTIONS}
      value={value}
      onSelect={onChange}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/StepShell.tsx src/components/setup/DifficultyStep.tsx
git commit -m "feat(setup): step shell + difficulty step"
```

---

## Task 4: Equipment, Theme, Cardio, Time step components

**Files:**
- Create: `src/components/setup/EquipmentStep.tsx`
- Create: `src/components/setup/ThemeStep.tsx`
- Create: `src/components/setup/CardioStep.tsx`
- Create: `src/components/setup/TimeStep.tsx`

- [ ] **Step 1: Equipment step**

Create `src/components/setup/EquipmentStep.tsx`:

```tsx
import type { Equipment } from '@/domain/config';
import { StepShell, type StepOption } from './StepShell';

const OPTIONS: ReadonlyArray<StepOption<Equipment>> = [
  { value: 'bodyweight', label: 'Bodyweight', hint: 'No gear' },
  { value: 'weights', label: 'Weights', hint: 'DBs / KBs' },
  { value: 'gym', label: 'Full Gym', hint: 'Everything' },
];

type Props = { value: Equipment; onChange: (v: Equipment) => void };

export function EquipmentStep({ value, onChange }: Props) {
  return (
    <StepShell
      heading="What gear do you have?"
      options={OPTIONS}
      value={value}
      onSelect={onChange}
    />
  );
}
```

- [ ] **Step 2: Theme step**

Create `src/components/setup/ThemeStep.tsx`:

```tsx
import type { Theme } from '@/domain/config';
import { StepShell, type StepOption } from './StepShell';

const OPTIONS: ReadonlyArray<StepOption<Theme>> = [
  { value: 'upper', label: 'Upper body' },
  { value: 'lower', label: 'Lower body' },
  { value: 'full', label: 'Full body' },
];

type Props = { value: Theme; onChange: (v: Theme) => void };

export function ThemeStep({ value, onChange }: Props) {
  return (
    <StepShell heading="Pick a theme" options={OPTIONS} value={value} onSelect={onChange} />
  );
}
```

- [ ] **Step 3: Cardio step**

Create `src/components/setup/CardioStep.tsx`:

```tsx
import { StepShell, type StepOption } from './StepShell';

const OPTIONS: ReadonlyArray<StepOption<boolean>> = [
  { value: false, label: 'Off', hint: 'Standard face cards' },
  { value: true, label: 'On', hint: 'Rower / SkiErg / Bike challenges' },
];

type Props = { value: boolean; onChange: (v: boolean) => void };

export function CardioStep({ value, onChange }: Props) {
  return (
    <StepShell
      heading="Specialty cardio?"
      subtitle="Affects face card challenges."
      options={OPTIONS}
      value={value}
      onSelect={onChange}
    />
  );
}
```

- [ ] **Step 4: Time step**

Create `src/components/setup/TimeStep.tsx`:

```tsx
import { StepShell, type StepOption } from './StepShell';

// 0 represents "No limit" — translated to undefined at the wizard boundary.
const OPTIONS: ReadonlyArray<StepOption<number>> = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 0, label: 'No limit' },
];

type Props = { value: number | undefined; onChange: (v: number | undefined) => void };

export function TimeStep({ value, onChange }: Props) {
  const numeric = value ?? 0;
  return (
    <StepShell
      heading="Set the clock"
      options={OPTIONS}
      value={numeric}
      onSelect={(v) => onChange(v === 0 ? undefined : v)}
    />
  );
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/setup/EquipmentStep.tsx src/components/setup/ThemeStep.tsx src/components/setup/CardioStep.tsx src/components/setup/TimeStep.tsx
git commit -m "feat(setup): equipment/theme/cardio/time step components"
```

---

## Task 5: ShuffleTransition component

**Files:**
- Create: `src/components/ShuffleTransition.tsx`

A full-screen overlay that animates for ~1.5s then calls `onComplete`. Uses framer-motion. Reduced-motion safe.

- [ ] **Step 1: Implement**

Create `src/components/ShuffleTransition.tsx`:

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

type Props = { onComplete: () => void };

const DURATION_MS = 1500;

export function ShuffleTransition({ onComplete }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(onComplete, reduce ? 250 : DURATION_MS);
    return () => window.clearTimeout(t);
  }, [onComplete, reduce]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Shuffling deck"
      data-testid="shuffle-transition"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-deck-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative h-32 w-24">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="border-deck-border/60 bg-deck-card absolute inset-0 rounded-xl border shadow-lg"
            initial={{ rotate: 0, x: 0 }}
            animate={
              reduce
                ? { rotate: 0 }
                : { rotate: [0, -8 + i * 8, 0], x: [0, -10 + i * 10, 0] }
            }
            transition={{ duration: 1.2, repeat: 0, delay: i * 0.05 }}
          />
        ))}
      </div>
      <p className="text-deck-muted text-sm">Shuffling…</p>
    </motion.div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShuffleTransition.tsx
git commit -m "feat(setup): shuffle transition overlay"
```

---

## Task 6: SetupWizard — TDD

**Files:**
- Create: `src/components/SetupWizard.tsx`
- Test: `tests/unit/SetupWizard.test.tsx`

The wizard owns: step index (0–4), draft `SetupConfig`, footer with Back/Next/Start. On Start, it calls `useGameStore.start(draft)` and `onStart()` (parent renders the shuffle, then navigates).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/SetupWizard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupWizard } from '@/components/SetupWizard';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import { useGameStore } from '@/store/gameStore';

const renderWizard = (overrides?: Partial<{ initial: SetupConfig; onStart: () => void }>) => {
  const onStart = overrides?.onStart ?? vi.fn();
  render(<SetupWizard initial={overrides?.initial ?? DEFAULT_CONFIG} onStart={onStart} />);
  return { onStart };
};

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('SetupWizard', () => {
  it('starts on step 1 (Difficulty) with no Back button', () => {
    renderWizard();
    expect(screen.getByRole('heading', { name: /how hard/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('advances through 5 steps in order: Difficulty → Equipment → Theme → Cardio → Time', async () => {
    const user = userEvent.setup();
    renderWizard();
    const next = () => user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('heading', { name: /how hard/i })).toBeInTheDocument();
    await next();
    expect(screen.getByRole('heading', { name: /what gear/i })).toBeInTheDocument();
    await next();
    expect(screen.getByRole('heading', { name: /pick a theme/i })).toBeInTheDocument();
    await next();
    expect(screen.getByRole('heading', { name: /specialty cardio/i })).toBeInTheDocument();
    await next();
    expect(screen.getByRole('heading', { name: /set the clock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
  });

  it('Back returns to previous step', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { name: /how hard/i })).toBeInTheDocument();
  });

  it('seeds defaults from initial prop', () => {
    renderWizard({ initial: { ...DEFAULT_CONFIG, difficulty: 'hell' } });
    const hellOption = screen.getByRole('radio', { name: /hell/i });
    expect(hellOption).toHaveAttribute('aria-checked', 'true');
  });

  it('persists user changes across step navigation', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('radio', { name: /^hard$/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('radio', { name: /^hard$/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('Start commits the draft config to the game store and calls onStart', async () => {
    const user = userEvent.setup();
    const { onStart } = renderWizard();

    // Walk all the way to step 5
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }
    await user.click(screen.getByRole('radio', { name: /no limit/i }));
    await user.click(screen.getByRole('button', { name: /^start$/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    const stored = useGameStore.getState();
    expect(stored.config).toMatchObject({ ...DEFAULT_CONFIG, timeLimitMin: undefined });
    expect(stored.deck.length).toBe(54);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/SetupWizard.test.tsx`
Expected: FAIL — `SetupWizard` not found.

- [ ] **Step 3: Implement SetupWizard**

Create `src/components/SetupWizard.tsx`:

```tsx
import { useState } from 'react';
import type { SetupConfig } from '@/domain/config';
import { useGameStore } from '@/store/gameStore';
import { DifficultyStep } from './setup/DifficultyStep';
import { EquipmentStep } from './setup/EquipmentStep';
import { ThemeStep } from './setup/ThemeStep';
import { CardioStep } from './setup/CardioStep';
import { TimeStep } from './setup/TimeStep';

type Props = {
  initial: SetupConfig;
  onStart: () => void;
};

const STEP_COUNT = 5;

export function SetupWizard({ initial, onStart }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SetupConfig>(initial);
  const startGame = useGameStore((s) => s.start);

  const isLast = step === STEP_COUNT - 1;
  const isFirst = step === 0;

  const next = () => {
    if (isLast) {
      startGame(draft);
      onStart();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 pt-8 pb-6">
      <ProgressBar step={step} total={STEP_COUNT} />
      <div className="flex-1">{renderStep({ step, draft, setDraft })}</div>
      <footer className="flex gap-3">
        {!isFirst ? (
          <button
            type="button"
            onClick={back}
            className="border-deck-border/40 flex-1 rounded-xl border px-4 py-3 font-medium"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={next}
          className="bg-deck-reward text-deck-card flex-1 rounded-xl px-4 py-3 font-semibold"
        >
          {isLast ? 'Start' : 'Next'}
        </button>
      </footer>
    </section>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            'h-1 flex-1 rounded-full ' +
            (i <= step ? 'bg-deck-reward' : 'bg-deck-border/40')
          }
        />
      ))}
    </div>
  );
}

function renderStep({
  step,
  draft,
  setDraft,
}: {
  step: number;
  draft: SetupConfig;
  setDraft: (d: SetupConfig) => void;
}) {
  switch (step) {
    case 0:
      return (
        <DifficultyStep
          value={draft.difficulty}
          onChange={(difficulty) => setDraft({ ...draft, difficulty })}
        />
      );
    case 1:
      return (
        <EquipmentStep
          value={draft.equipment}
          onChange={(equipment) => setDraft({ ...draft, equipment })}
        />
      );
    case 2:
      return (
        <ThemeStep
          value={draft.theme}
          onChange={(theme) => setDraft({ ...draft, theme })}
        />
      );
    case 3:
      return (
        <CardioStep
          value={draft.cardio}
          onChange={(cardio) => setDraft({ ...draft, cardio })}
        />
      );
    case 4:
      return (
        <TimeStep
          value={draft.timeLimitMin}
          onChange={(timeLimitMin) => setDraft({ ...draft, timeLimitMin })}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/SetupWizard.test.tsx`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/SetupWizard.tsx tests/unit/SetupWizard.test.tsx
git commit -m "feat(setup): wizard component with step navigation"
```

---

## Task 7: Onboarding route

**Files:**
- Create: `src/routes/Onboarding.tsx`

`Onboarding` reads `?replay=1` from search params: in replay mode it does NOT write `hasOnboarded` and goes back to `/setup` on completion.

- [ ] **Step 1: Implement**

Create `src/routes/Onboarding.tsx`:

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';

const BULLETS = [
  '54 cards. Each one is an exercise.',
  'Suits decide the movement pattern.',
  'Numbers decide the reps.',
  'Face cards (J/Q/K) are tough fixed challenges.',
  'Aces are 1-minute rest breaks.',
  'Jokers are wildcards — expect chaos.',
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isReplay = params.get('replay') === '1';
  const { markOnboarded } = useHasOnboarded();

  const proceed = async () => {
    if (!isReplay) await markOnboarded();
    navigate('/setup', { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-6 pt-12 pb-6">
      <header className="flex flex-col gap-2">
        <p className="text-deck-muted text-xs uppercase tracking-widest">Welcome</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sweat Deck</h1>
        <p className="text-deck-muted text-sm">A workout driven by a deck of cards.</p>
      </header>
      <ul className="flex flex-col gap-3 py-8">
        {BULLETS.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="bg-deck-reward mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
            <span className="text-base">{b}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={proceed}
        className="bg-deck-reward text-deck-card w-full rounded-xl px-4 py-4 text-lg font-semibold"
      >
        Got it
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Onboarding.tsx
git commit -m "feat(routes): onboarding explainer screen"
```

---

## Task 8: Index redirect route

**Files:**
- Create: `src/routes/Index.tsx`

`Index` is `/`. It waits for `useHasOnboarded.loaded`, then redirects.

- [ ] **Step 1: Implement**

Create `src/routes/Index.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';

export default function Index() {
  const { loaded, hasOnboarded } = useHasOnboarded();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    navigate(hasOnboarded ? '/setup' : '/onboarding', { replace: true });
  }, [loaded, hasOnboarded, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-deck-muted text-sm">Loading…</p>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Index.tsx
git commit -m "feat(routes): index redirect based on onboarded flag"
```

---

## Task 9: Rewrite Setup.tsx to host the wizard + shuffle

**Files:**
- Modify: `src/routes/Setup.tsx`

`Setup` waits for `usePersistedConfig.loaded`, renders `<SetupWizard initial={config} onStart={...} />`. When the wizard signals start, it shows `<ShuffleTransition />` then navigates to `/play`. Top-right "?" button links to `/onboarding?replay=1`.

- [ ] **Step 1: Replace the file**

Replace `src/routes/Setup.tsx` entirely with:

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SetupWizard } from '@/components/SetupWizard';
import { ShuffleTransition } from '@/components/ShuffleTransition';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';

export default function Setup() {
  const { config, loaded } = usePersistedConfig();
  const [shuffling, setShuffling] = useState(false);
  const navigate = useNavigate();

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-deck-muted text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <>
      <Link
        to="/onboarding?replay=1"
        aria-label="Replay tutorial"
        className="text-deck-muted border-deck-border/40 hover:text-deck-text fixed right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full border bg-deck-surface/60 text-sm"
      >
        ?
      </Link>
      <SetupWizard initial={config} onStart={() => setShuffling(true)} />
      {shuffling ? <ShuffleTransition onComplete={() => navigate('/play')} /> : null}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Setup.tsx
git commit -m "feat(routes): host setup wizard + shuffle transition"
```

---

## Task 10: Wire routes in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/App.tsx` entirely with:

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AnimatedLayout } from '@/components/AnimatedLayout';
import Index from './routes/Index';
import Onboarding from './routes/Onboarding';
import Setup from './routes/Setup';
import Play from './routes/Play';
import Summary from './routes/Summary';
import History from './routes/History';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AnimatedLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/play" element={<Play />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm tsc -b && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manually verify in dev**

Run: `pnpm dev`
Expected:
- Open http://localhost:5173 — first time you should land on `/onboarding`.
- Click "Got it" → `/setup` shows wizard step 1.
- Walk all 5 steps → shuffle overlay → `/play`.
- Reload `/` — you should go straight to `/setup` (no onboarding).
- Click "?" on `/setup` → onboarding screen → "Got it" returns to `/setup`.

Stop the dev server when satisfied.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(routes): wire / onboarding setup play summary history"
```

---

## Task 11: Update existing E2E test for new entry path

**Files:**
- Modify: `tests/e2e/play.spec.ts`

`play.spec.ts` currently navigates to `/` and expects to land on `/play`. With onboarding, that no longer holds. Update it to seed `hasOnboarded` and last config via IndexedDB before the page load, then go directly to `/setup` and walk the wizard, OR navigate directly to `/play` if seeded session is acceptable. The cleanest path is to navigate directly to `/setup` and walk the wizard.

- [ ] **Step 1: Replace the file**

Replace `tests/e2e/play.spec.ts` entirely with:

```ts
import { test, expect } from '@playwright/test';

const completeWizard = async (page: import('@playwright/test').Page) => {
  await page.goto('/setup');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/play$/);
};

test('draws 5 cards then finishes to summary', async ({ page }) => {
  await completeWizard(page);

  const drawBtn = page.getByRole('button', { name: 'Draw card' });
  for (let i = 0; i < 5; i++) {
    await drawBtn.click();
  }

  await expect(page.getByText('Do this')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByText('Workout complete')).toBeVisible();
  await expect(page.getByText('5')).toBeVisible();
});
```

- [ ] **Step 2: Run e2e**

Run: `pnpm test:e2e`
Expected: 1 passing.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/play.spec.ts
git commit -m "test(e2e): update entry path through setup wizard"
```

---

## Task 12: New E2E — onboarding flow

**Files:**
- Create: `tests/e2e/onboarding.spec.ts`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/onboarding.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  // fresh storage per test — Playwright contexts don't persist by default,
  // but we explicitly clear IndexedDB on the page after navigation below.
});

test('first-launch shows onboarding, then setup, then play', async ({ page }) => {
  await page.goto('/');
  // Ensure fresh storage so the onboarded flag isn't carried over.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('sweat-deck');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });
  await page.goto('/');

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { name: 'Sweat Deck' })).toBeVisible();

  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole('heading', { name: /how hard/i })).toBeVisible();

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/play$/);
});

test('returning user skips onboarding', async ({ page }) => {
  // Walk through onboarding once.
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('sweat-deck');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);

  // Reload — should now go straight to /setup.
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
});

test('replay tutorial does not change onboarded state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('sweat-deck');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByRole('link', { name: 'Replay tutorial' }).click();
  await expect(page).toHaveURL(/\/onboarding\?replay=1$/);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);

  // Still onboarded after replay — / should resolve to /setup.
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
});
```

- [ ] **Step 2: Run e2e**

Run: `pnpm test:e2e tests/e2e/onboarding.spec.ts`
Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/onboarding.spec.ts
git commit -m "test(e2e): onboarding flow + replay + returning user"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full unit suite**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 2: Full e2e suite**

Run: `pnpm test:e2e`
Expected: all green.

- [ ] **Step 3: Type-check + lint + build**

Run: `pnpm tsc -b && pnpm lint && pnpm build`
Expected: no errors.

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev` and verify:
1. Fresh load (clear site data first) → `/onboarding` → "Got it" → `/setup` step 1.
2. Five steps tap "Next/Start" → shuffle overlay → `/play`.
3. Draw a card and complete a session → "Play again" returns to `/setup` directly (skipping onboarding).
4. Replay tutorial via "?" → `/onboarding?replay=1` → "Got it" returns to `/setup`, still no auto-onboarding next visit.

Stop the dev server.

- [ ] **Step 5: Final commit if anything was tweaked**

```bash
git status
# only commit if there are leftover changes from the manual smoke fix-ups
```

---

## Notes for the executor

- Tailwind tokens (`bg-deck-*`, `text-deck-*`, `border-deck-*`, `bg-deck-reward`) are defined in `src/styles/globals.css`. If a token is missing, fall back to plain neutral classes — do NOT invent new tokens.
- The dexie schema bump from v1 → v2 is non-destructive (only adds a table). Existing users keep `configs` and `sessions` rows; `meta` starts empty, so they are treated as not-yet-onboarded. That's intentional — first existing user sees the explainer once.
- `useGameStore.start` already calls `saveLastConfig`, so the wizard does NOT need to call it directly.
- The shuffle transition's reduced-motion path (250ms) is a deliberate accessibility shortcut — keep it.
