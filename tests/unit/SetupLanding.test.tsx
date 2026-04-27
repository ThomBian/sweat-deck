import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n } from '@/i18n';
import Setup from '@/routes/Setup';

const mockNavigate = vi.fn();

const persistedMock = vi.hoisted(() => ({
  config: {
    difficulty: 'intermediate' as const,
    equipment: 'bodyweight' as const,
    theme: 'full' as const,
    cardio: false,
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/setup', search: '', hash: '', key: 'default' }),
  };
});

vi.mock('@/hooks/usePersistedConfig', () => ({
  usePersistedConfig: vi.fn().mockReturnValue({ config: persistedMock.config, loaded: true, loadFailed: false }),
}));

const wrap = (ui: ReactNode) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter initialEntries={['/setup']}>{ui}</MemoryRouter>
  </I18nProvider>
);

describe('Setup landing — mode toggle', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.clearAllMocks();
  });

  it('shows Guided and Manual toggle buttons', () => {
    render(wrap(<Setup />));
    expect(screen.getByRole('button', { name: /guided/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
  });

  it('shows "Go!" CTA', () => {
    render(wrap(<Setup />));
    expect(screen.getByRole('button', { name: /go!/i })).toBeInTheDocument();
  });

  it('shows guided descriptor by default', () => {
    render(wrap(<Setup />));
    expect(screen.getByText(/build your deck based on your level and gear/i)).toBeInTheDocument();
  });

  it('switches descriptor when Manual is selected', async () => {
    const user = userEvent.setup();
    render(wrap(<Setup />));
    await user.click(screen.getByRole('button', { name: /manual/i }));
    expect(
      await screen.findByText(/assign an exercise to every card yourself/i, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it('"Go!" in Manual mode navigates to /deck with mode:manual', async () => {
    const user = userEvent.setup();
    render(wrap(<Setup />));
    await user.click(screen.getByRole('button', { name: /manual/i }));
    await user.click(screen.getByRole('button', { name: /go!/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/deck', { state: { mode: 'manual' } });
  });
});
