import { useCallback, useEffect, useState } from 'react';
import { loadHasOnboarded, saveHasOnboarded } from '@/store/db';

export const useHasOnboarded = (): {
  hasOnboarded: boolean;
  loaded: boolean;
  /** True if IndexedDB read failed; we assume first-time and avoid blocking the app. */
  loadFailed: boolean;
  markOnboarded: () => Promise<boolean>;
} => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadHasOnboarded()
      .then((v) => {
        if (cancelled) return;
        setHasOnboarded(v);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setHasOnboarded(false);
      })
      .finally(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markOnboarded = useCallback(async () => {
    try {
      await saveHasOnboarded(true);
      setHasOnboarded(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { hasOnboarded, loaded, loadFailed, markOnboarded };
};
