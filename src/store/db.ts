import Dexie, { type Table } from 'dexie';
import type { SetupConfig } from '@/domain/config';

export type ConfigRow = { id: 'last'; config: SetupConfig };

export type SessionRow = {
  id?: number;
  startedAt: number;
  durationSec: number;
  drawnCount: number;
  config: SetupConfig;
};

class SweatDeckDb extends Dexie {
  configs!: Table<ConfigRow, 'last'>;
  sessions!: Table<SessionRow, number>;

  constructor() {
    super('sweat-deck');
    this.version(1).stores({
      configs: 'id',
      sessions: '++id, startedAt',
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

export const recordSession = async (row: Omit<SessionRow, 'id'>): Promise<number> => {
  return db.sessions.add(row);
};
