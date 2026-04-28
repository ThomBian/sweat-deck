import { useMemo, useSyncExternalStore } from 'react';

function getKeyboardInset(): number {
  if (typeof window === 'undefined') return 0;
  const innerH = window.innerHeight;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, innerH - vv.offsetTop - vv.height);
}

function getMaxOverlayHeight(): number {
  if (typeof window === 'undefined') return 0;
  const innerH = window.innerHeight;
  const vv = window.visualViewport;
  if (!vv) return Math.min(innerH * 0.8, innerH);
  return Math.min(innerH * 0.8, vv.height);
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const vv = window.visualViewport;
  const schedule = () => onChange();
  window.addEventListener('resize', schedule);
  if (vv) {
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
  }
  return () => {
    window.removeEventListener('resize', schedule);
    if (vv) {
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
    }
  };
}

/**
 * Tracks the on-screen keyboard (virtual keyboard) using the Visual Viewport API so fixed
 * bottom sheets stay above the keyboard on iOS Safari and Android Chrome.
 */
export function useVisualViewportOverlay(): {
  keyboardInset: number;
  maxOverlayHeight: number;
} {
  const keyboardInset = useSyncExternalStore(subscribe, getKeyboardInset, () => 0);
  const maxOverlayHeight = useSyncExternalStore(
    subscribe,
    getMaxOverlayHeight,
    () => 1024,
  );
  return useMemo(
    () => ({ keyboardInset, maxOverlayHeight }),
    [keyboardInset, maxOverlayHeight],
  );
}
