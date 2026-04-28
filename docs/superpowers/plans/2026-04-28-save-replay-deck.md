# Save & Replay Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users save a named deck (config + slot overrides) from DeckBuilder or Summary, replay it from a dedicated `/saved-decks` route, and update an existing saved deck when the current session was loaded from one.

**Architecture:** A new Dexie `savedDecks` table stores `{ id, name, savedAt, config, overrides }`. The id of the source saved deck is tracked in `gameStore` as `savedDeckId` so that "Save" becomes "Update" once a session is loaded from a saved deck. A shared `SaveDeckSheet` handles both create and update. A new `/saved-decks` list route is reached from a third "Replay" tab on the Setup landing toggle. Tapping a saved deck navigates to `/deck` with the stored config + overrides in `location.state`; `useDeckComposer` is extended to seed slot state from those instead of resetting.

**Tech Stack:** Vite 8 + React 19 + TS 6, Dexie, Zustand, react-router-dom, Tailwind v4 + shadcn (Base UI), lingui (i18n), framer-motion, vitest + @testing-library/react, Playwright.

---

## File Structure

**Create:**
- `src/components/SaveDeckSheet.tsx` — bottom sheet for create/update
- `src/routes/SavedDecks.tsx` — list route
- `tests/unit/db.savedDecks.test.ts` — db helpers
- `tests/unit/gameStore.savedDeckId.test.ts` — savedDeckId state
- `tests/unit/SaveDeckSheet.test.tsx` — sheet behavior
- `tests/unit/useDeckComposer.replay.test.ts` — replay seeding
- `tests/unit/SavedDecks.test.tsx` — list route
- `tests/e2e/save-replay.spec.ts` — full flow

**Modify:**
- `src/store/db.ts` — add Dexie v3 + helpers
- `src/store/gameStore.ts` — add `savedDeckId`
- `src/hooks/useDeckComposer.ts` — accept `initialOverrides`
- `src/routes/DeckBuilder.tsx` — bookmark button, load saved overrides, savedDeckId, back-to-saved-decks
- `src/routes/Summary.tsx` — Save/Update button
- `src/routes/Setup.tsx` — three-way toggle: Guided / Manual / Replay
- `src/App.tsx` — add `/saved-decks` route

---

## Task 1: Dexie v3 schema + savedDecks db helpers

**Files:**
- Modify: `src/store/db.ts`
- Test: `tests/unit/db.savedDecks.test.ts`

- [ ] **Step 1: Write failing tests for db helpers**

Create `tests/unit/db.savedDecks.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  saveDeck,
  updateSavedDeck,
  listSavedDecks,
  deleteSavedDeck,
  hasSavedDecks,
} from '@/store/db';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(async () => {
  await db.savedDecks.clear();
});

describe('savedDecks db helpers', () => {
  it('hasSavedDecks returns false when table empty', async () => {
    expect(await hasSavedDecks()).toBe(false);
  });

  it('saveDeck inserts a row and returns id; hasSavedDecks then true', async () => {
    const id = await saveDeck({ name: 'Push Day', config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
    expect(typeof id).toBe('number');
    expect(await hasSavedDecks()).toBe(true);
  });

  it('listSavedDecks returns rows newest first', async () => {
    const idA = await saveDeck({ name: 'A', config: cfg, overrides: {} });
    await new Promise((r) => setTimeout(r, 5));
    const idB = await saveDeck({ name: 'B', config: cfg, overrides: {} });
    const rows = await listSavedDecks();
    expect(rows.map((r) => r.id)).toEqual([idB, idA]);
  });

  it('updateSavedDeck overwrites name, config, and overrides', async () => {
    const id = await saveDeck({ name: 'Old', config: cfg, overrides: {} });
    await updateSavedDeck(id, {
      name: 'New',
      config: { ...cfg, difficulty: 'hell' },
      overrides: { 'face:K': { id: 'burpees' } },
    });
    const rows = await listSavedDecks();
    expect(rows[0]).toMatchObject({
      id,
      name: 'New',
      config: expect.objectContaining({ difficulty: 'hell' }),
      overrides: { 'face:K': { id: 'burpees' } },
    });
  });

  it('deleteSavedDeck removes the row', async () => {
    const id = await saveDeck({ name: 'X', config: cfg, overrides: {} });
    await deleteSavedDeck(id);
    expect(await listSavedDecks()).toEqual([]);
    expect(await hasSavedDecks()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm failures**

Run: `pnpm vitest run tests/unit/db.savedDecks.test.ts`
Expected: FAIL — `saveDeck`, `updateSavedDeck`, `listSavedDecks`, `deleteSavedDeck`, `hasSavedDecks` not exported; `db.savedDecks` table missing.

- [ ] **Step 3: Add Dexie v3 schema + helpers**

Edit `src/store/db.ts`. Add the new types, table, version migration, and helpers below the existing exports:

```ts
import type { PlanOverrides } from '@/domain/plan';

export type SavedDeckRow = {
  id?: number;
  name: string;
  savedAt: number;
  config: SetupConfig;
  overrides: PlanOverrides;
};
```

Update the Dexie subclass:

```ts
class SweatDeckDb extends Dexie {
  configs!: Table<ConfigRow, 'last'>;
  sessions!: Table<SessionRow, number>;
  meta!: Table<MetaRow, MetaRow['key']>;
  savedDecks!: Table<SavedDeckRow, number>;

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
    this.version(3).stores({
      configs: 'id',
      sessions: '++id, startedAt',
      meta: 'key',
      savedDecks: '++id, savedAt',
    });
  }
}
```

Add the helpers at the bottom of the file:

```ts
export const saveDeck = async (
  input: { name: string; config: SetupConfig; overrides: PlanOverrides },
): Promise<number> => {
  return db.savedDecks.add({
    name: input.name,
    config: input.config,
    overrides: input.overrides,
    savedAt: Date.now(),
  });
};

export const updateSavedDeck = async (
  id: number,
  input: { name: string; config: SetupConfig; overrides: PlanOverrides },
): Promise<void> => {
  await db.savedDecks.update(id, {
    name: input.name,
    config: input.config,
    overrides: input.overrides,
    savedAt: Date.now(),
  });
};

export const listSavedDecks = async (): Promise<SavedDeckRow[]> => {
  return db.savedDecks.orderBy('savedAt').reverse().toArray();
};

export const deleteSavedDeck = async (id: number): Promise<void> => {
  await db.savedDecks.delete(id);
};

export const hasSavedDecks = async (): Promise<boolean> => {
  return (await db.savedDecks.count()) > 0;
};
```

- [ ] **Step 4: Verify the test setup imports `fake-indexeddb`**

Check `tests/setup.ts` — if it does not already import `fake-indexeddb/auto`, the test file's top-level import covers it. Run:

`pnpm vitest run tests/unit/db.savedDecks.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/db.ts tests/unit/db.savedDecks.test.ts && \
rtk git commit -m "feat(db): add savedDecks table (v3) and CRUD helpers"
```

---

## Task 2: gameStore savedDeckId tracking

**Files:**
- Modify: `src/store/gameStore.ts`
- Test: `tests/unit/gameStore.savedDeckId.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/gameStore.savedDeckId.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('savedDeckId', () => {
  it('starts as null', () => {
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('setSavedDeckId stores the id', () => {
    useGameStore.getState().setSavedDeckId(42);
    expect(useGameStore.getState().savedDeckId).toBe(42);
  });

  it('setSavedDeckId(null) clears it', () => {
    useGameStore.getState().setSavedDeckId(7);
    useGameStore.getState().setSavedDeckId(null);
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('reset() clears savedDeckId', () => {
    useGameStore.getState().setSavedDeckId(7);
    useGameStore.getState().reset();
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('start() preserves savedDeckId set before it is called', () => {
    useGameStore.getState().setSavedDeckId(9);
    useGameStore.getState().start({
      difficulty: 'intermediate',
      equipment: 'bodyweight',
      theme: 'full',
      cardio: false,
    });
    expect(useGameStore.getState().savedDeckId).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm vitest run tests/unit/gameStore.savedDeckId.test.ts`
Expected: FAIL — `setSavedDeckId is not a function`, `savedDeckId` undefined.

- [ ] **Step 3: Add savedDeckId to gameStore**

Edit `src/store/gameStore.ts`.

Add to `GameState`:

```ts
savedDeckId: number | null;
```

Add to `GameActions`:

```ts
setSavedDeckId: (id: number | null) => void;
```

Add to `makeInitialState()`:

```ts
savedDeckId: null,
```

In the `start` action, preserve `savedDeckId` along with overrides:

```ts
start: (config) => {
  if (!validateConfig(config)) return;
  void saveLastConfig(config);
  const { overrides: currentOverrides, savedDeckId: currentSavedDeckId } = get();
  set({
    ...makeInitialState(),
    config,
    deck: build54(),
    startedAt: Date.now(),
    rng: createRng(Date.now()),
    overrides: currentOverrides,
    savedDeckId: currentSavedDeckId,
  });
},
```

Add the action implementation alongside `resetOverrides`:

```ts
setSavedDeckId: (id) => set({ savedDeckId: id }),
```

- [ ] **Step 4: Run test to confirm pass**

Run: `pnpm vitest run tests/unit/gameStore.savedDeckId.test.ts`
Expected: PASS (5 tests).

Also re-run existing gameStore test to confirm no regressions:

Run: `pnpm vitest run tests/unit/gameStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/gameStore.ts tests/unit/gameStore.savedDeckId.test.ts && \
rtk git commit -m "feat(store): track savedDeckId in gameStore"
```

---

## Task 3: SaveDeckSheet component

**Files:**
- Create: `src/components/SaveDeckSheet.tsx`
- Test: `tests/unit/SaveDeckSheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/SaveDeckSheet.test.tsx`:

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import * as dbMod from '@/store/db';
import type { SetupConfig } from '@/domain/config';
import { useGameStore } from '@/store/gameStore';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

const wrap = (ui: ReactElement) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

describe('SaveDeckSheet', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.restoreAllMocks();
    useGameStore.getState().reset();
  });

  it('disables Save while name is empty', async () => {
    render(
      wrap(
        <SaveDeckSheet open onClose={() => {}} config={cfg} overrides={{}} />,
      ),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('on confirm in create mode: calls saveDeck, sets savedDeckId, closes', async () => {
    const onClose = vi.fn();
    const saveSpy = vi.spyOn(dbMod, 'saveDeck').mockResolvedValue(123);
    const user = userEvent.setup();

    render(
      wrap(
        <SaveDeckSheet open onClose={onClose} config={cfg} overrides={{}} />,
      ),
    );

    await user.type(screen.getByLabelText('Deck name'), 'Push Day');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith({ name: 'Push Day', config: cfg, overrides: {} }),
    );
    expect(useGameStore.getState().savedDeckId).toBe(123);
    expect(onClose).toHaveBeenCalled();
  });

  it('on confirm in update mode: calls updateSavedDeck, closes', async () => {
    const onClose = vi.fn();
    const updateSpy = vi.spyOn(dbMod, 'updateSavedDeck').mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      wrap(
        <SaveDeckSheet
          open
          onClose={onClose}
          config={cfg}
          overrides={{}}
          savedDeckId={7}
          initialName="Old Name"
        />,
      ),
    );

    const input = screen.getByLabelText('Deck name') as HTMLInputElement;
    expect(input.value).toBe('Old Name');
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(7, {
        name: 'New Name',
        config: cfg,
        overrides: {},
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `pnpm vitest run tests/unit/SaveDeckSheet.test.tsx`
Expected: FAIL — module `@/components/SaveDeckSheet` not found.

- [ ] **Step 3: Implement SaveDeckSheet**

Create `src/components/SaveDeckSheet.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { SetupConfig } from '@/domain/config';
import type { PlanOverrides } from '@/domain/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveDeck, updateSavedDeck } from '@/store/db';
import { useGameStore } from '@/store/gameStore';

type Props = {
  open: boolean;
  onClose: () => void;
  config: SetupConfig;
  overrides: PlanOverrides;
  savedDeckId?: number;
  initialName?: string;
};

export function SaveDeckSheet({ open, onClose, config, overrides, savedDeckId, initialName }: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);

  useEffect(() => {
    if (open) setName(initialName ?? '');
  }, [open, initialName]);

  if (!open) return null;

  const isUpdate = savedDeckId !== undefined;
  const trimmed = name.trim();
  const disabled = trimmed.length === 0 || submitting;

  const handleConfirm = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      if (isUpdate) {
        await updateSavedDeck(savedDeckId!, { name: trimmed, config, overrides });
      } else {
        const id = await saveDeck({ name: trimmed, config, overrides });
        setSavedDeckId(id);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isUpdate ? t`Update saved deck` : t`Save deck`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border/50 bg-card p-5 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold">
          {isUpdate ? <Trans>Update saved deck</Trans> : <Trans>Save deck</Trans>}
        </h2>
        <label className="mt-4 block text-sm font-medium" htmlFor="save-deck-name">
          <Trans>Deck name</Trans>
        </label>
        <Input
          id="save-deck-name"
          aria-label={t`Deck name`}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="mt-2"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={disabled}>
            {isUpdate ? <Trans>Update</Trans> : <Trans>Save</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `pnpm vitest run tests/unit/SaveDeckSheet.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Extract translations and commit**

```bash
pnpm extract && \
rtk git add src/components/SaveDeckSheet.tsx tests/unit/SaveDeckSheet.test.tsx src/locales/ && \
rtk git commit -m "feat(deck): add SaveDeckSheet for create + update"
```

---

## Task 4: useDeckComposer initialOverrides

**Files:**
- Modify: `src/hooks/useDeckComposer.ts`
- Test: `tests/unit/useDeckComposer.replay.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/useDeckComposer.replay.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeckComposer } from '@/hooks/useDeckComposer';
import { useGameStore } from '@/store/gameStore';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('useDeckComposer with initialOverrides', () => {
  it('seeds gameStore overrides on mount when provided (guided)', () => {
    renderHook(() =>
      useDeckComposer({
        mode: 'guided',
        config: cfg,
        initialOverrides: { 'suit:hearts': { id: 'pike-pushups' }, 'face:K': { id: 'burpees', reps: 12 } },
      }),
    );
    expect(useGameStore.getState().overrides).toEqual({
      'suit:hearts': { id: 'pike-pushups' },
      'face:K': { id: 'burpees', reps: 12 },
    });
  });

  it('seeds gameStore overrides on mount when provided (manual)', () => {
    renderHook(() =>
      useDeckComposer({
        mode: 'manual',
        initialOverrides: {
          'suit:hearts': { id: 'pushups' },
          'suit:diamonds': { id: 'squats' },
          'suit:clubs': { id: 'pullups' },
          'suit:spades': { id: 'lunges' },
          'face:J': { id: 'burpees' },
          'face:Q': { id: 'plank' },
          'face:K': { id: 'deadlift' },
        },
      }),
    );
    expect(Object.keys(useGameStore.getState().overrides).length).toBe(7);
  });

  it('resets overrides when no initialOverrides provided', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    renderHook(() => useDeckComposer({ mode: 'guided', config: cfg }));
    expect(useGameStore.getState().overrides).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm vitest run tests/unit/useDeckComposer.replay.test.ts`
Expected: FAIL — `initialOverrides` not accepted by `ComposerMode`; tests 1 and 2 fail because the hook always calls `storeResetOverrides()`.

- [ ] **Step 3: Update useDeckComposer**

Edit `src/hooks/useDeckComposer.ts`.

Update `ComposerMode` to include optional `initialOverrides`:

```ts
export type ComposerMode =
  | { mode: 'guided'; config: SetupConfig; initialOverrides?: PlanOverrides }
  | { mode: 'manual'; initialOverrides?: PlanOverrides };
```

Add the import for `PlanOverrides` if not already present:

```ts
import {
  buildPlan,
  buildManualSlots,
  type SlotKey,
  type PlanSlot,
  type SlotOverride,
  type PlanOverrides,
} from '@/domain/plan';
```

Replace the mount effect with a seed-or-reset effect:

```ts
useEffect(() => {
  if (input.initialOverrides && Object.keys(input.initialOverrides).length > 0) {
    storeResetOverrides();
    for (const [key, ov] of Object.entries(input.initialOverrides)) {
      if (ov) setOverride(key as SlotKey, ov);
    }
  } else {
    storeResetOverrides();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `pnpm vitest run tests/unit/useDeckComposer.replay.test.ts tests/unit/useDeckComposer.test.tsx`
Expected: PASS for both files.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useDeckComposer.ts tests/unit/useDeckComposer.replay.test.ts && \
rtk git commit -m "feat(deck): seed useDeckComposer from initialOverrides for replay"
```

---

## Task 5: DeckBuilder bookmark button + replay loading

**Files:**
- Modify: `src/routes/DeckBuilder.tsx`
- Test: `tests/e2e/save-replay.spec.ts` (initial sketch — finished in Task 9)

- [ ] **Step 1: Update LocationState shape and route handling**

Edit `src/routes/DeckBuilder.tsx`. Update the `LocationState` type:

```ts
type LocationState = {
  mode?: 'guided' | 'manual';
  config?: SetupConfig;
  overrides?: PlanOverrides;
  savedDeckId?: number;
  from?: 'saved-decks';
} | null;
```

Add the import:

```ts
import type { PlanOverrides, SlotKey } from '@/domain/plan';
import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import { listSavedDecks } from '@/store/db';
```

In the `DeckBuilder` parent component, read the new fields and apply `savedDeckId` on mount:

```ts
export default function DeckBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const mode = state?.mode ?? 'guided';
  const config = state?.config;
  const initialOverrides = state?.overrides;
  const stateSavedDeckId = state?.savedDeckId;
  const fromSavedDecks = state?.from === 'saved-decks';
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);

  useEffect(() => {
    if (mode === 'guided' && !config) {
      navigate('/setup', { replace: true });
      return;
    }
    if (stateSavedDeckId !== undefined) {
      setSavedDeckId(stateSavedDeckId);
    } else if (!fromSavedDecks) {
      setSavedDeckId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'guided' && !config) return null;

  const composerInput =
    mode === 'manual'
      ? { mode: 'manual' as const, ...(initialOverrides ? { initialOverrides } : {}) }
      : { mode: 'guided' as const, config: config!, ...(initialOverrides ? { initialOverrides } : {}) };

  return (
    <DeckBuilderInner
      config={config}
      composerInput={composerInput}
      fromSavedDecks={fromSavedDecks}
    />
  );
}
```

- [ ] **Step 2: Add bookmark button + sheet to DeckBuilderInner**

Update `DeckBuilderInner` signature and body. Add a state for sheet visibility, fetch the saved-deck name when in update mode, and put a bookmark icon button between Back and Start:

```tsx
function DeckBuilderInner({
  config,
  composerInput,
  fromSavedDecks,
}: {
  config: SetupConfig | undefined;
  composerInput:
    | { mode: 'guided'; config: SetupConfig; initialOverrides?: PlanOverrides }
    | { mode: 'manual'; initialOverrides?: PlanOverrides };
  fromSavedDecks: boolean;
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const mergePrescriptionOverride = useGameStore((s) => s.mergePrescriptionOverride);
  const overrides = useGameStore((s) => s.overrides);
  const savedDeckId = useGameStore((s) => s.savedDeckId);
  const { slots, isReady, setSlot, handleStart, footerLocked, showShuffle, hasOverrides, resetOverrides } =
    useDeckComposer(composerInput);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedDeckName, setSavedDeckName] = useState<string | undefined>(undefined);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (savedDeckId == null) {
      setSavedDeckName(undefined);
      return;
    }
    void listSavedDecks().then((rows) => {
      const found = rows.find((r) => r.id === savedDeckId);
      setSavedDeckName(found?.name);
    });
  }, [savedDeckId]);

  const handlePrescriptionChange = (key: SlotKey, field: PrescriptionType, value: number) => {
    mergePrescriptionOverride(key, field, value);
  };

  const sheetConfig = composerInput.mode === 'guided' ? composerInput.config : DEFAULT_CONFIG;
  const handleSheetClose = () => {
    setSheetOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const handleBack = () => {
    if (fromSavedDecks) {
      navigate('/saved-decks');
      return;
    }
    navigate('/setup', {
      state: config ? { config } : { skipLandingEntrance: true },
    });
  };

  // ... existing heading/subheading/render. Replace the footer with:
```

Replace the footer block (currently `[Back] [Start workout]`) with a three-button layout:

```tsx
<footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
  <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
    <motion.div
      className="min-w-0 shrink"
      whileTap={{ scale: reduceMotion || footerLocked ? 1 : 0.98 }}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    >
      <Button
        type="button"
        variant="outline"
        className="min-h-11 touch-manipulation"
        disabled={footerLocked}
        onClick={handleBack}
      >
        <Trans>Back</Trans>
      </Button>
    </motion.div>

    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={savedDeckId != null ? t`Update saved deck` : t`Save deck`}
      className="min-h-11 min-w-11 touch-manipulation"
      disabled={footerLocked || !isReady}
      onClick={() => setSheetOpen(true)}
    >
      {savedFlash ? (
        <BookmarkCheck className="size-5" aria-hidden />
      ) : (
        <Bookmark className="size-5" aria-hidden />
      )}
    </Button>

    <motion.div
      className="min-w-0 shrink"
      whileHover={{ scale: reduceMotion || footerLocked || !isReady ? 1 : 1.02 }}
      whileTap={{ scale: reduceMotion || footerLocked || !isReady ? 1 : 0.98 }}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    >
      <Button
        type="button"
        className="min-h-11 touch-manipulation"
        disabled={footerLocked || !isReady}
        onClick={() => void handleStart()}
      >
        <Trans>Start workout</Trans>
      </Button>
    </motion.div>
  </div>
</footer>

<SaveDeckSheet
  open={sheetOpen}
  onClose={handleSheetClose}
  config={sheetConfig}
  overrides={overrides}
  {...(savedDeckId != null ? { savedDeckId } : {})}
  {...(savedDeckName != null ? { initialName: savedDeckName } : {})}
/>
```

- [ ] **Step 3: Verify type-check + tests pass**

Run: `pnpm tsc --noEmit && pnpm vitest run tests/unit`
Expected: PASS, no type errors.

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev` and open `/deck` after wizard. Verify the bookmark button appears between Back and Start, and opens the sheet. Save a deck — sheet should close and the icon should briefly switch to a check.

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/DeckBuilder.tsx && \
pnpm extract && \
rtk git add src/locales/ && \
rtk git commit -m "feat(deck): bookmark button on DeckBuilder; load saved overrides via location state"
```

---

## Task 6: Summary Save / Update button

**Files:**
- Modify: `src/routes/Summary.tsx`

- [ ] **Step 1: Add bookmark button + sheet to Summary**

Edit `src/routes/Summary.tsx`. Add imports at the top:

```tsx
import { useState } from 'react';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import { listSavedDecks } from '@/store/db';
import { useEffect } from 'react';
```

Inside the `Summary` component, after existing hook reads, add:

```tsx
const overrides = useGameStore((s) => s.overrides);
const savedDeckId = useGameStore((s) => s.savedDeckId);
const [sheetOpen, setSheetOpen] = useState(false);
const [savedDeckName, setSavedDeckName] = useState<string | undefined>(undefined);

useEffect(() => {
  if (savedDeckId == null) {
    setSavedDeckName(undefined);
    return;
  }
  void listSavedDecks().then((rows) => {
    setSavedDeckName(rows.find((r) => r.id === savedDeckId)?.name);
  });
}, [savedDeckId]);
```

Above the existing "Done" button block, add a secondary button:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: tMotion, delay: reduceMotion ? 0 : 0.18, ease: EASE_OUT }}
  className="w-full max-w-sm sm:w-auto"
>
  <Button
    type="button"
    variant="outline"
    className="w-full min-h-11 sm:w-auto"
    onClick={() => setSheetOpen(true)}
  >
    {savedDeckId != null ? <Trans>Update saved deck</Trans> : <Trans>Save deck</Trans>}
  </Button>
</motion.div>
```

After the closing `</main>` (before the component's final `);`), render the sheet:

```tsx
<SaveDeckSheet
  open={sheetOpen}
  onClose={() => setSheetOpen(false)}
  config={config}
  overrides={overrides}
  {...(savedDeckId != null ? { savedDeckId } : {})}
  {...(savedDeckName != null ? { initialName: savedDeckName } : {})}
/>
```

Note: wrap the existing `<main>` and the `<SaveDeckSheet>` in a `<Fragment>` (or `<>`) since the component currently returns just `<main>`.

- [ ] **Step 2: Manual smoke**

Run `pnpm dev`, complete a workout to reach Summary. Verify:
- "Save deck" button appears.
- Tapping opens the sheet.
- After saving and starting a new workout from `/saved-decks`, finishing it again shows "Update saved deck" instead.

- [ ] **Step 3: Commit**

```bash
rtk git add src/routes/Summary.tsx && \
pnpm extract && \
rtk git add src/locales/ && \
rtk git commit -m "feat(summary): save / update saved deck from Summary"
```

---

## Task 7: Three-way segmented toggle on Setup landing

**Files:**
- Modify: `src/routes/Setup.tsx`

- [ ] **Step 1: Update mode union and toggle markup**

Edit `src/routes/Setup.tsx`.

Change the local mode state type:

```ts
const [setupMode, setSetupMode] = useState<'guided' | 'manual' | 'replay'>('guided');
```

Update the toggle map to include `replay` and update the button labels:

```tsx
{(['guided', 'manual', 'replay'] as const).map((m) => (
  <button
    key={m}
    type="button"
    aria-pressed={setupMode === m}
    onClick={() => setSetupMode(m)}
    className={cn(
      'relative z-10 min-h-11 min-w-0 flex-1 touch-manipulation rounded-md px-3 text-sm font-medium',
      'outline-none transition-[color,transform] duration-150',
      'focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-0',
      setupMode === m
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground',
    )}
  >
    {m === 'guided' ? <Trans>Guided</Trans> : m === 'manual' ? <Trans>Manual</Trans> : <Trans>Replay</Trans>}
  </button>
))}
```

Update the descriptor block to handle three modes:

```tsx
{setupMode === 'guided' ? (
  <Trans>We&apos;ll build your deck based on your level and gear.</Trans>
) : setupMode === 'manual' ? (
  <Trans>Assign an exercise to every card yourself.</Trans>
) : (
  <Trans>Pick a saved deck and go.</Trans>
)}
```

Update the "Go!" handler to route Replay to `/saved-decks`:

```tsx
onClick={() => {
  if (setupMode === 'manual') {
    navigate('/deck', { state: { mode: 'manual' } });
  } else if (setupMode === 'replay') {
    navigate('/saved-decks');
  } else {
    setPhase('wizard');
  }
}}
```

- [ ] **Step 2: Manual smoke**

Run `pnpm dev`. Confirm the toggle now has three segments and Replay → `/saved-decks` (will 404 until Task 9 wires it; that's expected).

- [ ] **Step 3: Commit**

```bash
rtk git add src/routes/Setup.tsx && \
pnpm extract && \
rtk git add src/locales/ && \
rtk git commit -m "feat(setup): add Replay mode to landing toggle"
```

---

## Task 8: SavedDecks route

**Files:**
- Create: `src/routes/SavedDecks.tsx`
- Test: `tests/unit/SavedDecks.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/SavedDecks.test.tsx`:

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n } from '@/i18n';
import SavedDecks from '@/routes/SavedDecks';
import { db, saveDeck } from '@/store/db';
import { useGameStore } from '@/store/gameStore';
import type { SetupConfig } from '@/domain/config';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

const wrap = (ui: ReactElement) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{ui}</MemoryRouter>
  </I18nProvider>
);

beforeEach(async () => {
  i18n.activate('en');
  vi.clearAllMocks();
  await db.savedDecks.clear();
  useGameStore.getState().reset();
});

describe('SavedDecks route', () => {
  it('renders empty state when no decks', async () => {
    render(wrap(<SavedDecks />));
    expect(await screen.findByText(/No saved decks yet/i)).toBeInTheDocument();
  });

  it('renders rows newest first with name', async () => {
    await saveDeck({ name: 'Old', config: cfg, overrides: {} });
    await new Promise((r) => setTimeout(r, 5));
    await saveDeck({ name: 'New', config: cfg, overrides: {} });
    render(wrap(<SavedDecks />));
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('New');
    expect(items[1]).toHaveTextContent('Old');
  });

  it('tapping a deck sets savedDeckId and navigates to /deck with state', async () => {
    const id = await saveDeck({
      name: 'Push Day',
      config: cfg,
      overrides: { 'suit:hearts': { id: 'pike-pushups' } },
    });
    const user = userEvent.setup();
    render(wrap(<SavedDecks />));
    await user.click(await screen.findByRole('button', { name: /Push Day/ }));
    await waitFor(() => expect(useGameStore.getState().savedDeckId).toBe(id));
    expect(mockNavigate).toHaveBeenCalledWith('/deck', {
      state: {
        mode: 'guided',
        config: cfg,
        overrides: { 'suit:hearts': { id: 'pike-pushups' } },
        savedDeckId: id,
        from: 'saved-decks',
      },
    });
  });

  it('delete with confirm removes the row', async () => {
    await saveDeck({ name: 'Tmp', config: cfg, overrides: {} });
    const user = userEvent.setup();
    render(wrap(<SavedDecks />));
    await user.click(await screen.findByRole('button', { name: /Delete Tmp/ }));
    await user.click(await screen.findByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByText(/No saved decks yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `pnpm vitest run tests/unit/SavedDecks.test.tsx`
Expected: FAIL — module `@/routes/SavedDecks` not found.

- [ ] **Step 3: Implement SavedDecks route**

Create `src/routes/SavedDecks.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { listSavedDecks, deleteSavedDeck, type SavedDeckRow } from '@/store/db';
import { buildPlan } from '@/domain/plan';
import { tExercise } from '@/i18n/exercises';
import { slotHeaderParts } from '@/lib/reviewSlotContext';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';

function summaryLine(deck: SavedDeckRow): string {
  const slots = buildPlan({ config: deck.config, overrides: deck.overrides });
  return slots
    .map((s) => `${slotHeaderParts(s.key).glyph} ${tExercise(s.selected)}`)
    .join(' · ');
}

export default function SavedDecks() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);
  const [rows, setRows] = useState<SavedDeckRow[] | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const refresh = async () => {
    const next = await listSavedDecks();
    setRows(next);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handlePick = (deck: SavedDeckRow) => {
    if (deck.id == null) return;
    setSavedDeckId(deck.id);
    navigate('/deck', {
      state: {
        mode: 'guided',
        config: deck.config,
        overrides: deck.overrides,
        savedDeckId: deck.id,
        from: 'saved-decks',
      },
    });
  };

  const handleDelete = async (id: number) => {
    await deleteSavedDeck(id);
    setConfirmId(null);
    await refresh();
  };

  if (rows == null) return null;

  return (
    <main
      id="main-content"
      className={cn('flex min-h-dvh flex-col', SHELL_SETUP, MAIN_PAD)}
    >
      <header className="flex items-center gap-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t`Back`}
          onClick={() => navigate('/setup')}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          <Trans>Saved decks</Trans>
        </h1>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-sm text-pretty text-base text-muted-foreground">
            <Trans>No saved decks yet. Finish a workout and save your deck to replay it.</Trans>
          </p>
          <Button type="button" onClick={() => navigate('/setup')}>
            <Trans>Back to setup</Trans>
          </Button>
        </div>
      ) : (
        <motion.ul
          className="mt-6 flex flex-col gap-3 sm:gap-4"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
        >
          {rows.map((deck) => (
            <li
              key={deck.id}
              className="rounded-lg border border-border/50 bg-card/85"
            >
              <div className="flex items-stretch gap-2 p-3 sm:p-4">
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  aria-label={deck.name}
                  onClick={() => handlePick(deck)}
                >
                  <p className="font-display text-base font-semibold sm:text-lg">{deck.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                    {summaryLine(deck)}
                  </p>
                </button>
                {confirmId === deck.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmId(null)}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      aria-label={t`Confirm delete`}
                      onClick={() => void handleDelete(deck.id!)}
                    >
                      <Trans>Confirm delete</Trans>
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t`Delete ${deck.name}`}
                    onClick={() => setConfirmId(deck.id ?? null)}
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </motion.ul>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `pnpm vitest run tests/unit/SavedDecks.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
rtk git add src/routes/SavedDecks.tsx tests/unit/SavedDecks.test.tsx && \
pnpm extract && \
rtk git add src/locales/ && \
rtk git commit -m "feat(saved-decks): add /saved-decks list route with replay + delete"
```

---

## Task 9: Wire route + end-to-end smoke

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/e2e/save-replay.spec.ts`

- [ ] **Step 1: Add route to App.tsx**

Edit `src/App.tsx`:

```tsx
import SavedDecks from './routes/SavedDecks';
```

Inside `<Routes>`:

```tsx
<Route path="/saved-decks" element={<SavedDecks />} />
```

- [ ] **Step 2: Write Playwright e2e**

Create `tests/e2e/save-replay.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('save deck on review, then replay from saved decks', async ({ page }) => {
  // Mark onboarded so we land on /setup
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('sweat-deck');
  });

  await page.goto('/');

  // If onboarding shows, run through it minimally
  if (await page.getByRole('button', { name: /Get started|Start/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Get started|Start/i }).click();
  }

  // Setup landing → Guided default → Go!
  await page.getByRole('button', { name: 'Go!' }).click();

  // Click through wizard's Next 4 times then Review your deck
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review your deck' }).click();

  // On /deck — open Save sheet via bookmark icon
  await page.getByRole('button', { name: 'Save deck' }).click();
  await page.getByLabel('Deck name').fill('Smoke Deck');
  await page.getByRole('button', { name: 'Save' }).click();

  // Back to landing → Replay tab → Go!
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Replay' }).click();
  await page.getByRole('button', { name: 'Go!' }).click();

  // Saved decks list shows the deck
  await expect(page.getByText('Smoke Deck')).toBeVisible();
  await page.getByRole('button', { name: 'Smoke Deck' }).click();

  // Lands on /deck with the bookmark in update mode (button label is now "Update saved deck")
  await expect(page.getByRole('button', { name: 'Update saved deck' })).toBeVisible();
});
```

- [ ] **Step 3: Run e2e**

Run: `pnpm exec playwright test save-replay`
Expected: PASS.

- [ ] **Step 4: Final type-check + full test suite**

Run: `pnpm tsc --noEmit && pnpm vitest run && pnpm exec playwright test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/App.tsx tests/e2e/save-replay.spec.ts && \
rtk git commit -m "feat(routing): wire /saved-decks; e2e smoke for save→replay"
```

---

## Self-Review Checklist (run before handing off)

- [ ] Spec coverage: every section of `2026-04-27-save-replay-deck-design.md` maps to a task above
  - Data model + helpers → Task 1
  - savedDeckId tracking → Task 2
  - SaveDeckSheet (create + update) → Task 3
  - useDeckComposer initialOverrides → Task 4
  - DeckBuilder bookmark + replay loading + back-to-saved-decks → Task 5
  - Summary save/update button → Task 6
  - Setup three-way toggle → Task 7
  - /saved-decks list + delete + replay action + empty state → Task 8
  - Routing + e2e → Task 9
- [ ] No placeholders: every step has concrete code or commands
- [ ] Type consistency: `SavedDeckRow`, `PlanOverrides`, `SlotOverride`, `setSavedDeckId`, `initialOverrides` are spelled identically in every task
- [ ] i18n: every new user-visible string uses `<Trans>` or ``t` ` `` and `pnpm extract` runs after tasks that add strings
