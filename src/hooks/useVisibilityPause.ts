import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * When the tab is hidden, pause as visibility. On visible, only auto-resume if
 * the pause was caused by tab blur (keeps a manual pause across tab switch).
 */
export const useVisibilityPause = () => {
  useEffect(() => {
    const onVis = () => {
      const s = useGameStore.getState();
      if (!s.startedAt || s.finished) return;
      if (document.visibilityState === 'hidden') {
        s.pause('visibility');
        return;
      }
      if (document.visibilityState === 'visible' && s.pausedBy === 'visibility') {
        s.resume();
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
};
