const { test, expect } = require('@playwright/test');

test.describe('API Key Modal', () => {
  test('should display and hide the API key modal', async ({ page }) => {
    // Navigate to the root page
    await page.goto('/');

    // Verify that the API key modal is visible
    const apiKeyModal = page.locator('#apiKeyModal');
    await expect(apiKeyModal).toBeVisible();

    // Simulate a click on the save button to close the modal
    const saveApiKeyBtn = page.locator('#saveApiKeyBtn');
    await saveApiKeyBtn.click();

    // Verify that the API key modal is no longer visible
    await expect(apiKeyModal).toBeHidden();
  });
});
