import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E 以 production build 執行（next build + next start），
 * 與開發中的 dev server（3000）分開，避免互相干擾，也更貼近實際部署行為。
 * 每個 test 都有獨立的 browser context → localStorage / BroadcastChannel 互不汙染。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // 多數測試會在同一個 context 開 2 個分頁（每個都跑 Next + Web Component），
  // worker 太多會讓 CPU 飽和、同步斷言逾時；固定 2 個在本機與 CI 都穩定。
  workers: 2,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npm --prefix ../.. run build:card && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
