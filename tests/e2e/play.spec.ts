import { test, expect } from '@playwright/test';

test('draws 5 cards then finishes to summary', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/play$/);

  const drawBtn = page.getByRole('button', { name: 'Draw card' });
  for (let i = 0; i < 5; i++) {
    await drawBtn.click();
  }

  await expect(page.getByText('Do this')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByText('Workout complete')).toBeVisible();
  await expect(page.getByText('5')).toBeVisible();
});
