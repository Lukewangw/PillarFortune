import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL points at a running Worker (full stack, as in CI); otherwise the
// static build is served by `vite preview` and the app runs its offline engine.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: external ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: external
    ? undefined
    : { command: "npm run build && npm run preview -- --port 4173 --strictPort", url: "http://127.0.0.1:4173", reuseExistingServer: true, timeout: 120_000 },
});
