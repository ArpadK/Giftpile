import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // The React app is served by the Vite dev server on :5173, which proxies /api
    // requests to the Spring Boot backend on :8080. baseURL must point at the app
    // (:5173) so bare-path assertions like toHaveURL('/home') resolve correctly.
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Two servers are required: the Spring Boot backend (:8080) and the Vite dev
  // server (:5173) that serves the app and proxies /api to the backend. Playwright
  // waits on the Vite server's URL because that is what the tests navigate to.
  webServer: [
    {
      command: 'cd ../backend && mvn spring-boot:run',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
