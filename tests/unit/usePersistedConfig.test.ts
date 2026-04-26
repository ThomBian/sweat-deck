import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { loadLastConfigMock } = vi.hoisted(() => ({
  loadLastConfigMock: vi.fn(),
}));

vi.mock('@/store/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/db')>();
  return {
    ...actual,
    loadLastConfig: loadLastConfigMock,
  };
});

import { DEFAULT_CONFIG } from '@/domain/config';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';

describe('usePersistedConfig', () => {
  beforeEach(() => {
    loadLastConfigMock.mockReset();
    loadLastConfigMock.mockResolvedValue(null);
  });

  it('sets loadFailed and defaults when read fails', async () => {
    loadLastConfigMock.mockRejectedValueOnce(new Error('blocked'));
    const { result } = renderHook(() => usePersistedConfig());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.loadFailed).toBe(true);
    expect(result.current.config).toEqual(DEFAULT_CONFIG);
  });
});
