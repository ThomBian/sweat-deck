import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Space between the layout viewport bottom and the visual viewport bottom (keyboard, etc.).
 */
export function readKeyboardInset(): number {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutH = Math.max(
    window.innerHeight,
    document.documentElement?.clientHeight ?? 0,
  );
  return Math.max(0, layoutH - vv.offsetTop - vv.height);
}

function createSubscribe(overlayActive: boolean) {
  return (onChange: () => void) => {
    if (!overlayActive || typeof window === 'undefined') {
      return () => {};
    }
    const vv = window.visualViewport;
    const bump = () => {
      onChange();
    };

    let burstTimeouts: number[] = [];

    const clearBurst = () => {
      if (burstTimeouts.length) {
        burstTimeouts.forEach((id) => window.clearTimeout(id));
        burstTimeouts = [];
      }
    };

    /** iOS Safari often updates visualViewport a few frames after an input focuses */
    const scheduleKeyboardSyncBurst = () => {
      clearBurst();
      bump();
      const delays = [16, 48, 96, 160, 240, 400, 560, 720];
      burstTimeouts = delays.map((ms) => window.setTimeout(bump, ms));
    };

    const onFocusIn = (e: Event) => {
      const el = e.target;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        scheduleKeyboardSyncBurst();
      }
    };

    const onFocusOut = () => {
      clearBurst();
      bump();
    };

    window.addEventListener('resize', bump);
    window.addEventListener('orientationchange', bump);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    if (vv) {
      vv.addEventListener('resize', bump);
      vv.addEventListener('scroll', bump);
    }

    return () => {
      clearBurst();
      window.removeEventListener('resize', bump);
      window.removeEventListener('orientationchange', bump);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      vv?.removeEventListener('resize', bump);
      vv?.removeEventListener('scroll', bump);
    };
  };
}

/**
 * Tracks the virtual keyboard via the Visual Viewport API. Pair with `bottom: inset px`
 * (fixed to the layout viewport bottom) — not a shrinking max-height — so the UI stays above the keyboard.
 *
 * @param overlayActive Pass `false` when the overlay is closed to detach listeners.
 */
export function useVisualViewportKeyboardInset(overlayActive: boolean): number {
  const subscribe = useMemo(() => createSubscribe(overlayActive), [overlayActive]);
  const getSnapshot = useCallback(
    () => (overlayActive ? readKeyboardInset() : 0),
    [overlayActive],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
