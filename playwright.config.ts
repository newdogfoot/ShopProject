import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const FAKE_AI_PORT = PORT + 1;

const clean = (dir: string) => `node -e "require('fs').rmSync('${dir}',{recursive:true,force:true})"`;

/**
 * End-to-end tests run against a production build (`npm run test:e2e` builds first)
 * with a fresh embedded database and E2E_TEST_MODE=1, which adds test-only
 * "answer right / wrong" buttons to problems. Two servers:
 * - AI off (template mode) for most scenarios;
 * - AI_FAKE=1, a deterministic stand-in for Claude, for written explanations,
 *   "why?" and other AI screens (`*.fake-ai.spec.ts`).
 * Never set E2E_TEST_MODE or AI_FAKE in production.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", testIgnore: /\.fake-ai\.spec\.ts$/, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${PORT}` } },
    { name: "fake-ai", testMatch: /\.fake-ai\.spec\.ts$/, use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${FAKE_AI_PORT}` } },
  ],
  webServer: [
    {
      command: `${clean(".data/e2e")} && npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { AI_ENABLED: "false", ANTHROPIC_API_KEY: "", DATABASE_URL: "", E2E_TEST_MODE: "1", PGLITE_DIR: ".data/e2e" },
    },
    {
      command: `${clean(".data/e2e-fake-ai")} && npx next start -p ${FAKE_AI_PORT}`,
      url: `http://127.0.0.1:${FAKE_AI_PORT}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { AI_FAKE: "1", ANTHROPIC_API_KEY: "", DATABASE_URL: "", E2E_TEST_MODE: "1", PGLITE_DIR: ".data/e2e-fake-ai" },
    },
  ],
});
