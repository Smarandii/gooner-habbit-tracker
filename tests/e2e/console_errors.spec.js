const { test, expect } = require('@playwright/test');

test.describe('Console Errors', () => {
  test('should not have any console errors on page load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the root page
    await page.goto('/');

    // Wait for network to be idle, indicating page has likely finished loading resources
    await page.waitForLoadState('networkidle');

    // Assert that no console errors were detected
    expect(consoleErrors.length, `Console errors found: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
