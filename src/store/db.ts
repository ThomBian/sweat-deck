import Dexie, { type Table } from 'dexie';
import type { SetupConfig } from '@/domain/config';

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
