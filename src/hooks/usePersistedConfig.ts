import { useEffect, useState } from 'react';
import { type SetupConfig, DEFAULT_CONFIG } from '@/domain/config';
import { loadLastConfig } from '@/store/db';

export const usePersistedConfig = (): {
  config: SetupConfig;
  loaded: boolean;
  /** True if IndexedDB read failed; draft falls back to defaults. */
  loadFailed: boolean;
} => {
  const [config, setConfig] = useState<SetupConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLastConfig()
      .then((stored) => {
        if (cancelled) return;
        if (stored) setConfig(stored);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loaded, loadFailed };
};
