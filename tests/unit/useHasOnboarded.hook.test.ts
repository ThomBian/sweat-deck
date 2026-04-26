import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const { loadHasOnboardedMock, saveHasOnboardedMock } = vi.hoisted(() => ({
  loadHasOnboardedMock: vi.fn(),
  saveHasOnboardedMock: vi.fn(),
}));

vi.mock('@/store/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store/db')>();
  return {
    ...actual,
    loadHasOnboarded: loadHasOnboardedMock,
    saveHasOnboarded: saveHasOnboardedMock,
  };
});

import { useHasOnboarded } from '@/hooks/useHasOnboarded';

describe('useHasOnboarded hook', () => {
  beforeEach(() => {
    loadHasOnboardedMock.mockReset();
    saveHasOnboardedMock.mockReset();
    loadHasOnboardedMock.mockResolvedValue(false);
    saveHasOnboardedMock.mockResolvedValue(undefined);
  });

  it('sets loadFailed and still finishes loading when read fails', async () => {
    loadHasOnboardedMock.mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useHasOnboarded());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.loadFailed).toBe(true);
    expect(result.current.hasOnboarded).toBe(false);
  });

  it('markOnboarded returns false when write fails', async () => {
    saveHasOnboardedMock.mockRejectedValueOnce(new Error('quota'));
    const { result } = renderHook(() => useHasOnboarded());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let ok = true;
    await act(async () => {
      ok = await result.current.markOnboarded();
    });
    expect(ok).toBe(false);
  });
});
