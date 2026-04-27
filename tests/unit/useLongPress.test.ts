import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PointerEvent, MouseEvent } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '@/hooks/useLongPress';

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onPress immediately on pointerdown', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => {
      result.current.onPointerDown({
        preventDefault: vi.fn(),
        button: 0,
      } as unknown as PointerEvent);
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary pointer button', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => {
      result.current.onPointerDown({
        preventDefault: vi.fn(),
        button: 1,
      } as unknown as PointerEvent);
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not start hold before holdDelay', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400 }));
    act(() => {
      result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onHold).not.toHaveBeenCalled();
  });

  it('fires onHold repeatedly after holdDelay at holdInterval', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => {
      result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(onHold).toHaveBeenCalledTimes(3);
  });

  it('stops hold on pointerup before interval fires', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => {
      result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onHold).not.toHaveBeenCalled();
  });

  it('stops hold on pointerLeave mid-hold', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onPress: vi.fn(), onHold, holdDelay: 400, holdInterval: 250 }),
    );
    act(() => {
      result.current.onPointerDown({ preventDefault: vi.fn() } as unknown as PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(650);
    });
    act(() => {
      result.current.onPointerLeave();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('fires onPress for keyboard click (detail: 0)', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => {
      result.current.onClick({ detail: 0 } as unknown as MouseEvent);
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress for mouse click (detail: 1)', () => {
    const onPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onPress, onHold: vi.fn() }));
    act(() => {
      result.current.onClick({ detail: 1 } as unknown as MouseEvent);
    });
    expect(onPress).not.toHaveBeenCalled();
  });
});
