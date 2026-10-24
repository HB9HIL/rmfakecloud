import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // one worker: uploads of the same user in parallel would race on the sync15 root generation
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    // the e2e service from compose.yaml, started by `make e2e`
    baseURL: process.env.BASE_URL ?? "http://localhost:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      testIgnore: /mobile/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: ".auth/admin.json" },
    },
    {
      // the same app on a phone, below the md breakpoint
      name: "mobile",
      testMatch: /mobile/,
      dependencies: ["setup"],
      use: { ...devices["iPhone X"], browserName: "chromium", storageState: ".auth/admin.json" },
    },
  ],
});
