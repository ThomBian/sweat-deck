# Saved Deck Baseline — Design

## Problem

The deck builder currently highlights a slot as "Changed" whenever the
selection or prescription differs from the **default** plan derived from
the user's `SetupConfig`. This breaks down once a deck is saved:

1. Loading a saved deck applies its overrides as the working state. Every
   swap or custom rep count immediately appears as "Changed", even though
   nothing has changed since the save.
2. The "Reset swaps" button restores the **default** plan — wiping the
   user's saved deck instead of returning to its last known good state.
3. The button is also visible whenever any override exists, regardless of
   whether the user has actually modified the saved version.
4. The Summary page always invites the user to save/update, even when the
   current deck is identical to a saved deck.

The fix is to introduce a **saved baseline**: the overrides + config
snapshot of the saved deck the user is currently editing. "Changed" and
"Reset" then operate against that baseline, not against the default plan.

## Behavior

### Per-slot "Changed" highlight

- **Baseline present** (`savedBaseline != null`): a slot is highlighted
  only when its current selection or prescription differs from the
  baseline override for that slot (or, if no baseline override exists for
  the slot, from the default exercise).
- **No baseline**: behaviour unchanged — highlighted when current state
  differs from the default plan derived from config.

### Reset button

- Label stays `Reset swaps`.
- Behaviour:
  - **Baseline present**: replace current overrides with the baseline
    overrides exactly.
  - **No baseline**: clear overrides (current behaviour).
- Visibility: only shown when `hasUnsavedChanges` is true, where
  `hasUnsavedChanges` is:
  - **Baseline present**: deep-equal compare of current overrides vs
    `baseline.overrides`. Different → unsaved changes.
  - **No baseline**: `Object.keys(overrides).length > 0`.

### Summary page

- Save invite (the lede paragraph and the `Save deck` / `Update saved
  deck` button) is rendered only when:
  - `savedDeckId == null` (deck never saved), **or**
  - `hasUnsavedChanges` is true (saved deck has been modified since last
    save).
- Otherwise both are hidden — only `Finish` remains.

## Data model

Add to `gameStore`:

```ts
type SavedBaseline = {
  config: SetupConfig;
  overrides: PlanOverrides;
};

savedBaseline: SavedBaseline | null;
setSavedBaseline: (baseline: SavedBaseline | null) => void;
```

Lifecycle:

- **Set** when:
  - `DeckBuilder` mounts with `state.savedDeckId` (loaded from
    SavedDecks) → seed baseline with the saved row's `config` and
    `overrides`.
  - `SaveDeckSheet` successfully saves or updates → seed baseline with
    the just-persisted `config` and `overrides`.
- **Cleared (set to null)** when:
  - `DeckBuilder` mounts in guided/manual mode without a savedDeckId and
    not coming from saved-decks (mirrors how `savedDeckId` itself is
    cleared today).
  - `gameStore.reset()` runs (end of session / Finish).

The baseline is **session state**, not persisted — it represents "what
the saved deck looks like as of this app load". It is stored alongside
`savedDeckId`, never independently.

## Component changes

### `src/store/gameStore.ts`

- Add `savedBaseline` to state, `setSavedBaseline` action.
- Clear in `reset()` and wherever `savedDeckId` is reset to `null`.

### `src/hooks/useDeckComposer.ts`

- Read `savedBaseline` from the store.
- Replace `hasOverrides` with `hasUnsavedChanges`, computed against the
  baseline when present (deep-equal of `overrides` vs
  `baseline.overrides`). When no baseline, retain the current
  `Object.keys(overrides).length > 0` check.
- Update `resetOverrides` to restore the baseline overrides if a
  baseline exists, else clear.
- Expose the baseline overrides on each `ComposerSlot` so `DeckSlotCard`
  can compute its highlight (`baselineOverride?: SlotOverride`).

### `src/components/deck/DeckSlotCard.tsx`

- Receive `baselineOverride` via slot.
- Replace `swappedFromDefault` / `rxCustom` with a comparison against the
  baseline:
  - If `baselineOverride` is set: highlight when `selected.id` or any
    prescription field differs from the baseline override.
  - If no `baselineOverride`: keep today's logic (diff vs default).
- The visual treatment (border ring + corner dot) is unchanged — only
  the input that drives `isOverridden` changes.

### `src/routes/DeckBuilder.tsx`

- On mount with `state.savedDeckId`, fetch the saved deck row (already
  done for `savedDeckName`) and call
  `setSavedBaseline({ config, overrides })`. When mounting without a
  savedDeckId, call `setSavedBaseline(null)`.
- Rename the local `hasOverrides` consumer to use the new
  `hasUnsavedChanges` flag from the composer for the Reset button
  visibility. No label change.

### `src/components/SaveDeckSheet.tsx`

- After a successful `saveDeck` / `updateSavedDeck`, call
  `setSavedBaseline({ config, overrides })` to make the just-saved state
  the new baseline. This immediately flips `hasUnsavedChanges` to false
  in any consumer.

### `src/routes/Summary.tsx`

- Read `savedBaseline` and `overrides` (already read).
- Compute `hasUnsavedChanges` (same helper as composer; extract to
  `src/domain/plan.ts` or a small `src/lib/planDiff.ts` module so both
  Summary and the hook share it).
- Gate the lede `<p>` and the `Save deck` / `Update saved deck` button
  on `savedDeckId == null || hasUnsavedChanges`.

## Equality helper

`PlanOverrides` is a plain `Record<SlotKey, SlotOverride>` of small
objects. A targeted equality function in
`src/lib/planDiff.ts`:

```ts
export function overridesEqual(
  a: PlanOverrides,
  b: PlanOverrides,
): boolean;

export function slotOverrideEqual(
  a: SlotOverride | undefined,
  b: SlotOverride | undefined,
): boolean;
```

Both are pure, trivially testable, and used by:

- `useDeckComposer` (for `hasUnsavedChanges`)
- `Summary` (for save-invite gating)
- `DeckSlotCard` (uses `slotOverrideEqual` for per-slot highlight)

No third-party deep-equal dependency — small surface, manual compare.

## Edge cases

- **Saved deck loaded but baseline fetch race:** the row read is async.
  Until baseline is set, treat as "no baseline" (current default-based
  highlight). When the baseline lands, highlights/reset re-evaluate. This
  is the same async pattern already used for `savedDeckName`.
- **User edits config in `Setup` after loading saved deck:** out of
  scope — config edits go through Setup which already clears
  `savedDeckId` for new flows. Baseline.config is stored but not
  compared against current config in this iteration.
- **Manual mode (no saved baseline ever):** behaviour unchanged.

## Out of scope

- Comparing `config` between baseline and current state.
- Persisting `savedBaseline` across reloads (it can be re-derived from
  `savedDeckId` on next load).
- Renaming the "Reset swaps" copy. Visual treatment unchanged.

## Tests

Add unit coverage for:

- `overridesEqual` / `slotOverrideEqual` happy paths and field-level
  diffs.
- `useDeckComposer.hasUnsavedChanges` toggling as overrides change with
  and without a baseline.
- `useDeckComposer.resetOverrides` restoring baseline when present,
  clearing when absent.
- `DeckSlotCard` highlight: not highlighted when slot matches baseline,
  highlighted when changed against baseline, baseline-less behaviour
  preserved.
- `Summary`: hides save invite when `savedDeckId != null` and overrides
  match baseline; shows it when overrides differ or no save exists.

E2E: extend `tests/e2e/save-replay.spec.ts` (or sibling) to cover save
→ navigate to summary (no invite) → modify back in builder → invite
returns.
