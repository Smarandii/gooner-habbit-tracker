// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // Global timeout for each test in milliseconds
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000', // Must match the port used by the webServer
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:8000', // URL to poll to ensure server is up
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Timeout for web server to start, in milliseconds
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // If your tests need the mock gemini server, configure TEST_GEMINI_API_ENDPOINT here too
      // For basic E2E of index.html, it might not be needed unless index.html itself calls the AI proxy on load
    },
  },
});
