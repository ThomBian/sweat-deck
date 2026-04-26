import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Setup from './routes/Setup';
import Play from './routes/Play';
import Summary from './routes/Summary';
import History from './routes/History';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/play" element={<Play />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
