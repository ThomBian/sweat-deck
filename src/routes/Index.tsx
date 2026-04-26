import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { MAIN_PAD } from '@/lib/layout';

export default function Index() {
  const { hasOnboarded, loaded } = useHasOnboarded();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    navigate(hasOnboarded ? '/setup' : '/onboarding', { replace: true });
  }, [loaded, hasOnboarded, navigate]);

  if (!loaded) {
    return (
      <main
        id="main-content"
        className={`flex min-h-dvh flex-col items-center justify-center gap-3 ${MAIN_PAD}`}
        role="status"
        aria-live="polite"
      >
        <DeckGlyphPulse />
        <span className="sr-only">Loading</span>
      </main>
    );
  }

  return null;
}
