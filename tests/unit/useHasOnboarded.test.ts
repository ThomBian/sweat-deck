import { describe, it, expect, beforeEach } from 'vitest';
import { db, loadHasOnboarded, saveHasOnboarded } from '@/store/db';

describe('hasOnboarded persistence', () => {
  beforeEach(async () => {
    await db.meta.clear();
  });

  it('round-trips read/write', async () => {
    expect(await loadHasOnboarded()).toBe(false);
    await saveHasOnboarded(true);
    expect(await loadHasOnboarded()).toBe(true);
  });
});
