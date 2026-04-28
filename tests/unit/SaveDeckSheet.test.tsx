import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import * as dbMod from '@/store/db';
import type { SetupConfig } from '@/domain/config';
import { useGameStore } from '@/store/gameStore';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

const wrap = (ui: ReactElement) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

describe('SaveDeckSheet', () => {
  beforeEach(() => {
    i18n.activate('en');
    vi.restoreAllMocks();
    useGameStore.getState().reset();
  });

  it('disables Save while name is empty', async () => {
    render(
      wrap(<SaveDeckSheet open onClose={() => {}} config={cfg} overrides={{}} />),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  });

  it('on confirm in create mode: calls saveDeck, sets savedDeckId, closes', async () => {
    const onClose = vi.fn();
    const saveSpy = vi.spyOn(dbMod, 'saveDeck').mockResolvedValue(123);
    const user = userEvent.setup();

    render(
      wrap(<SaveDeckSheet open onClose={onClose} config={cfg} overrides={{}} />),
    );

    await user.type(screen.getByLabelText('Deck name'), 'Push Day');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save', exact: true }));

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith({ name: 'Push Day', config: cfg, overrides: {} }),
    );
    expect(useGameStore.getState().savedDeckId).toBe(123);
    expect(onClose).toHaveBeenCalled();
  });

  it('on confirm in update mode: calls updateSavedDeck, closes', async () => {
    const onClose = vi.fn();
    const updateSpy = vi.spyOn(dbMod, 'updateSavedDeck').mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      wrap(
        <SaveDeckSheet
          open
          onClose={onClose}
          config={cfg}
          overrides={{}}
          savedDeckId={7}
          initialName="Old Name"
        />,
      ),
    );

    const input = screen.getByLabelText('Deck name') as HTMLInputElement;
    expect(input.value).toBe('Old Name');
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByRole('button', { name: 'Update' })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(within(dlg).getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(7, {
        name: 'New Name',
        config: cfg,
        overrides: {},
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
