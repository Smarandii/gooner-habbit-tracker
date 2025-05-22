// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8001', // Must match the port used by the webServer
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
    command: 'python server.py',
    url: 'http://localhost:8001', // URL to poll to ensure server is up
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      APP_INTERNAL_PORT: '8001', // Ensure server.py uses this port
      // If your tests need the mock gemini server, configure TEST_GEMINI_API_ENDPOINT here too
      // For basic E2E of index.html, it might not be needed unless index.html itself calls the AI proxy on load
    },
  },
});
