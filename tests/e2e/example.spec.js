// tests/e2e/example.spec.js
import { test, expect } from '@playwright/test';

test('homepage has correct title and header', async ({ page }) => {
  // The baseURL is configured in playwright.config.js, so this goes to http://localhost:8001/
  await page.goto('/'); 

  // 1. Check the page title
  await expect(page).toHaveTitle(/Atomic Habit Hero - AI Edition/);

  // 2. Check for the <h1> element
  const header = page.locator('h1');
  await expect(header).toBeVisible();
  await expect(header).toHaveText(/Atomic Habit Hero/);
});
