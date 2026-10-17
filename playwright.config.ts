import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3001",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command:
      "NEXT_PUBLIC_API_URL=http://localhost:3200 ./node_modules/.bin/next dev --port 3001",
    url: "http://localhost:3001/forgot-password",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
