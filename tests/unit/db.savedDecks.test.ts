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
    const id = await saveDeck({
      name: 'Push Day',
      config: cfg,
      overrides: { 'suit:hearts': { id: 'pike-pushups' } },
    });
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
