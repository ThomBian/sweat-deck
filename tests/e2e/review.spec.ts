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

test.describe('deck route', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page);
  });

  test('completing wizard lands on /deck with 7 slot cards', async ({ page }) => {
    await completeWizardToReview(page);
    const grid = page.locator('[aria-label="Exercise slots"] > div');
    await expect(grid).toHaveCount(7);
  });

  test('"Start workout" navigates to /play', async ({ page }) => {
    await completeWizardToReview(page);
    await page.getByRole('button', { name: 'Start workout' }).click();
    await expect(page).toHaveURL(/\/play$/, { timeout: 15_000 });
  });

  test('"Reset swaps" is hidden when no overrides', async ({ page }) => {
    await completeWizardToReview(page);
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toHaveCount(0);
  });

  test('picking an alt enables "Reset swaps" and shows accent ring', async ({ page }) => {
    await completeWizardToReview(page);
    const heartCard = page.locator('[aria-label="Exercise slots"] > div').first().locator('> button').first();
    await heartCard.click();
    await page.getByRole('button', { name: /Pike Push-ups/i }).click();
    await expect(heartCard).toHaveClass(/ring-2/);
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toBeEnabled();
  });

  test('exercise search can pick a movement outside curated alts', async ({ page }) => {
    await completeWizardToReview(page);
    const heartCard = page.locator('[aria-label="Exercise slots"] > div').first().locator('> button').first();
    await heartCard.click();
    await page.getByRole('button', { name: 'Search all exercises' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('searchbox').fill('bench');
    await page
      .getByRole('button', { name: /Bench Press[\s\S]*×N reps/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(heartCard).toHaveClass(/ring-2/);
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toBeEnabled();
  });

  test('"Reset swaps" clears the override and hides itself', async ({ page }) => {
    await completeWizardToReview(page);
    const heartCard = page.locator('[aria-label="Exercise slots"] > div').first().locator('> button').first();
    await heartCard.click();
    await page.getByRole('button', { name: /Pike Push-ups/i }).click();
    await page.getByRole('button', { name: 'Reset swaps' }).click();
    await expect(page.getByRole('button', { name: 'Reset swaps' })).toHaveCount(0);
    await expect(heartCard).not.toHaveClass(/ring-primary/);
  });

  test('Back from /deck preserves draft and returns to /setup', async ({ page }) => {
    await completeWizardToReview(page);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole('button', { name: 'Review your deck' })).toBeVisible();
  });
});

test.describe('manual mode', () => {
  test.beforeEach(async ({ page }) => {
    await resetDb(page);
  });

  test('Manual "Go!" navigates to /deck with all slots empty', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await page.getByRole('button', { name: 'Manual' }).click();
    await page.getByRole('button', { name: 'Go!' }).click();
    await expect(page).toHaveURL(/\/deck$/);
    const assignBtns = page.getByRole('button', { name: /assign exercise/i });
    await expect(assignBtns).toHaveCount(7);
  });

  test('"Start workout" is disabled until all slots assigned in manual mode', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.getByRole('button', { name: 'Manual' }).click();
    await page.getByRole('button', { name: 'Go!' }).click();
    await expect(page).toHaveURL(/\/deck$/);
    const startBtn = page.getByRole('button', { name: 'Start workout' });
    await expect(startBtn).toBeDisabled();
  });

  test('Back from manual /deck shows setup landing content', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await page.getByRole('button', { name: 'Manual' }).click();
    await page.getByRole('button', { name: 'Go!' }).click();
    await expect(page).toHaveURL(/\/deck$/);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole('heading', { level: 1, name: /build your deck/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go!' })).toBeVisible();
  });
});
