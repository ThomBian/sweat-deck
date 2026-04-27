# Timed Exercise Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a card with `durationSec` is drawn, show a circular countdown ring below the exercise name; the user taps it to start, and on completion the device vibrates + beeps.

**Architecture:** A `useExerciseCountdown` hook manages `phase`/`remaining`/`start` and auto-pauses via `useGameStore`'s `pausedAt`. An `ExerciseCountdown` SVG ring component consumes the hook. `Play.tsx` renders the ring conditionally and uses a `key` prop to reset it on each new draw. `ExercisePanel` suppresses the `durationSec` text since the ring replaces it.

**Tech Stack:** React 19, Zustand, Framer Motion, Vitest + @testing-library/react, Web Audio API, `navigator.vibrate`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useExerciseCountdown.ts` | Create | Phase FSM, 1 s interval, pause/resume, completion side-effects |
| `src/components/ExerciseCountdown.tsx` | Create | SVG ring UI (idle/running/done), color variants |
| `src/routes/Play.tsx` | Modify | Render `ExerciseCountdown` below `ExercisePanel` with `key={drawn.length}` |
| `src/components/ExercisePanel.tsx` | Modify | Suppress `durationSec` detail text |
| `tests/unit/useExerciseCountdown.test.ts` | Create | Hook unit tests (fake timers, store mock) |
| `tests/unit/ExerciseCountdown.test.tsx` | Create | Component render tests |

---

## Task 1: Failing tests for `useExerciseCountdown`

**Files:**
- Create: `tests/unit/useExerciseCountdown.test.ts`

- [ ] **Step 1: Create the test file**

```ts
// tests/unit/useExerciseCountdown.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useExerciseCountdown } from '@/hooks/useExerciseCountdown';

// Mutable state the mock selector reads — change between tests to simulate pause
const storeState = { pausedAt: null as number | null };

vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector: (s: typeof storeState) => unknown) =>
    selector(storeState),
}));

describe('useExerciseCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storeState.pausedAt = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle with remaining equal to durationSec', () => {
    const { result } = renderHook(() => useExerciseCountdown(30));
    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(30);
  });

  it('transitions to running on start()', () => {
    const { result } = renderHook(() => useExerciseCountdown(30));
    act(() => result.current.start());
    expect(result.current.phase).toBe('running');
    expect(result.current.remaining).toBe(30);
  });

  it('ticks remaining down each second', () => {
    const { result } = renderHook(() => useExerciseCountdown(5));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(2);
  });

  it('transitions to done when remaining reaches 0', () => {
    const { result } = renderHook(() => useExerciseCountdown(3));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.phase).toBe('done');
    expect(result.current.remaining).toBe(0);
  });

  it('resets to idle when durationSec changes (new card drawn)', () => {
    let duration = 10;
    const { result, rerender } = renderHook(() => useExerciseCountdown(duration));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(7);

    duration = 20;
    rerender();
    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(20);
  });

  it('pauses the interval when pausedAt is set', () => {
    const { result, rerender } = renderHook(() => useExerciseCountdown(10));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(7);

    storeState.pausedAt = Date.now();
    rerender();
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.remaining).toBe(7);
  });

  it('resumes without losing remaining time when pausedAt clears', () => {
    const { result, rerender } = renderHook(() => useExerciseCountdown(10));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));  // remaining = 7

    storeState.pausedAt = Date.now();
    rerender();
    act(() => vi.advanceTimersByTime(5000));  // paused — no change

    storeState.pausedAt = null;
    rerender();
    act(() => vi.advanceTimersByTime(2000));  // remaining = 5
    expect(result.current.remaining).toBe(5);
    expect(result.current.phase).toBe('running');
  });
});
```

- [ ] **Step 2: Run tests — verify they all fail with "Cannot find module"**

```bash
rtk vitest run tests/unit/useExerciseCountdown.test.ts
```

Expected: `Cannot find module '@/hooks/useExerciseCountdown'`

- [ ] **Step 3: Commit failing tests**

```bash
rtk git add tests/unit/useExerciseCountdown.test.ts
rtk git commit -m "wip: failing tests for useExerciseCountdown"
```

---

## Task 2: Implement `useExerciseCountdown`

**Files:**
- Create: `src/hooks/useExerciseCountdown.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useExerciseCountdown.ts
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export type ExerciseCountdownPhase = 'idle' | 'running' | 'done';

type Result = {
  phase: ExerciseCountdownPhase;
  remaining: number;
  start: () => void;
};

const fireCompletion = (): void => {
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    gain.connect(ctx.destination);
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.18);
    });
  } catch {}
};

export function useExerciseCountdown(durationSec: number | undefined): Result {
  const [phase, setPhase] = useState<ExerciseCountdownPhase>('idle');
  const [remaining, setRemaining] = useState(durationSec ?? 0);
  const pausedAt = useGameStore((s) => s.pausedAt);

  // Reset when durationSec changes (new card drawn)
  useEffect(() => {
    setPhase('idle');
    setRemaining(durationSec ?? 0);
  }, [durationSec]);

  // Tick interval — active only when running and not paused
  useEffect(() => {
    if (phase !== 'running' || pausedAt) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, pausedAt]);

  // Detect completion
  useEffect(() => {
    if (phase === 'running' && remaining === 0) {
      setPhase('done');
      fireCompletion();
    }
  }, [phase, remaining]);

  const start = () => setPhase((p) => (p === 'idle' ? 'running' : p));

  return { phase, remaining, start };
}
```

- [ ] **Step 2: Run tests — verify they all pass**

```bash
rtk vitest run tests/unit/useExerciseCountdown.test.ts
```

Expected: `8 tests passed`

- [ ] **Step 3: Commit**

```bash
rtk git add src/hooks/useExerciseCountdown.ts
rtk git commit -m "feat: add useExerciseCountdown hook"
```

---

## Task 3: Failing tests for `ExerciseCountdown`

**Files:**
- Create: `tests/unit/ExerciseCountdown.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// tests/unit/ExerciseCountdown.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExerciseCountdownPhase } from '@/hooks/useExerciseCountdown';

// Mock framer-motion to avoid JSDOM animation issues
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

// Mock the hook so component tests are isolated from hook logic
const mockHook = {
  phase: 'idle' as ExerciseCountdownPhase,
  remaining: 60,
  start: vi.fn(),
};

vi.mock('@/hooks/useExerciseCountdown', () => ({
  useExerciseCountdown: () => mockHook,
}));

import { ExerciseCountdown } from '@/components/ExerciseCountdown';

describe('ExerciseCountdown', () => {
  beforeEach(() => {
    mockHook.phase = 'idle';
    mockHook.remaining = 60;
    mockHook.start = vi.fn();
  });

  it('renders "tap to start" in idle state', () => {
    render(<ExerciseCountdown durationSec={60} />);
    expect(screen.getByText(/tap to start/i)).toBeInTheDocument();
  });

  it('clicking the ring calls start() when idle', () => {
    render(<ExerciseCountdown durationSec={60} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockHook.start).toHaveBeenCalledOnce();
  });

  it('shows formatted countdown in running state', () => {
    mockHook.phase = 'running';
    mockHook.remaining = 45;
    render(<ExerciseCountdown durationSec={60} />);
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('shows checkmark in done state', () => {
    mockHook.phase = 'done';
    mockHook.remaining = 0;
    render(<ExerciseCountdown durationSec={60} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('button is disabled when not idle', () => {
    mockHook.phase = 'running';
    mockHook.remaining = 30;
    render(<ExerciseCountdown durationSec={60} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests — verify they all fail with "Cannot find module"**

```bash
rtk vitest run tests/unit/ExerciseCountdown.test.tsx
```

Expected: `Cannot find module '@/components/ExerciseCountdown'`

- [ ] **Step 3: Commit failing tests**

```bash
rtk git add tests/unit/ExerciseCountdown.test.tsx
rtk git commit -m "wip: failing tests for ExerciseCountdown component"
```

---

## Task 4: Implement `ExerciseCountdown`

**Files:**
- Create: `src/components/ExerciseCountdown.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ExerciseCountdown.tsx
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { cn } from '@/lib/utils';
import { useExerciseCountdown } from '@/hooks/useExerciseCountdown';

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const fmt = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

type Props = {
  durationSec: number;
  isRest?: boolean;
};

export const ExerciseCountdown = ({ durationSec, isRest = false }: Props) => {
  const { phase, remaining, start } = useExerciseCountdown(durationSec);
  const reduceMotion = useReducedMotion();

  const progress = durationSec > 0 ? remaining / durationSec : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const ringColor = isRest ? 'text-sky-400' : 'text-deck-reward';
  const trackColor = isRest ? 'text-sky-400/15' : 'text-deck-reward/15';

  const isIdle = phase === 'idle';
  const isDone = phase === 'done';

  const ariaLabel = isIdle
    ? t`Start ${durationSec} second timer`
    : isDone
      ? t`Exercise complete`
      : t`${remaining} seconds remaining`;

  return (
    <button
      type="button"
      onClick={isIdle ? start : undefined}
      disabled={!isIdle}
      className={cn(
        'relative flex size-36 items-center justify-center rounded-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        isIdle ? 'cursor-pointer' : 'cursor-default',
      )}
      aria-label={ariaLabel}
    >
      <svg
        className="absolute inset-0 size-full -rotate-90"
        viewBox="0 0 112 112"
        aria-hidden
      >
        {/* Background track */}
        <circle
          cx="56"
          cy="56"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className={cn('stroke-current', trackColor)}
        />
        {/* Progress arc */}
        <motion.circle
          cx="56"
          cy="56"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn('stroke-current', isDone && 'opacity-30', ringColor)}
          style={{ strokeDasharray: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
        />
      </svg>

      <div className="relative flex select-none flex-col items-center gap-0.5">
        {isDone ? (
          <span className={cn('text-4xl font-bold', ringColor)}>✓</span>
        ) : (
          <>
            <span
              className={cn(
                'text-3xl font-bold tabular-nums tracking-tight',
                ringColor,
                isIdle && 'opacity-60',
              )}
            >
              {fmt(remaining)}
            </span>
            {isIdle && (
              <span className="text-xs font-medium text-muted-foreground">
                {t`tap to start`}
              </span>
            )}
          </>
        )}
      </div>
    </button>
  );
};
```

- [ ] **Step 2: Run tests — verify they all pass**

```bash
rtk vitest run tests/unit/ExerciseCountdown.test.tsx
```

Expected: `5 tests passed`

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
rtk vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/ExerciseCountdown.tsx
rtk git commit -m "feat: add ExerciseCountdown ring component"
```

---

## Task 5: Integrate into `Play.tsx` + update `ExercisePanel`

**Files:**
- Modify: `src/routes/Play.tsx`
- Modify: `src/components/ExercisePanel.tsx`

- [ ] **Step 1: Suppress `durationSec` text in `ExercisePanel`**

In `src/components/ExercisePanel.tsx`, find the `formatDetail` function (line ~74) and remove the `durationSec` branch:

```ts
// Before
const formatDetail = (ex: Exercise): ReactNode | null => {
  if (ex.reps !== undefined) {
    return (
      <span>
        <Plural value={ex.reps} one="# rep" other="# reps" />
      </span>
    );
  }
  if (ex.durationSec !== undefined) return t`${ex.durationSec}s`;
  if (ex.distanceM !== undefined) return t`${ex.distanceM}m`;
  return null;
};

// After
const formatDetail = (ex: Exercise): ReactNode | null => {
  if (ex.reps !== undefined) {
    return (
      <span>
        <Plural value={ex.reps} one="# rep" other="# reps" />
      </span>
    );
  }
  if (ex.distanceM !== undefined) return t`${ex.distanceM}m`;
  return null;
};
```

- [ ] **Step 2: Add `ExerciseCountdown` to `Play.tsx`**

Add the import at the top of `src/routes/Play.tsx` (alongside existing component imports):

```ts
import { ExerciseCountdown } from '@/components/ExerciseCountdown';
```

Then subscribe to `drawn` in the component (alongside existing `useGameStore` calls near line ~26):

```ts
const drawn = useGameStore((s) => s.drawn);
```

Then in the JSX, after `<ExercisePanel exercise={current} />` (around line ~167), add:

```tsx
<ExercisePanel exercise={current} />
{current?.durationSec !== undefined && (
  <ExerciseCountdown
    key={drawn.length}
    durationSec={current.durationSec}
    isRest={current.id === 'water-break'}
  />
)}
```

The `key={drawn.length}` ensures the component remounts (and resets to idle) on each new draw — even if the next card has the same `durationSec`.

- [ ] **Step 3: Run full test suite**

```bash
rtk vitest run
```

Expected: all tests pass

- [ ] **Step 4: Run the dev server and manually verify the flow**

```bash
pnpm dev
```

Checklist:
- Draw a number card (reps) → no ring appears
- Draw an Ace (water-break) → ring appears in calm blue, idle state, shows "1:00", "tap to start"
- Tap the ring → countdown starts, ring depletes clockwise
- Countdown reaches 0 → ring goes dim, ✓ appears, device vibrates + beeps (on mobile or device with vibration API)
- Draw next card → ring resets immediately
- Draw a face card with `durationSec` (Queen/60s plank) → ring appears in orange
- Pause the session while countdown is running → ring stops ticking, resumes when unpaused

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/Play.tsx src/components/ExercisePanel.tsx
rtk git commit -m "feat: integrate ExerciseCountdown into Play screen"
```
