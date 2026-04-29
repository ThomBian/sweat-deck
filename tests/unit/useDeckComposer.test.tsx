import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { useDeckComposer } from '@/hooks/useDeckComposer';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_CONFIG } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/db', () => ({
  saveLastConfig: vi.fn().mockResolvedValue(undefined),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);

const guidedInput = { mode: 'guided' as const, config: DEFAULT_CONFIG };

describe('useDeckComposer — guided mode', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('returns 7 slots', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    expect(result.current.slots).toHaveLength(7);
  });

  it('isReady is always true in guided mode', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    expect(result.current.isReady).toBe(true);
  });

  it('setSlot updates the selected exercise for that slot', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    const firstKey = result.current.slots[0]!.key;
    const firstOption = result.current.slots[0]!.options[1]?.id ?? result.current.slots[0]!.options[0]!.id;
    act(() => result.current.setSlot(firstKey, firstOption));
    expect(result.current.slots.find((s) => s.key === firstKey)?.selected).toBe(firstOption);
  });

  it('hasUnsavedChanges is false initially', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('hasUnsavedChanges is true after setSlot', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    const firstKey = result.current.slots[0]!.key;
    const altId = result.current.slots[0]!.options[1]?.id;
    if (!altId) return;
    act(() => result.current.setSlot(firstKey, altId));
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('resetOverrides clears overrides', () => {
    const { result } = renderHook(() => useDeckComposer(guidedInput), { wrapper });
    const firstKey = result.current.slots[0]!.key;
    const altId = result.current.slots[0]!.options[1]?.id;
    if (!altId) return;
    act(() => result.current.setSlot(firstKey, altId));
    act(() => result.current.resetOverrides());
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});

const manualInput = { mode: 'manual' as const };

describe('useDeckComposer — manual mode', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('returns 7 slots', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    expect(result.current.slots).toHaveLength(7);
  });

  it('all slots start with selected undefined', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    expect(result.current.slots.every((s) => s.selected === undefined)).toBe(true);
  });

  it('isReady is false when no slots filled', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    expect(result.current.isReady).toBe(false);
  });

  it('isReady becomes true when all 7 slots are assigned', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    act(() => {
      result.current.slots.forEach((s) => result.current.setSlot(s.key, 'pushups' as ExerciseId));
    });
    expect(result.current.isReady).toBe(true);
  });

  it('hasUnsavedChanges is always false in manual mode', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    act(() => {
      result.current.slots.forEach((s) => result.current.setSlot(s.key, 'pushups' as ExerciseId));
    });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('all slots have no defaultExercise or options', () => {
    const { result } = renderHook(() => useDeckComposer(manualInput), { wrapper });
    expect(
      result.current.slots.every((s) => s.defaultExercise === undefined && s.options.length === 0),
    ).toBe(true);
  });
});

describe('useDeckComposer baseline behavior', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('hasUnsavedChanges is false when overrides match baseline', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(
      () =>
        useDeckComposer({
          mode: 'guided',
          config: DEFAULT_CONFIG,
          initialOverrides: baselineOverrides,
        }),
      { wrapper },
    );

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('hasUnsavedChanges flips true when an override changes', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(
      () =>
        useDeckComposer({
          mode: 'guided',
          config: DEFAULT_CONFIG,
          initialOverrides: baselineOverrides,
        }),
      { wrapper },
    );

    act(() => {
      useGameStore.getState().setOverride('suit:hearts', { id: 'squat' });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('resetOverrides restores the baseline when one is set', () => {
    const baselineOverrides = { 'suit:hearts': { id: 'pushup' } } as const;
    useGameStore.getState().setSavedBaseline({
      config: DEFAULT_CONFIG,
      overrides: baselineOverrides,
    });

    const { result } = renderHook(
      () =>
        useDeckComposer({
          mode: 'guided',
          config: DEFAULT_CONFIG,
          initialOverrides: baselineOverrides,
        }),
      { wrapper },
    );

    act(() => {
      useGameStore.getState().setOverride('suit:hearts', { id: 'squat' });
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => result.current.resetOverrides());

    expect(useGameStore.getState().overrides).toEqual(baselineOverrides);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('without baseline resetOverrides clears overrides (legacy behavior)', () => {
    const { result } = renderHook(() => useDeckComposer({ mode: 'guided', config: DEFAULT_CONFIG }), {
      wrapper,
    });

    act(() => {
      useGameStore.getState().setOverride('suit:hearts', { id: 'squat' });
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => result.current.resetOverrides());
    expect(useGameStore.getState().overrides).toEqual({});
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});
