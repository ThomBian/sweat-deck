import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { ExerciseSearchSheet } from '@/components/review/ExerciseSearchSheet';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(() => {
  i18n.activate('en');
});

describe('ExerciseSearchSheet', () => {
  it('lists recommended rows when query is empty', () => {
    const onPick = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <ExerciseSearchSheet
          open
          onOpenChange={() => {}}
          slotKey="suit:hearts"
          config={cfg}
          selected="pushups"
          onPick={onPick}
        />
      </I18nProvider>,
    );
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
    const recList = screen.getByRole('listbox', { name: /Recommended exercises/i });
    expect(within(recList).getAllByRole('option').length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: /All exercises/i })).toBeInTheDocument();
    const allLists = screen.getAllByRole('listbox');
    const restList = allLists.find((el) => el.getAttribute('aria-labelledby')?.includes('exercise-sheet-all'));
    expect(restList).toBeTruthy();
    expect(within(restList!).getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('calls onPick when an option is activated', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <I18nProvider i18n={i18n}>
        <ExerciseSearchSheet
          open
          onOpenChange={() => {}}
          slotKey="suit:hearts"
          config={cfg}
          selected="pushups"
          onPick={onPick}
        />
      </I18nProvider>,
    );
    const list = screen.getByRole('listbox', { name: /Recommended exercises/i });
    const buttons = within(list).getAllByRole('button');
    await user.click(buttons[1]!);
    expect(onPick).toHaveBeenCalledWith('pike-pushups');
  });
});
