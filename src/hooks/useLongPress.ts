import { useRef, useEffect, useCallback } from 'react';
import type { PointerEvent, MouseEvent } from 'react';

export type UseLongPressOptions = {
  onPress: () => void;
  onHold: () => void;
  holdDelay?: number;
  holdInterval?: number;
};

export type UseLongPressHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onClick: (e: MouseEvent) => void;
};

export function useLongPress({
  onPress,
  onHold,
  holdDelay = 400,
  holdInterval = 250,
}: UseLongPressOptions): UseLongPressHandlers {
  const onPressRef = useRef(onPress);
  const onHoldRef = useRef(onHold);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);
  useEffect(() => {
    onHoldRef.current = onHold;
  }, [onHold]);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      // Ignore non-primary button (e.g. middle click); `button` may be omitted in tests
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      onPressRef.current();
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => onHoldRef.current(), holdInterval);
      }, holdDelay);
    },
    [holdDelay, holdInterval],
  );

  const onClick = useCallback((e: MouseEvent) => {
    if (e.detail === 0) onPressRef.current();
  }, []);

  return { onPointerDown, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, onClick };
}
