import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Trans } from '@lingui/react/macro';
import { AnimatedLayout } from '@/components/AnimatedLayout';
import Index from './routes/Index';
import Onboarding from './routes/Onboarding';
import Setup from './routes/Setup';
import DeckBuilder from './routes/DeckBuilder';
import Play from './routes/Play';
import Summary from './routes/Summary';
import History from './routes/History';

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-to-content">
        <Trans>Skip to main content</Trans>
      </a>
      <Routes>
        <Route element={<AnimatedLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/deck" element={<DeckBuilder />} />
          <Route path="/play" element={<Play />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
