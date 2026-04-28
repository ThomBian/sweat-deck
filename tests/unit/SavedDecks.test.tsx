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
    expect(await screen.findByText(/Save a deck from the finish screen/i)).toBeInTheDocument();
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
    await user.click(await screen.findByRole('button', { name: 'Open Push Day' }));
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
    expect(await screen.findByText(/Save a deck from the finish screen/i)).toBeInTheDocument();
  });
});
