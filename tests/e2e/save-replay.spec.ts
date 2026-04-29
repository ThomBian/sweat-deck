import { test, expect, type Page } from '@playwright/test';

async function resetDb(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('sweat-deck');
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
        req.onsuccess = () => resolve();
      }),
  );
  await page.goto('/');
}

async function completeWizardToReview(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$|\/$/);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByRole('button', { name: 'Go!' }).click();

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Review your deck' }).click();
  await expect(page).toHaveURL(/\/deck$/);
}

test.describe('save & replay deck', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page);
  });

  test('save deck on review, then replay from saved decks', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page).toHaveURL(/\/setup$/);

    await page.getByRole('button', { name: 'Go!' }).click();

    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Review your deck' }).click();
    await expect(page).toHaveURL(/\/deck$/);

    await page.getByRole('button', { name: 'Save deck' }).click();
    await page.getByLabel('Deck name').fill('Smoke Deck');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    // Guided Back resumes the wizard at the time step; Back through to landing for Replay.
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'Back' }).click();
    }

    await page.getByRole('button', { name: 'Replay' }).click();
    await page.getByRole('button', { name: 'Go!' }).click();

    await expect(page).toHaveURL(/\/saved-decks$/);
    await expect(page.getByText('Smoke Deck')).toBeVisible();
    await page.getByRole('button', { name: /Open Smoke Deck/i }).click();

    await expect(page).toHaveURL(/\/deck$/);
    await expect(page.getByRole('button', { name: 'Update deck' })).toBeVisible();
  });

  test('summary hides save invite once saved with no edits', async ({ page }) => {
    await completeWizardToReview(page);
    await page.getByRole('button', { name: /Start workout/i }).click();
    await expect(page).toHaveURL(/\/play$/, { timeout: 15_000 });

    const drawBtn = page.getByRole('button', { name: /Draw a card from the stack/i });
    for (let i = 0; i < 5; i++) {
      await drawBtn.click();
    }

    await page.getByRole('button', { name: /Finish/i }).first().click();
    await expect(page).toHaveURL(/\/summary$/);

    await page.getByRole('button', { name: /Save deck/i }).click();
    await page.getByLabel(/Deck name/i).fill('Test Deck');
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('button', { name: /Update deck/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Save deck/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Finish$/i })).toBeVisible();
  });
});
