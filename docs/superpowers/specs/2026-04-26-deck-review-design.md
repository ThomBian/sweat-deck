# Deck Review & Exercise Swap — Design

## Goal

Between Setup and Play, let the user review the 7 exercises that the stepper resolved from their config (4 number-suit movements + 3 face challenges) and swap any of them for a curated alternative. Aces and Jokers are not reviewable.

## Scope

- 7 reviewable slots per session: `suit:hearts`, `suit:diamonds`, `suit:clubs`, `suit:spades`, `face:J`, `face:Q`, `face:K`.
- Swaps are per-session only; no persistence across games.
- Each slot exposes 0–3 curated alternatives that respect the active theme + equipment (and cardio toggle for face slots).
- Ace stays `water-break` (60s). Jokers stay dynamic and untouched.

## Data Model

### `src/domain/mappings.ts`

Extend the existing tables to carry alternatives. The default movement remains the first option presented to the user.

```ts
type SuitMovement = { id: MovementId; alts?: MovementId[] };

type FaceAlt = { id: FaceChallengeId; reps?: number; durationSec?: number; distanceM?: number };
type FaceChallenge = { id: FaceChallengeId; reps?: number; durationSec?: number; distanceM?: number; alts?: FaceAlt[] };
```

Number-card alts are pure id swaps (reps always come from `card.value`). Face-card alts carry their own prescription because face challenges can be reps-, time-, or distance-based.

### `src/domain/plan.ts` (new)

```ts
export type SlotKey = `suit:${Suit}` | `face:${FaceRank}`;
export type PlanOverrides = Partial<Record<SlotKey, ExerciseId>>;

export type PlanSlot = {
  key: SlotKey;
  defaultExercise: Exercise; // first option
  options: Exercise[];       // default first, then alts
  selected: ExerciseId;      // default id unless overridden
};

export const buildPlan = (input: { config: SetupConfig; overrides: PlanOverrides }): PlanSlot[];
```

`buildPlan` reads `NUMBER_MOVEMENTS[theme][suit][equipment]` for the 4 number suits and either `FACE_CHALLENGES_CARDIO[rank]` (when `config.cardio`) or `FACE_CHALLENGES[rank][equipment]` for the 3 face slots. For each slot it expands `[default, ...alts]` into `Exercise` objects. Number slots use a synthetic `reps: 0` placeholder for display only — actual reps come from the card at draw time.

### `src/domain/exercise.ts`

`resolve` gains a third arg:

```ts
export const resolve = (input: { card: Card; config: SetupConfig; overrides?: PlanOverrides }): Exercise;
```

Behavior:

- `card.type === 'ace'` → `water-break` (unchanged, overrides ignored).
- `card.type === 'joker'` → unchanged (overrides ignored).
- `card.type === 'number'` → `key = suit:${card.suit}`; if `overrides[key]` set and present in that slot's option list, return `{ id: overrides[key], reps: card.value }`; otherwise current behavior.
- `card.type === 'face'` → `key = face:${card.rank}`; if `overrides[key]` set, return the matching `FaceAlt` (with its own reps/duration/distance); otherwise current behavior.

Override ids that are no longer valid for the current slot (e.g. equipment changed) are ignored as if absent.

## State

### `src/store/gameStore.ts`

Add to session state:

```ts
overrides: PlanOverrides;
setOverride: (key: SlotKey, id: ExerciseId) => void;
clearOverride: (key: SlotKey) => void;
resetOverrides: () => void;
```

Reset rules:

- `startNewGame` (or equivalent session-init path) sets `overrides = {}`.
- Any setup-config change clears `overrides` (override ids may not be valid under a new theme/equipment/cardio).
- All draw paths pass `overrides` into `resolve(...)`.

## Routing & Flow

New route: `src/routes/Review.tsx` mounted at `/review`.

- Setup wizard's final-step CTA navigates to `/review` instead of `/play`.
- `Review` CTA "Start workout" navigates to `/play`.
- `Review` back action returns to `/setup` and preserves the in-progress draft.
- Direct `/play` access continues to work; `overrides` defaults to `{}`.

Page transitions reuse `AnimatedLayout`.

## UI

### `src/routes/Review.tsx`

- Header: "Review your deck" + subtitle "Tap a card to swap".
- Grid of 7 `ReviewCard`s in fixed order: ♥ ♦ ♣ ♠ then J Q K.
- Sticky bottom bar:
  - Primary: "Start workout" → `/play`.
  - Secondary: "Reset swaps" — disabled when `overrides` is empty.

Layout: 2 columns on small viewports, 4 columns from `md` upward. Cards preserve `CardFace` aspect ratio.

### `src/components/review/ReviewCard.tsx`

- Props: `{ slot: PlanSlot; onPick: (id: ExerciseId) => void }`.
- Renders `CardFace` with the slot's suit/rank, exercise name, and a reps/duration/distance pill (number slots show "×N reps" generically, faces show their actual prescription).
- Tap → expands inline to an alt picker reusing `SetupOptionButton` styling. On small viewports the picker may render as a bottom sheet for thumb reach (implementer choice; both are acceptable).
- Visual override marker: subtle accent ring + small dot when `slot.selected !== slot.defaultExercise.id`.
- When `slot.options.length === 1`: card is non-interactive, shows muted hint "no alternatives".

### Motion & Accessibility

- All transitions honor `prefers-reduced-motion` via `src/lib/motion.ts`.
- Cards are real buttons (keyboard focusable) with aria-expanded on the alt picker.
- Selected alt is announced to screen readers via the radio group's accessible name.

## i18n

- All UI strings flow through Lingui.
- New exercise ids added to `src/i18n/exercises.ts` for both `en` and `fr` at the time the alt is introduced (rule: complete translations on add, no fallback debt).
- Reuse existing exercise ids when the alt is the same movement already mapped elsewhere; only add new ids for genuinely new movements.

The initial alt catalog (which movement appears as alt for which slot) is populated by the implementer in `mappings.ts` as part of the implementation plan and is not enumerated here.

## Testing

### Unit

- `tests/unit/plan.test.ts`
  - `buildPlan` returns 7 slots in the documented order for any `SetupConfig`.
  - `selected === default` when `overrides` is empty.
  - `selected` reflects an override when provided.
  - Cardio toggle changes face slot sources.
- `tests/unit/exercise.test.ts` (extend)
  - `resolve` applies overrides for number + face cards.
  - `resolve` ignores overrides for ace + joker.
  - Number override preserves `reps = card.value`.
  - Face override carries its own prescription.
  - Invalid override id (not in slot options) is ignored.
- `tests/unit/gameStore.test.ts`
  - `setOverride` / `clearOverride` / `resetOverrides` behave as specified.
  - Overrides cleared on new game and on config change.

### E2E

`tests/e2e/review.spec.ts`:

- Completing the wizard lands on `/review`.
- Tapping ♥ → picking an alt → "Start workout" → `/play` shows the alt when a number-heart card is drawn (use a deterministic seed or stub).
- "Reset swaps" clears overrides; CTA disables again.
- Back from `/review` preserves the setup draft.

## Out of Scope (YAGNI)

- Persisting overrides across sessions.
- Per-card-instance swap (e.g. swap only this specific 5♥).
- Free-text user-defined exercises.
- "Suggest random alt" / re-roll button.
- Editing the alt catalog from the UI.
