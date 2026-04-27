# Save & Replay Deck — Design

## Overview

Users can save a named deck (config + exercise overrides) from the Review or Summary page and replay it later. Saved decks are listed on a dedicated `/saved-decks` route, accessible from the Setup landing. Tapping a saved deck loads it directly into the Review page, skipping the setup wizard.

---

## Data Model

New Dexie table `savedDecks`, added in a version 3 migration:

```ts
type SavedDeckRow = {
  id?: number;        // auto-increment PK
  name: string;       // user-given name
  savedAt: number;    // Date.now()
  config: SetupConfig;
  overrides: PlanOverrides;
};
```

New helpers in `src/store/db.ts`:

| Function | Signature | Description |
|---|---|---|
| `saveDeck` | `({ name, config, overrides }) → Promise<number>` | Inserts a new row, returns id |
| `listSavedDecks` | `() → Promise<SavedDeckRow[]>` | All rows, newest first |
| `deleteSavedDeck` | `(id: number) → Promise<void>` | Deletes by id |
| `hasSavedDecks` | `() → Promise<boolean>` | True if table has ≥ 1 row |

---

## Save Flow

### `SaveDeckSheet` component

Shared bottom sheet (`src/components/SaveDeckSheet.tsx`). Props:

```ts
{
  open: boolean;
  onClose: () => void;
  config: SetupConfig;
  overrides: PlanOverrides;
}
```

- Text input for the deck name (auto-focused, no default value)
- "Save" confirm button — disabled while name is empty
- On confirm: calls `saveDeck({ name, config, overrides })`, then `onClose()`
- No navigation side effects

### Review page (`/deck`)

- Bookmark icon button added to the fixed footer between "Back" and "Start workout": `[← Back] [🔖] [Start workout]`
- Tapping opens `SaveDeckSheet` with `config` from `location.state.config` and `overrides` from `useGameStore`
- After save: brief checkmark flash on the bookmark button

### Summary page (`/summary`)

- Secondary "Save deck" button added above the existing "Done" button
- Tapping opens `SaveDeckSheet` with `config` and `overrides` from `useGameStore`
- After save: button shows a brief checkmark, then returns to normal

---

## Entry Point — Setup Landing

- On mount, call `hasSavedDecks()` — if true, render a secondary "Replay a saved deck →" text button below the "Continue" CTA
- If false (no saved decks), the button is not rendered at all
- Tapping navigates to `/saved-decks`

---

## `/saved-decks` Route

New route at `src/routes/SavedDecks.tsx`.

**List view** (newest first):

Each deck card shows:
- Deck name (bold, display font)
- Exercise summary line: `buildPlan({ config, overrides })` → 7 slot names joined with `·` e.g. `♥ Push-Up · ♦ Squat · ♣ Pull-Up · ♠ Lunge · J Burpee · Q Plank · K Deadlift`
- Trash icon button to delete — requires a confirmation step (inline confirm buttons, no modal) to avoid accidents

**Header**: back button → `/setup`

**Empty state**: shown if somehow reached with no saved decks (e.g. after deleting the last one). Message + "Back to setup" CTA.

---

## Replay Flow

Tapping a saved deck card from `/saved-decks`:

1. Navigate to `/deck` with `location.state = { config, overrides, from: 'saved-decks' }`

**Review page changes on mount**:

```
if (location.state.overrides) {
  // apply saved overrides instead of resetting
  resetOverrides();
  Object.entries(overrides).forEach(([key, id]) => setOverride(key as SlotKey, id));
} else {
  resetOverrides();
}
```

User can still swap exercises freely before starting.

**Back button** on Review: if `location.state.from === 'saved-decks'`, navigate back to `/saved-decks`; otherwise navigate to `/setup` (existing behaviour).

**Start workout**: unchanged — `start(config)` preserves overrides, shuffle transition, `/play`.

---

## Routing

Add `/saved-decks` to the router in `src/App.tsx`.

---

## Out of Scope

- Editing a saved deck's name after save
- Reordering saved decks
- Syncing saved decks across devices
- Limit on number of saved decks
