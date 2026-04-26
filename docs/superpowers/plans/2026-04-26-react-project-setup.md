# React Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Sweat Deck mobile-first React PWA skeleton — proves the deck-draw → exercise-display loop end-to-end.

**Architecture:** Vite + React 18 + TS as the build/runtime. Pure-TS `src/domain/` module owns deck/draw/exercise/joker logic with zero React dependencies → unit-testable in isolation. Zustand holds session state, Dexie persists configs and finished sessions to IndexedDB. Routing via React Router. PWA via `vite-plugin-pwa`.

**Tech Stack:** Vite, React 18, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Framer Motion, React Router, Zustand, Dexie.js, vite-plugin-pwa, Vitest, React Testing Library, Playwright, ESLint, Prettier, pnpm.

---

## File Structure

**Created:**
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`
- `tailwind.config.ts`, `postcss.config.js`, `components.json` (shadcn config)
- `eslint.config.js`, `.prettierrc.json`, `.gitignore`
- `index.html`
- `public/icons/` (PWA icons), `public/manifest.webmanifest`
- `src/main.tsx`, `src/App.tsx`, `src/styles/globals.css`
- `src/routes/Setup.tsx`, `src/routes/Play.tsx`, `src/routes/Summary.tsx`, `src/routes/History.tsx`
- `src/domain/card.ts`, `src/domain/deck.ts`, `src/domain/exercise.ts`, `src/domain/joker.ts`, `src/domain/mappings.ts`
- `src/store/gameStore.ts`, `src/store/db.ts`
- `src/components/Deck.tsx`, `src/components/CardFace.tsx`, `src/components/Timer.tsx`, `src/components/ExercisePanel.tsx`
- `src/hooks/useTimer.ts`, `src/hooks/usePersistedConfig.ts`
- `src/lib/rng.ts`, `src/lib/cn.ts`
- `tests/unit/rng.test.ts`, `tests/unit/deck.test.ts`, `tests/unit/exercise.test.ts`, `tests/unit/joker.test.ts`
- `tests/e2e/play.spec.ts`, `playwright.config.ts`, `vitest.config.ts`

**Boundary rule:** files in `src/domain/` and `src/lib/` must not import React, Zustand, Dexie, or any DOM API.

---

## Task 1: Initialize Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`

- [ ] **Step 1: Scaffold via Vite template**

```bash
cd /Users/tbianchini/workspace/sweat-deck
pnpm create vite@latest . --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" → choose **Ignore files and continue**.

- [ ] **Step 2: Install base deps**

```bash
pnpm install
```

- [ ] **Step 3: Replace `.gitignore` with project additions**

Append to `.gitignore`:

```
.superpowers/
.wolf/
.rtk/
.claude/
.DS_Store
dist/
node_modules/
coverage/
playwright-report/
test-results/
```

- [ ] **Step 4: Enable strict TS**

Edit `tsconfig.json` `compilerOptions` — ensure these are set:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "exactOptionalPropertyTypes": true,
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```

Edit `vite.config.ts` to add the same alias:

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 5: Verify dev server boots**

Run: `pnpm dev`
Expected: server prints `Local: http://localhost:5173/`. Ctrl-C.

- [ ] **Step 6: Commit**

```bash
rtk git add -A
rtk git commit -m "feat: scaffold vite + react + ts project"
```

---

## Task 2: Tailwind v4 + shadcn/ui + base styling

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `components.json`
- Create: `src/styles/globals.css`, `src/lib/cn.ts`
- Modify: `src/main.tsx` (import globals.css)

- [ ] **Step 1: Install Tailwind v4**

```bash
pnpm add -D tailwindcss@^4 @tailwindcss/vite postcss autoprefixer
pnpm add tailwind-merge clsx
```

- [ ] **Step 2: Wire Tailwind plugin into Vite**

Edit `vite.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 3: Create globals.css**

Replace contents of `src/index.css` (Vite default) — or create `src/styles/globals.css` and delete `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-deck-bg: #0b0d10;
  --color-deck-fg: #f5f5f4;
  --color-deck-accent: #e11d48;
}

html, body, #root {
  height: 100%;
  background: var(--color-deck-bg);
  color: var(--color-deck-fg);
  font-family: system-ui, -apple-system, sans-serif;
  overscroll-behavior: none;
}
```

- [ ] **Step 4: Update `src/main.tsx`** to import the new stylesheet (replace any `./index.css` import):

```ts
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 6: Replace `src/App.tsx` with a Tailwind smoke screen**

```tsx
export default function App() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Sweat Deck</h1>
    </main>
  );
}
```

- [ ] **Step 7: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

When prompted, accept defaults (style: new-york, base color: neutral, CSS variables: yes). This creates `components.json` and `src/components/ui/` (empty for now).

- [ ] **Step 8: Add a button primitive (verifies shadcn pipeline)**

```bash
pnpm dlx shadcn@latest add button
```

- [ ] **Step 9: Verify**

Run: `pnpm dev`
Expected: page shows "Sweat Deck" centered, dark background. Ctrl-C.

- [ ] **Step 10: Commit**

```bash
rtk git add -A
rtk git commit -m "feat: tailwind v4 + shadcn/ui setup"
```

---

## Task 3: Vitest + RTL + ESLint + Prettier

**Files:**
- Create: `vitest.config.ts`, `eslint.config.js`, `.prettierrc.json`, `tests/unit/.gitkeep`

- [ ] **Step 1: Install test deps**

```bash
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add test scripts to `package.json`**

In `package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 5: Write a smoke unit test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run test**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 7: Install + configure ESLint and Prettier**

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier
```

Replace `eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettier
);
```

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 8: Verify lint + format**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm format`
Expected: writes any unformatted files.

- [ ] **Step 9: Commit**

```bash
rtk git add -A
rtk git commit -m "feat: vitest + rtl + eslint + prettier setup"
```

---

## Task 4: RNG library — seeded mulberry32 + normal sampler

**Files:**
- Create: `src/lib/rng.ts`
- Test: `tests/unit/rng.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRng, sampleNormal, sampleInt } from '@/lib/rng';

describe('createRng', () => {
  it('produces deterministic sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('sampleNormal', () => {
  it('clamps results to [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = sampleNormal({ rng, mean: 5, sigma: 2, min: 2, max: 10 });
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('mean of samples is close to requested mean', () => {
    const rng = createRng(99);
    let sum = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) sum += sampleNormal({ rng, mean: 5, sigma: 1.5, min: 2, max: 10 });
    expect(sum / n).toBeCloseTo(5, 0);
  });
});

describe('sampleInt', () => {
  it('returns integers in [min, max] inclusive', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const v = sampleInt({ rng, min: 1, max: 6 });
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm test`
Expected: FAIL — module `@/lib/rng` does not export those names.

- [ ] **Step 3: Implement `src/lib/rng.ts`**

```ts
export type Rng = () => number;

export const createRng = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type NormalArgs = { rng: Rng; mean: number; sigma: number; min: number; max: number };

export const sampleNormal = ({ rng, mean, sigma, min, max }: NormalArgs): number => {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const v = mean + z * sigma;
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

type IntArgs = { rng: Rng; min: number; max: number };

export const sampleInt = ({ rng, min, max }: IntArgs): number =>
  Math.floor(rng() * (max - min + 1)) + min;
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`
Expected: all rng tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(domain): seeded rng + normal sampler"
```

---

## Task 5: Card type + deck builder

**Files:**
- Create: `src/domain/card.ts`, `src/domain/deck.ts`
- Test: `tests/unit/deck.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/deck.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { build54 } from '@/domain/deck';

describe('build54', () => {
  it('returns 54 cards', () => {
    expect(build54()).toHaveLength(54);
  });

  it('contains 2 jokers', () => {
    const jokers = build54().filter((c) => c.type === 'joker');
    expect(jokers).toHaveLength(2);
  });

  it('contains 4 aces, one per suit', () => {
    const aces = build54().filter((c) => c.type === 'ace');
    expect(aces).toHaveLength(4);
    const suits = new Set(aces.map((c) => (c.type === 'ace' ? c.suit : '')));
    expect(suits.size).toBe(4);
  });

  it('contains 12 face cards (3 ranks × 4 suits)', () => {
    expect(build54().filter((c) => c.type === 'face')).toHaveLength(12);
  });

  it('contains 36 number cards (9 values × 4 suits)', () => {
    expect(build54().filter((c) => c.type === 'number')).toHaveLength(36);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/domain/card.ts`**

```ts
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type FaceRank = 'J' | 'Q' | 'K';
export type NumberValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NumberCard = { type: 'number'; suit: Suit; value: NumberValue };
export type FaceCard = { type: 'face'; suit: Suit; rank: FaceRank };
export type AceCard = { type: 'ace'; suit: Suit };
export type JokerCard = { type: 'joker'; id: 1 | 2 };

export type Card = NumberCard | FaceCard | AceCard | JokerCard;

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const NUMBER_VALUES: readonly NumberValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const FACE_RANKS: readonly FaceRank[] = ['J', 'Q', 'K'] as const;
```

- [ ] **Step 4: Implement `src/domain/deck.ts` (build only)**

```ts
import { type Card, SUITS, NUMBER_VALUES, FACE_RANKS } from './card';

export const build54 = (): Card[] => {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    cards.push({ type: 'ace', suit });
    for (const value of NUMBER_VALUES) cards.push({ type: 'number', suit, value });
    for (const rank of FACE_RANKS) cards.push({ type: 'face', suit, rank });
  }
  cards.push({ type: 'joker', id: 1 }, { type: 'joker', id: 2 });
  return cards;
};
```

- [ ] **Step 5: Run tests — expect pass**

Run: `pnpm test`
Expected: deck tests pass.

- [ ] **Step 6: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(domain): card type + deck builder"
```

---

## Task 6: Weighted draw with normal distribution

**Files:**
- Modify: `src/domain/deck.ts`
- Create: `src/domain/difficulty.ts`
- Test: extend `tests/unit/deck.test.ts`

- [ ] **Step 1: Create `src/domain/difficulty.ts`**

```ts
export type Difficulty = 'beginner' | 'intermediate' | 'hard' | 'advanced' | 'hell';

type DistParams = { mean: number; sigma: number };

export const NUMBER_DIST: Record<Difficulty, DistParams> = {
  beginner: { mean: 2, sigma: 2.5 },
  intermediate: { mean: 5, sigma: 2.5 },
  hard: { mean: 7, sigma: 2.5 },
  advanced: { mean: 9, sigma: 2.5 },
  hell: { mean: 10, sigma: 2.5 },
};
```

- [ ] **Step 2: Write the failing draw tests**

Append to `tests/unit/deck.test.ts`:

```ts
import { build54, draw } from '@/domain/deck';
import { createRng } from '@/lib/rng';

describe('draw', () => {
  it('returns one card and decrements remaining by one', () => {
    const deck = build54();
    const rng = createRng(1);
    const result = draw({ remaining: deck, difficulty: 'intermediate', rng });
    expect(result.remaining).toHaveLength(53);
    expect(deck).toContainEqual(result.card);
  });

  it('throws when remaining is empty', () => {
    expect(() =>
      draw({ remaining: [], difficulty: 'intermediate', rng: createRng(1) })
    ).toThrow();
  });

  it('beginner difficulty biases toward low number cards', () => {
    const rng = createRng(123);
    let lowDraws = 0;
    let highDraws = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const numbers = build54().filter((c) => c.type === 'number');
      const result = draw({ remaining: numbers, difficulty: 'beginner', rng });
      if (result.card.type === 'number') {
        if (result.card.value <= 4) lowDraws++;
        if (result.card.value >= 8) highDraws++;
      }
    }
    expect(lowDraws).toBeGreaterThan(highDraws * 2);
  });

  it('hell difficulty biases toward high number cards', () => {
    const rng = createRng(456);
    let lowDraws = 0;
    let highDraws = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const numbers = build54().filter((c) => c.type === 'number');
      const result = draw({ remaining: numbers, difficulty: 'hell', rng });
      if (result.card.type === 'number') {
        if (result.card.value <= 4) lowDraws++;
        if (result.card.value >= 8) highDraws++;
      }
    }
    expect(highDraws).toBeGreaterThan(lowDraws * 2);
  });
});
```

- [ ] **Step 3: Run — expect fail**

Run: `pnpm test`
Expected: FAIL — `draw` not exported.

- [ ] **Step 4: Implement weighted draw — extend `src/domain/deck.ts`**

Replace contents of `src/domain/deck.ts`:

```ts
import { type Card, type NumberCard, type NumberValue, SUITS, NUMBER_VALUES, FACE_RANKS } from './card';
import { type Difficulty, NUMBER_DIST } from './difficulty';
import { type Rng, sampleNormal, sampleInt } from '@/lib/rng';

export const build54 = (): Card[] => {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    cards.push({ type: 'ace', suit });
    for (const value of NUMBER_VALUES) cards.push({ type: 'number', suit, value });
    for (const rank of FACE_RANKS) cards.push({ type: 'face', suit, rank });
  }
  cards.push({ type: 'joker', id: 1 }, { type: 'joker', id: 2 });
  return cards;
};

type DrawArgs = { remaining: Card[]; difficulty: Difficulty; rng: Rng };
type DrawResult = { card: Card; remaining: Card[] };

export const draw = ({ remaining, difficulty, rng }: DrawArgs): DrawResult => {
  if (remaining.length === 0) throw new Error('cannot draw from empty deck');

  const numbers = remaining.filter((c): c is NumberCard => c.type === 'number');
  const others = remaining.filter((c) => c.type !== 'number');

  const drawNumber = numbers.length > 0 && rng() < numbers.length / remaining.length;

  if (drawNumber) {
    const target = pickTargetValue({ numbers, difficulty, rng });
    const idx = remaining.findIndex(
      (c) => c.type === 'number' && c.value === target
    );
    return { card: remaining[idx]!, remaining: removeAt(remaining, idx) };
  }

  const idx = sampleInt({ rng, min: 0, max: others.length - 1 });
  const picked = others[idx]!;
  const realIdx = remaining.indexOf(picked);
  return { card: picked, remaining: removeAt(remaining, realIdx) };
};

type PickArgs = { numbers: NumberCard[]; difficulty: Difficulty; rng: Rng };

const pickTargetValue = ({ numbers, difficulty, rng }: PickArgs): NumberValue => {
  const { mean, sigma } = NUMBER_DIST[difficulty];
  const available = new Set(numbers.map((c) => c.value));
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = sampleNormal({ rng, mean, sigma, min: 2, max: 10 });
    const rounded = Math.round(raw) as NumberValue;
    if (available.has(rounded)) return rounded;
  }
  return numbers[sampleInt({ rng, min: 0, max: numbers.length - 1 })]!.value;
};

const removeAt = <T,>(arr: readonly T[], idx: number): T[] => {
  const next = arr.slice();
  next.splice(idx, 1);
  return next;
};
```

- [ ] **Step 5: Run — expect pass**

Run: `pnpm test`
Expected: all deck tests pass.

- [ ] **Step 6: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(domain): weighted normal-dist draw"
```

---

## Task 7: Setup config + exercise mappings + resolver

**Files:**
- Create: `src/domain/config.ts`, `src/domain/mappings.ts`, `src/domain/exercise.ts`
- Test: `tests/unit/exercise.test.ts`

- [ ] **Step 1: Create `src/domain/config.ts`**

```ts
import type { Difficulty } from './difficulty';

export type Equipment = 'bodyweight' | 'weights' | 'gym';
export type Theme = 'upper' | 'lower' | 'full';

export type SetupConfig = {
  difficulty: Difficulty;
  equipment: Equipment;
  theme: Theme;
  cardio: boolean;
  timeLimitMin?: number;
};

export const DEFAULT_CONFIG: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};
```

- [ ] **Step 2: Create `src/domain/mappings.ts`**

```ts
import type { Suit, FaceRank } from './card';
import type { Equipment, Theme } from './config';

type SuitMovement = { name: string };

export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: { name: 'Push-ups' },
      weights: { name: 'Dumbbell Floor Press' },
      gym: { name: 'Bench Press' },
    },
    diamonds: {
      bodyweight: { name: 'Bodyweight Rows' },
      weights: { name: 'Dumbbell Rows' },
      gym: { name: 'Pull-ups' },
    },
    clubs: {
      bodyweight: { name: 'Jump Squats' },
      weights: { name: 'Goblet Squats' },
      gym: { name: 'Back Squats' },
    },
    spades: {
      bodyweight: { name: 'Glute Bridges' },
      weights: { name: 'Kettlebell Swings' },
      gym: { name: 'Romanian Deadlifts' },
    },
  },
  upper: {
    hearts: {
      bodyweight: { name: 'Push-ups' },
      weights: { name: 'Dumbbell Press' },
      gym: { name: 'Bench Press' },
    },
    diamonds: {
      bodyweight: { name: 'Pull-ups' },
      weights: { name: 'Dumbbell Rows' },
      gym: { name: 'Lat Pulldown' },
    },
    clubs: {
      bodyweight: { name: 'Pike Push-ups' },
      weights: { name: 'Shoulder Press' },
      gym: { name: 'Overhead Press' },
    },
    spades: {
      bodyweight: { name: 'Plank to Push-up' },
      weights: { name: 'Renegade Rows' },
      gym: { name: 'Cable Rows' },
    },
  },
  lower: {
    hearts: {
      bodyweight: { name: 'Lunges' },
      weights: { name: 'Walking Lunges' },
      gym: { name: 'Bulgarian Split Squats' },
    },
    diamonds: {
      bodyweight: { name: 'Squats' },
      weights: { name: 'Goblet Squats' },
      gym: { name: 'Back Squats' },
    },
    clubs: {
      bodyweight: { name: 'Glute Bridges' },
      weights: { name: 'Hip Thrusts' },
      gym: { name: 'Barbell Hip Thrusts' },
    },
    spades: {
      bodyweight: { name: 'Calf Raises' },
      weights: { name: 'Weighted Calf Raises' },
      gym: { name: 'Standing Calf Raises' },
    },
  },
};

type FaceChallenge = { name: string; reps?: number; durationSec?: number; distanceM?: number };

export const FACE_CHALLENGES: Record<FaceRank, Record<Equipment, FaceChallenge>> = {
  J: {
    bodyweight: { name: 'Burpees', reps: 15 },
    weights: { name: 'Thrusters', reps: 15 },
    gym: { name: 'Wall Balls', reps: 15 },
  },
  Q: {
    bodyweight: { name: 'Hollow Body Hold', durationSec: 60 },
    weights: { name: 'Weighted Plank', durationSec: 60 },
    gym: { name: 'Plank Hold', durationSec: 60 },
  },
  K: {
    bodyweight: { name: 'Broad Jumps', reps: 20 },
    weights: { name: 'Man-Makers', reps: 20 },
    gym: { name: 'Heavy Sled Push', distanceM: 20 },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: { name: 'SkiErg', distanceM: 0, reps: 15 },
  Q: { name: 'Battle Ropes', durationSec: 60 },
  K: { name: 'Row', distanceM: 500 },
};
```

- [ ] **Step 3: Write failing exercise tests**

Create `tests/unit/exercise.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';

const baseConfig: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('resolve', () => {
  it('maps a number card to suit movement with reps = card value', () => {
    const ex = resolve({ card: { type: 'number', suit: 'hearts', value: 7 }, config: baseConfig });
    expect(ex.name).toBe('Push-ups');
    expect(ex.reps).toBe(7);
  });

  it('maps an ace to a 60s water break', () => {
    const ex = resolve({ card: { type: 'ace', suit: 'spades' }, config: baseConfig });
    expect(ex.name).toBe('Water Break');
    expect(ex.durationSec).toBe(60);
  });

  it('maps J to a face challenge with fixed reps', () => {
    const ex = resolve({ card: { type: 'face', suit: 'clubs', rank: 'J' }, config: baseConfig });
    expect(ex.name).toBe('Burpees');
    expect(ex.reps).toBe(15);
  });

  it('uses cardio face challenges when cardio is true', () => {
    const ex = resolve({
      card: { type: 'face', suit: 'clubs', rank: 'K' },
      config: { ...baseConfig, cardio: true },
    });
    expect(ex.name).toBe('Row');
    expect(ex.distanceM).toBe(500);
  });

  it('returns a placeholder for joker cards (handled separately by joker module)', () => {
    const ex = resolve({ card: { type: 'joker', id: 1 }, config: baseConfig });
    expect(ex.name).toMatch(/joker/i);
  });
});
```

- [ ] **Step 4: Run — expect fail**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `src/domain/exercise.ts`**

```ts
import type { Card } from './card';
import type { SetupConfig } from './config';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';

export type Exercise = {
  name: string;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type ResolveArgs = { card: Card; config: SetupConfig };

export const resolve = ({ card, config }: ResolveArgs): Exercise => {
  if (card.type === 'ace') return { name: 'Water Break', durationSec: 60 };

  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    return { name: movement.name, reps: card.value };
  }

  if (card.type === 'face') {
    if (config.cardio) return { ...FACE_CHALLENGES_CARDIO[card.rank] };
    return { ...FACE_CHALLENGES[card.rank][config.equipment] };
  }

  return { name: 'Joker (resolved by joker module)' };
};
```

- [ ] **Step 6: Run — expect pass**

Run: `pnpm test`
Expected: exercise tests pass.

- [ ] **Step 7: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(domain): exercise mappings + resolver"
```

---

## Task 8: Joker effects

**Files:**
- Create: `src/domain/joker.ts`
- Test: `tests/unit/joker.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/joker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickJokerEffect, COMBO_BREAKER_EXERCISE } from '@/domain/joker';
import type { Card } from '@/domain/card';
import { createRng } from '@/lib/rng';

const upperHistory: Card[] = [
  { type: 'number', suit: 'hearts', value: 8 },
  { type: 'number', suit: 'diamonds', value: 6 },
  { type: 'number', suit: 'hearts', value: 10 },
];

describe('pickJokerEffect', () => {
  it('returns combo-breaker leg burnout when last 3 are upper-body', () => {
    const result = pickJokerEffect({ history: upperHistory, rng: createRng(1) });
    expect(result.kind).toBe('combo-breaker');
    expect(result.exercise).toEqual(COMBO_BREAKER_EXERCISE);
  });

  it('returns one of the three effect kinds otherwise', () => {
    const result = pickJokerEffect({ history: [], rng: createRng(2) });
    expect(['combo-breaker', 'double-up', 'sudden-death']).toContain(result.kind);
  });

  it('is deterministic with the same seed', () => {
    const a = pickJokerEffect({ history: [], rng: createRng(7) });
    const b = pickJokerEffect({ history: [], rng: createRng(7) });
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/domain/joker.ts`**

```ts
import type { Card, Suit } from './card';
import type { Exercise } from './exercise';
import { type Rng, sampleInt } from '@/lib/rng';

export type JokerEffectKind = 'combo-breaker' | 'double-up' | 'sudden-death';

export type JokerEffect = {
  kind: JokerEffectKind;
  exercise: Exercise;
};

export const COMBO_BREAKER_EXERCISE: Exercise = {
  name: 'Max-Effort Leg Burnout',
  durationSec: 120,
};

const SUDDEN_DEATH_OPTIONS: Exercise[] = [
  { name: '50 Burpees', reps: 50 },
  { name: '100m Sprint', distanceM: 100 },
  { name: '500m SkiErg Sprint', distanceM: 500 },
];

const UPPER_SUITS: ReadonlySet<Suit> = new Set(['hearts', 'diamonds']);

type PickArgs = { history: Card[]; rng: Rng };

export const pickJokerEffect = ({ history, rng }: PickArgs): JokerEffect => {
  if (isAllUpperBody(history.slice(-3))) {
    return { kind: 'combo-breaker', exercise: COMBO_BREAKER_EXERCISE };
  }

  const kinds: JokerEffectKind[] = ['combo-breaker', 'double-up', 'sudden-death'];
  const kind = kinds[sampleInt({ rng, min: 0, max: kinds.length - 1 })]!;

  if (kind === 'sudden-death') {
    const ex = SUDDEN_DEATH_OPTIONS[sampleInt({ rng, min: 0, max: SUDDEN_DEATH_OPTIONS.length - 1 })]!;
    return { kind, exercise: ex };
  }
  if (kind === 'double-up') {
    return { kind, exercise: { name: 'Combine the last 2 exercises — 10 reps each' } };
  }
  return { kind, exercise: COMBO_BREAKER_EXERCISE };
};

const isAllUpperBody = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  return cards.every((c) => c.type === 'number' && UPPER_SUITS.has(c.suit));
};
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm test`
Expected: joker tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(domain): joker effect picker"
```

---

## Task 9: Dexie persistence

**Files:**
- Create: `src/store/db.ts`

- [ ] **Step 1: Install Dexie**

```bash
pnpm add dexie
```

- [ ] **Step 2: Implement `src/store/db.ts`**

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

class SweatDeckDb extends Dexie {
  configs!: Table<ConfigRow, 'last'>;
  sessions!: Table<SessionRow, number>;

  constructor() {
    super('sweat-deck');
    this.version(1).stores({
      configs: 'id',
      sessions: '++id, startedAt',
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
```

- [ ] **Step 3: Verify TS compiles**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(store): dexie persistence layer"
```

---

## Task 10: Zustand game store

**Files:**
- Create: `src/store/gameStore.ts`

- [ ] **Step 1: Install Zustand**

```bash
pnpm add zustand
```

- [ ] **Step 2: Implement `src/store/gameStore.ts`**

```ts
import { create } from 'zustand';
import type { Card } from '@/domain/card';
import type { SetupConfig } from '@/domain/config';
import type { Exercise } from '@/domain/exercise';
import { build54, draw } from '@/domain/deck';
import { resolve } from '@/domain/exercise';
import { pickJokerEffect } from '@/domain/joker';
import { createRng, type Rng } from '@/lib/rng';
import { recordSession, saveLastConfig } from './db';
import { DEFAULT_CONFIG } from '@/domain/config';

type GameState = {
  config: SetupConfig;
  deck: Card[];
  drawn: Card[];
  current: Exercise | null;
  startedAt: number | null;
  elapsedSec: number;
  finished: boolean;
  rng: Rng;
};

type GameActions = {
  start: (config: SetupConfig) => void;
  drawNext: () => void;
  tick: () => void;
  finish: () => Promise<void>;
  reset: () => void;
};

const makeInitialState = (): GameState => ({
  config: DEFAULT_CONFIG,
  deck: [],
  drawn: [],
  current: null,
  startedAt: null,
  elapsedSec: 0,
  finished: false,
  rng: createRng(Date.now()),
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),

  start: (config) => {
    void saveLastConfig(config);
    set({
      ...makeInitialState(),
      config,
      deck: build54(),
      startedAt: Date.now(),
      rng: createRng(Date.now()),
    });
  },

  drawNext: () => {
    const { deck, drawn, config, rng, finished } = get();
    if (finished || deck.length === 0) return;

    const result = draw({ remaining: deck, difficulty: config.difficulty, rng });
    const nextDrawn = [...drawn, result.card];

    const exercise =
      result.card.type === 'joker'
        ? pickJokerEffect({ history: nextDrawn, rng }).exercise
        : resolve({ card: result.card, config });

    set({ deck: result.remaining, drawn: nextDrawn, current: exercise });
  },

  tick: () => {
    const { startedAt, finished, config } = get();
    if (!startedAt || finished) return;
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    const limit = config.timeLimitMin ? config.timeLimitMin * 60 : Infinity;
    if (elapsedSec >= limit) {
      set({ elapsedSec: limit, finished: true });
      return;
    }
    set({ elapsedSec });
  },

  finish: async () => {
    const { startedAt, drawn, config, finished } = get();
    if (finished || !startedAt) return;
    const durationSec = Math.floor((Date.now() - startedAt) / 1000);
    set({ finished: true, elapsedSec: durationSec });
    await recordSession({ startedAt, durationSec, drawnCount: drawn.length, config });
  },

  reset: () => set(makeInitialState()),
}));
```

- [ ] **Step 3: Verify TS compiles**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(store): zustand game store"
```

---

## Task 11: Routing + route stubs + auto-start on boot

**Files:**
- Create: `src/routes/Setup.tsx`, `src/routes/Play.tsx`, `src/routes/Summary.tsx`, `src/routes/History.tsx`
- Create: `src/hooks/usePersistedConfig.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Install React Router**

```bash
pnpm add react-router-dom
```

- [ ] **Step 2: Create `src/hooks/usePersistedConfig.ts`**

```ts
import { useEffect, useState } from 'react';
import { type SetupConfig, DEFAULT_CONFIG } from '@/domain/config';
import { loadLastConfig } from '@/store/db';

export const usePersistedConfig = (): { config: SetupConfig; loaded: boolean } => {
  const [config, setConfig] = useState<SetupConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLastConfig().then((stored) => {
      if (cancelled) return;
      if (stored) setConfig(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loaded };
};
```

- [ ] **Step 3: Create stub route components**

`src/routes/Setup.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';

export default function Setup() {
  const { config, loaded } = usePersistedConfig();
  const start = useGameStore((s) => s.start);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    start(config);
    navigate('/play', { replace: true });
  }, [loaded, config, start, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-deck-fg/60">Preparing the deck…</p>
    </main>
  );
}
```

`src/routes/Play.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Deck } from '@/components/Deck';
import { ExercisePanel } from '@/components/ExercisePanel';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';

export default function Play() {
  const navigate = useNavigate();
  const deck = useGameStore((s) => s.deck);
  const current = useGameStore((s) => s.current);
  const drawNext = useGameStore((s) => s.drawNext);
  const finish = useGameStore((s) => s.finish);

  const handleFinish = async () => {
    await finish();
    navigate('/summary');
  };

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sweat Deck</h1>
        <Timer />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-8">
        <Deck remaining={deck.length} onDraw={drawNext} />
        <ExercisePanel exercise={current} />
      </section>
      <Button variant="secondary" onClick={handleFinish}>
        Finish
      </Button>
    </main>
  );
}
```

`src/routes/Summary.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export default function Summary() {
  const drawn = useGameStore((s) => s.drawn);
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  const reset = useGameStore((s) => s.reset);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Workout complete</h1>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-center">
        <dt className="text-deck-fg/60">Cards drawn</dt>
        <dd className="text-2xl font-semibold">{drawn.length}</dd>
        <dt className="text-deck-fg/60">Time</dt>
        <dd className="text-2xl font-semibold">{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</dd>
      </dl>
      <Button asChild onClick={reset}>
        <Link to="/">Done</Link>
      </Button>
    </main>
  );
}
```

`src/routes/History.tsx`:

```tsx
export default function History() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-deck-fg/60">History — coming soon</p>
    </main>
  );
}
```

- [ ] **Step 4: Wire router in `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Setup from './routes/Setup';
import Play from './routes/Play';
import Summary from './routes/Summary';
import History from './routes/History';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/play" element={<Play />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify TS compiles**

Run: `pnpm exec tsc -b --noEmit`
Expected: errors only about missing components — fixed in Task 12.

- [ ] **Step 6: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(routes): router + route stubs + auto-start"
```

---

## Task 12: UI components — Deck, CardFace, ExercisePanel, Timer

**Files:**
- Create: `src/components/Deck.tsx`, `src/components/CardFace.tsx`, `src/components/ExercisePanel.tsx`, `src/components/Timer.tsx`
- Create: `src/hooks/useTimer.ts`

- [ ] **Step 1: Install Framer Motion**

```bash
pnpm add framer-motion
```

- [ ] **Step 2: Create `src/components/CardFace.tsx`**

```tsx
import type { Card } from '@/domain/card';
import { cn } from '@/lib/cn';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-deck-fg',
  spades: 'text-deck-fg',
};

type Props = { card: Card | null; faceDown?: boolean };

export const CardFace = ({ card, faceDown = false }: Props) => {
  if (faceDown || !card) {
    return (
      <div className="flex h-48 w-32 items-center justify-center rounded-2xl bg-deck-accent shadow-xl">
        <div className="h-40 w-24 rounded-xl border-2 border-white/40" />
      </div>
    );
  }

  const label = labelFor(card);
  const suit = card.type === 'joker' ? null : card.suit;
  const color = suit ? SUIT_COLOR[suit] : 'text-deck-fg';

  return (
    <div className={cn('flex h-48 w-32 flex-col justify-between rounded-2xl bg-white p-3 text-deck-bg shadow-xl', color)}>
      <span className="text-2xl font-bold">{label}</span>
      {suit && <span className="self-center text-5xl">{SUIT_GLYPH[suit]}</span>}
      <span className="self-end text-2xl font-bold rotate-180">{label}</span>
    </div>
  );
};

const labelFor = (card: Card): string => {
  if (card.type === 'number') return String(card.value);
  if (card.type === 'face') return card.rank;
  if (card.type === 'ace') return 'A';
  return '★';
};
```

- [ ] **Step 3: Create `src/components/Deck.tsx`**

```tsx
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { CardFace } from './CardFace';

type Props = { remaining: number; onDraw: () => void };

export const Deck = ({ remaining, onDraw }: Props) => {
  const drawn = useGameStore((s) => s.drawn);
  const top = drawn[drawn.length - 1] ?? null;

  return (
    <div className="flex items-center gap-8">
      <button
        type="button"
        aria-label="Draw card"
        onClick={onDraw}
        disabled={remaining === 0}
        className="relative disabled:opacity-50"
      >
        <CardFace card={null} faceDown />
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs">
          {remaining}
        </span>
      </button>

      <motion.div
        key={drawn.length}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <CardFace card={top} />
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 4: Create `src/components/ExercisePanel.tsx`**

```tsx
import type { Exercise } from '@/domain/exercise';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  if (!exercise) {
    return <p className="text-deck-fg/60">Tap the deck to start</p>;
  }
  const detail = formatDetail(exercise);
  return (
    <div className="text-center">
      <p className="text-sm uppercase tracking-wider text-deck-fg/60">Do this</p>
      <h2 className="text-3xl font-bold">{exercise.name}</h2>
      {detail && <p className="mt-2 text-2xl font-semibold text-deck-accent">{detail}</p>}
    </div>
  );
};

const formatDetail = (ex: Exercise): string | null => {
  if (ex.reps !== undefined) return `× ${ex.reps}`;
  if (ex.durationSec !== undefined) return `${ex.durationSec}s`;
  if (ex.distanceM !== undefined) return `${ex.distanceM}m`;
  return null;
};
```

- [ ] **Step 5: Create `src/hooks/useTimer.ts`**

```ts
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export const useTimer = () => {
  const tick = useGameStore((s) => s.tick);
  const finished = useGameStore((s) => s.finished);
  const startedAt = useGameStore((s) => s.startedAt);

  useEffect(() => {
    if (!startedAt || finished) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, finished, startedAt]);
};
```

- [ ] **Step 6: Create `src/components/Timer.tsx`**

```tsx
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';

export const Timer = () => {
  useTimer();
  const elapsed = useGameStore((s) => s.elapsedSec);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return (
    <span className="font-mono text-lg tabular-nums">
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
};
```

- [ ] **Step 7: Verify dev server**

Run: `pnpm dev`
Open http://localhost:5173 in browser. Expected: lands on `/play`, deck visible, tap draws cards, exercise panel updates, finish navigates to summary.
Ctrl-C.

- [ ] **Step 8: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(ui): deck, card, exercise panel, timer"
```

---

## Task 13: PWA configuration

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable.png` (placeholder PNGs)
- Modify: `vite.config.ts`, `index.html`

- [ ] **Step 1: Install PWA plugin**

```bash
pnpm add -D vite-plugin-pwa
```

- [ ] **Step 2: Create placeholder icons**

```bash
mkdir -p public/icons
# 1x1 red PNG as placeholder until real icons exist
node -e "const fs=require('fs');const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');for(const f of ['icon-192.png','icon-512.png','icon-maskable.png'])fs.writeFileSync('public/icons/'+f,png);"
```

(Real icons are out of scope — placeholders unblock the manifest.)

- [ ] **Step 3: Update `vite.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Sweat Deck',
        short_name: 'Sweat Deck',
        description: 'Card-driven workout game',
        theme_color: '#0b0d10',
        background_color: '#0b0d10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: Update `index.html` `<head>`**

Add inside `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<meta name="theme-color" content="#0b0d10" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<title>Sweat Deck</title>
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: build completes; `dist/manifest.webmanifest` and `dist/sw.js` exist.

- [ ] **Step 6: Commit**

```bash
rtk git add -A
rtk git commit -m "feat: pwa manifest + service worker"
```

---

## Task 14: Playwright smoke E2E

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/play.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Create `tests/e2e/play.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('draws 5 cards then finishes to summary', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/play$/);

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

- [ ] **Step 4: Run E2E**

Run: `pnpm test:e2e`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
rtk git add -A
rtk git commit -m "test(e2e): playwright smoke for draw + finish flow"
```

---

## Task 15: Final verification

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 2: Format check**

Run: `pnpm exec prettier --check .`
Expected: all files formatted.

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Unit tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: E2E**

Run: `pnpm test:e2e`
Expected: pass.

- [ ] **Step 6: Production build**

Run: `pnpm build && pnpm preview`
Open the preview URL on a phone (or DevTools mobile emulation), verify install prompt appears and core flow works.

- [ ] **Step 7: Commit any final tweaks if needed, otherwise done.**

---

## Acceptance Criteria (from spec)

- ✅ `pnpm dev` launches at localhost — Task 1
- ✅ `pnpm build` produces installable PWA artifact — Task 13
- ✅ `pnpm test` passes unit tests — Tasks 4–8
- ✅ `pnpm test:e2e` passes smoke — Task 14
- ✅ Open app → tap deck 5× → see 5 exercises with reps → tap Finish → summary → reopen with config persisted — Tasks 9–14
