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

/**
 * Max height for a fixed bottom sheet: never taller than the **visible** viewport, so flex
 * content (handle → search → list) isn’t clipped from the top when the keyboard is open.
 * Still capped at ~80% of layout height when the keyboard is closed.
 */
export function readMaxSheetHeight(): number {
  if (typeof window === 'undefined') return 1024;
  const vv = window.visualViewport;
  const inner = window.innerHeight;
  const cap80 = inner * 0.8;
  if (!vv) return Math.min(cap80, inner);
  return Math.min(cap80, vv.height);
}

const METRICS_CLOSED: { keyboardInset: number; maxSheetHeight: number } = {
  keyboardInset: 0,
  maxSheetHeight: 1024,
};

let metricsCacheKey = '';
let metricsCache: { keyboardInset: number; maxSheetHeight: number } | null = null;

function readSheetMetricsSnapshot(overlayActive: boolean): { keyboardInset: number; maxSheetHeight: number } {
  if (!overlayActive) {
    return METRICS_CLOSED;
  }
  const keyboardInset = readKeyboardInset();
  const maxSheetHeight = readMaxSheetHeight();
  const key = `${keyboardInset}|${maxSheetHeight}`;
  if (key === metricsCacheKey && metricsCache) {
    return metricsCache;
  }
  metricsCacheKey = key;
  metricsCache = { keyboardInset, maxSheetHeight };
  return metricsCache;
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
 * Metrics for fixed bottom sheets: lift by `keyboardInset` and **cap height** so the panel
 * never extends above the visible visual viewport (otherwise the top — including search — is
 * clipped while the bottom list stays on screen).
 *
 * @param overlayActive Pass `false` when the overlay is closed to detach listeners.
 */
export function useVisualViewportSheetMetrics(overlayActive: boolean): {
  keyboardInset: number;
  maxSheetHeight: number;
} {
  const subscribe = useMemo(() => createSubscribe(overlayActive), [overlayActive]);
  const getSnapshot = useCallback(
    () => readSheetMetricsSnapshot(overlayActive),
    [overlayActive],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => METRICS_CLOSED);
}
