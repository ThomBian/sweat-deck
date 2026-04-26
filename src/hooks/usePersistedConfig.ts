import { useEffect, useState } from 'react';
import { type SetupConfig, DEFAULT_CONFIG } from '@/domain/config';
import { loadLastConfig } from '@/store/db';

export const usePersistedConfig = (): { config: SetupConfig; loaded: boolean } => {
  const [config, setConfig] = useState<SetupConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLastConfig().then((stored) => {
      if (cancelled) return;
      if (stored) setConfig(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loaded };
};
