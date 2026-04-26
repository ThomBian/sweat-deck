import { test, expect, type Page } from '@playwright/test';

/** Clears Dexie once; do not use addInitScript — it runs on every navigation and wipes mid-test state. */
async function resetSweatDeckDb(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('sweat-deck');
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
        req.onsuccess = () => resolve();
      })
  );
  await page.goto('/');
}

async function completeOnboardingAndSetup(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByRole('button', { name: 'Continue' }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await page.getByRole('button', { name: 'Deal the workout' }).click();
  await expect(page).toHaveURL(/\/play$/, { timeout: 15_000 });
}

test.describe('onboarding and play', () => {
  test.beforeEach(async ({ page }) => {
    await resetSweatDeckDb(page);
  });

  test('first launch: explainer, wizard, shuffle, play', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await completeOnboardingAndSetup(page);
    await expect(page.getByRole('button', { name: /Draw a card from the stack/i })).toBeVisible();
  });

  test('returning user skips explainer', async ({ page }) => {
    await expect(page).toHaveURL(/\/onboarding$|\/$/);
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/setup$/);
  });

  test('draws 5 cards then finishes to summary', async ({ page }) => {
    await completeOnboardingAndSetup(page);

    const drawBtn = page.getByRole('button', { name: /Draw a card from the stack/i });
    for (let i = 0; i < 5; i++) {
      await drawBtn.click();
    }

    await expect(page.getByText('Do this')).toBeVisible();

    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page).toHaveURL(/\/summary$/);
    await expect(page.getByText('Workout complete')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible();
  });
});
