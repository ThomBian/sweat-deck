import Dexie, { type Table } from 'dexie';
import type { SetupConfig } from '@/domain/config';
import type { PlanOverrides } from '@/domain/plan';

export type SavedDeckRow = {
  id?: number;
  name: string;
  savedAt: number;
  config: SetupConfig;
  overrides: PlanOverrides;
};

export type ConfigRow = { id: 'last'; config: SetupConfig };

export type MetaRow = { key: 'hasOnboarded'; value: boolean };

export type SessionEndReason = 'deck' | 'manual';

export type SessionRow = {
  id?: number;
  startedAt: number;
  durationSec: number;
  drawnCount: number;
  config: SetupConfig;
  endReason?: SessionEndReason;
  completedDeck?: boolean;
  endedInOvertime?: boolean;
};

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

export const db = new SweatDeckDb();

export const loadLastConfig = async (): Promise<SetupConfig | null> => {
  const row = await db.configs.get('last');
  return row?.config ?? null;
};

export const saveLastConfig = async (config: SetupConfig): Promise<void> => {
  await db.configs.put({ id: 'last', config });
};

export const loadHasOnboarded = async (): Promise<boolean> => {
  const row = await db.meta.get('hasOnboarded');
  return row?.value === true;
};

export const saveHasOnboarded = async (value: boolean): Promise<void> => {
  await db.meta.put({ key: 'hasOnboarded', value });
};

export const recordSession = async (row: Omit<SessionRow, 'id'>): Promise<number> => {
  return db.sessions.add(row);
};

export const saveDeck = async (input: {
  name: string;
  config: SetupConfig;
  overrides: PlanOverrides;
}): Promise<number> => {
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
