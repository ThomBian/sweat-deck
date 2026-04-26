# French Translation & i18n Foundation — Design

**Date:** 2026-04-26
**Status:** Approved (design)

## Goal

Add internationalization to Sweat Deck so the app can be served in French, with English remaining the source-of-truth locale. Set up a real i18n foundation (not a one-off swap) so additional locales can be added later with minimal effort.

## Non-Goals

- Translating IndexedDB content (sessions only store config + counts; no string data persisted).
- Right-to-left layouts.
- Server-side locale negotiation (PWA is fully client-side).
- Translating the PWA manifest (`name`/`short_name` stay as the neutral string "Sweat Deck").

## Stack Choice

- **`@lingui/macro` + `@lingui/react` + `@lingui/cli`** with `@lingui/vite-plugin` and `@lingui/swc-plugin` (Vite uses SWC via `@vitejs/plugin-react`).
- Catalog format: PO files (`src/locales/{en,fr}/messages.po`), compiled to TS at build time.
- Why Lingui over `react-i18next`: smaller bundle (~10kb vs ~40kb), ICU MessageFormat, typed messages via macros, build-time extraction.

## Architecture

### Locale state (Zustand)

New store `src/store/localeStore.ts`:

```ts
type Locale = 'en' | 'fr'
type LocaleStore = {
  locale: Locale
  setLocale: (l: Locale) => void
}
```

- Persisted to `localStorage` via Zustand `persist` middleware (key: `sweat-deck-locale`).
- On first boot (no persisted value): read `navigator.language`. If it starts with `fr`, default to `'fr'`; otherwise `'en'`.

### Provider wiring

`src/i18n/index.ts` exports the configured `i18n` instance. `src/main.tsx` wraps `<App>` in `<I18nProvider i18n={i18n}>`.

A small `<LocaleEffect>` component subscribes to `useLocaleStore` and calls `i18n.activate(locale)` on change. Mounted once near the root.

### Configuration files

- `lingui.config.ts` at repo root: locales `['en','fr']`, sourceLocale `'en'`, format `'po'`, `compileNamespace: 'ts'`.
- `vite.config.ts`: add `@lingui/vite-plugin`. Configure `@vitejs/plugin-react` SWC options to load `@lingui/swc-plugin`.
- `package.json` scripts:
  - `"i18n:extract": "lingui extract"`
  - `"i18n:compile": "lingui compile"`
  - `"prebuild": "lingui compile"` — guarantees fresh catalogs in production builds.

## Domain Refactor (canonical IDs)

Today, exercise/movement names live as English string literals in `src/domain/mappings.ts` and `src/domain/joker.ts`. We separate domain identity from display.

### `src/domain/mappings.ts`

Replace string-valued maps with ID-valued maps:

```ts
// before
export const NUMBER_MOVEMENTS = { Hearts: 'Push-ups', ... }

// after
export type MovementId = 'pushups' | 'squats' | 'situps' | 'lunges' /* ... */
export const NUMBER_MOVEMENTS: Record<Suit, MovementId> = {
  Hearts: 'pushups',
  Diamonds: 'squats',
  Clubs: 'situps',
  Spades: 'lunges',
}
```

Same treatment for:
- `FACE_CHALLENGES` → `FaceChallengeId`
- `FACE_CHALLENGES_CARDIO` → `FaceChallengeId` (different mapping, same ID space)
- Joker effect names in `src/domain/joker.ts` → `JokerEffectId`

### `src/domain/exercise.ts`

`Exercise.name: string` becomes `Exercise.id: ExerciseId` where `ExerciseId = MovementId | FaceChallengeId | JokerEffectId`. The pure resolution logic (`resolve()`) stays language-agnostic.

### Display lookup

New `src/i18n/exercises.ts`:

```ts
import { t } from '@lingui/macro'

export const tExercise = (id: ExerciseId): string => {
  switch (id) {
    case 'pushups': return t`Push-ups`
    case 'squats':  return t`Squats`
    // ... one case per ID
  }
}
```

A switch (rather than an object literal) ensures Lingui's macro extracts every message and the TS compiler enforces exhaustiveness.

### Tests

Existing unit tests in `tests/unit/` that assert on `.name` strings get updated to assert on IDs. Add a render test that activates `'fr'` and verifies translated output.

## UI String Coverage

All user-facing strings get wrapped with `<Trans>` (JSX) or ``t`...` `` (imperative).

Files to touch:

- Routes: `Onboarding.tsx`, `Setup.tsx`, `Play.tsx`, `Summary.tsx`, `History.tsx`, `Index.tsx`
- Components: `SetupWizard.tsx`, everything in `src/components/setup/`, `CardFace.tsx`, `Deck.tsx`, `ExercisePanel.tsx`, `Timer.tsx`
- `index.html` `<title>` and meta description: small `useEffect` updates `document.title` on locale change.

### Enum-like labels

Equipment, Theme, Difficulty, and Suit get a translator helper in `src/i18n/labels.ts`, same pattern as `tExercise`.

### Pluralization

Reps and similar counts use Lingui's `Plural` macro to handle EN/FR plural rules:

```tsx
<Plural value={reps} one="# rep" other="# reps" />
```

## Language Switcher

A compact `EN | FR` toggle wired to `useLocaleStore.setLocale()`. Placed in:

- Setup screen footer (near other settings).
- Onboarding final step (lets first-run users flip immediately).

No reload needed — provider re-activates the catalog and React re-renders.

## Testing Plan

- **Unit:** `useLocaleStore` initialization with mocked `navigator.language = 'fr-FR'` → store starts on `'fr'`.
- **Unit:** Activate `'fr'` then render `<ExercisePanel>` with a known exercise; assert French text.
- **E2E:** Extend `tests/e2e/play.spec.ts` with a pass that toggles to FR after onboarding and asserts a French heading is visible on the Play screen.

## Rollout Order

Single PR (app is small enough):

1. Install deps, add `lingui.config.ts`, scripts, Vite + SWC plugin wiring.
2. Refactor `mappings.ts` / `exercise.ts` / `joker.ts` to IDs. Update tests.
3. Add `useLocaleStore`, provider, `<LocaleEffect>`, browser detection.
4. Add `tExercise` / `tLabel` helpers; wrap UI strings with `<Trans>` / ``t`...` ``.
5. Add language switcher to Setup + Onboarding.
6. Run `pnpm i18n:extract`, fill `fr/messages.po`, run `pnpm i18n:compile`.
7. Add unit + E2E tests.

## Open Risks

- **SWC plugin compatibility:** `@lingui/swc-plugin` versioning must match the SWC version bundled by `@vitejs/plugin-react`. If incompatible, fall back to Babel macro via a Vite Babel plugin (heavier dev build but works).
- **Translation completeness:** initial FR translations will be human-written but unreviewed; treat first ship as a draft, expect copy iteration.
