const { defineConfig } = require("cypress");

module.exports = defineConfig({
  // retry flaky specs in `cypress run`, fail fast in `cypress open`
  retries: {
    runMode: 3,
    openMode: 0,
  },
  defaultCommandTimeout: 8000,
  // the bundled macOS trash is x86_64 only, `make e2e` cleans up instead
  trashAssetsBeforeRuns: false,
  e2e: {
    // the e2e service from compose.yaml, started by `make e2e`
    baseUrl: "http://localhost:3002",
    video: false,
  },
});
