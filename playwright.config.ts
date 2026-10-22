import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const DATA_DIR = ".data/e2e";

/**
 * End-to-end tests run against a production build with AI turned off (template
 * mode), a fresh embedded database, and E2E_TEST_MODE=1, which adds test-only
 * "answer right / wrong" buttons to problems. Never set E2E_TEST_MODE in production.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node -e "require('fs').rmSync('${DATA_DIR}',{recursive:true,force:true})" && npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { AI_ENABLED: "false", ANTHROPIC_API_KEY: "", DATABASE_URL: "", E2E_TEST_MODE: "1", PGLITE_DIR: DATA_DIR },
  },
});
