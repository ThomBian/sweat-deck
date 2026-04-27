# Save & Replay Deck — Design

## Overview

Users can save a named deck (config + exercise overrides) from the DeckBuilder or Summary page and replay it later. Saved decks are listed on a dedicated `/saved-decks` route, accessible from the Setup landing via a third "Replay" tab. When replaying a saved deck, the user lands on `/deck` to review and optionally update it before starting. If the session was derived from a saved deck, "Save" becomes "Update" to overwrite the existing record.

---

## Data Model

New Dexie table `savedDecks`, added in a version 3 migration. The shape is identical regardless of whether the deck was created in guided or manual mode — guided uses a real `SetupConfig` + partial overrides; manual uses `DEFAULT_CONFIG` + full overrides covering every assignable slot.

```ts
type SavedDeckRow = {
  id?: number;          // auto-increment PK
  name: string;         // user-given name
  savedAt: number;      // Date.now()
  config: SetupConfig;  // DEFAULT_CONFIG for manual-mode decks
  overrides: PlanOverrides; // slot → exerciseId for every customised slot
};
```

New helpers in `src/store/db.ts`:

| Function | Signature | Description |
|---|---|---|
| `saveDeck` | `({ name, config, overrides }) → Promise<number>` | Inserts a new row, returns id |
| `updateSavedDeck` | `(id: number, { name, config, overrides }) → Promise<void>` | Overwrites an existing row |
| `listSavedDecks` | `() → Promise<SavedDeckRow[]>` | All rows, newest first |
| `deleteSavedDeck` | `(id: number) → Promise<void>` | Deletes by id |
| `hasSavedDecks` | `() → Promise<boolean>` | True if table has ≥ 1 row |

---

## Tracking the Source Saved Deck

To support "Update", the id of the saved deck that seeded the current session must flow through the whole workout lifecycle. It is stored in `gameStore` as `savedDeckId: number | null` (null = not from a saved deck). It is set when the user navigates from `/saved-decks` to `/deck`, and cleared on `reset()`.

`gameStore` additions:
```ts
savedDeckId: number | null;
setSavedDeckId: (id: number | null) => void;
```

---

## Save / Update Flow

### `SaveDeckSheet` component

Shared bottom sheet (`src/components/SaveDeckSheet.tsx`). Handles both create and update.

```ts
{
  open: boolean;
  onClose: () => void;
  config: SetupConfig;
  overrides: PlanOverrides;
  savedDeckId?: number;   // present → update mode
  initialName?: string;   // pre-filled when updating
}
```

- Text input for the deck name (auto-focused; pre-filled with `initialName` in update mode)
- Primary button label: **"Save"** (create) or **"Update"** (update)
- Disabled while name is empty
- On confirm:
  - Create: calls `saveDeck({ name, config, overrides })`, then `setSavedDeckId(newId)`
  - Update: calls `updateSavedDeck(savedDeckId, { name, config, overrides })`
- Closes on confirm; no navigation side effects

### DeckBuilder page (`/deck`)

- Bookmark icon button in the fixed footer: `[← Back] [🔖] [Start workout]`
- If `gameStore.savedDeckId` is set → opens sheet in update mode (pre-filled name from the saved row)
- If not set → opens sheet in create mode
- After confirm: brief checkmark flash on the bookmark button
- Overrides come from `useDeckComposer.overrides`; config from `location.state.config` (guided) or `DEFAULT_CONFIG` (manual)

### Summary page

- Secondary button above "Done":
  - Label: **"Update saved deck"** if `gameStore.savedDeckId` is set
  - Label: **"Save deck"** otherwise
- Tapping opens `SaveDeckSheet` with config and overrides from `useGameStore`
- After confirm: button shows a brief checkmark, then returns to normal

---

## Entry Point — Setup Landing

The existing `[Guided] [Manual]` segmented toggle becomes a three-way toggle:

```
[ Guided ]  [ Manual ]  [ Replay ]
```

- Descriptor line for **Replay**: "Pick a saved deck and go."
- The single **"Go!"** CTA:
  - Guided → wizard → `/deck`
  - Manual → `/deck` (blank slots)
  - Replay → `/saved-decks`
- The Replay tab is always shown (not conditionally hidden). If the user lands on `/saved-decks` with no decks, the empty state guides them back.

---

## `/saved-decks` Route

New route at `src/routes/SavedDecks.tsx`.

**List view** (newest first):

Each deck card shows:
- Deck name (bold, display font)
- Exercise summary: `buildPlan({ config, overrides })` → 7 slot names joined with `·`
  e.g. `♥ Push-Up · ♦ Squat · ♣ Pull-Up · ♠ Lunge · J Burpee · Q Plank · K Deadlift`
- Trash icon button to delete — inline confirm step (no modal) to avoid accidents

**Header**: back button → `/setup`

**Empty state**: "No saved decks yet. Finish a workout and save your deck to replay it." + "Back to setup" CTA.

---

## Replay Flow

Tapping a saved deck card from `/saved-decks`:

1. `gameStore.setSavedDeckId(deck.id)`
2. Navigate to `/deck` with `location.state = { mode: 'guided', config: deck.config, overrides: deck.overrides, from: 'saved-decks' }`

**DeckBuilder / `useDeckComposer` on mount** (guided path):

```
if (location.state.overrides) {
  // initialise slots from saved overrides instead of a clean slate
  initFromOverrides(location.state.overrides);
} else {
  buildPlan(config, {});
}
```

User can still swap exercises freely before starting.

**Back button** on DeckBuilder: if `location.state.from === 'saved-decks'`, navigate back to `/saved-decks`; otherwise navigate to `/setup`.

**Start workout**: unchanged — `start(config)` preserves overrides, shuffle transition, `/play`.

---

## Routing

Add `/saved-decks` to the router in `src/App.tsx`.

---

## Out of Scope

- Editing a saved deck's name without opening the save sheet
- Reordering saved decks
- Syncing saved decks across devices
- Limit on number of saved decks
- "Save as new copy" when updating (always overwrites)
