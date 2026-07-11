import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load the isolated test database + secrets — never point this at the
// real .env (that's the production database real subscribers/submissions
// live in).
dotenv.config({ path: '.env.test' })

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.js',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Specs share one mutable Postgres database with real rows (subscribers,
  // campaigns, submissions) — correctness over speed until the suite is
  // large enough for this to actually matter.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: !!process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // No build step — this is the entire "build" for a Python base app.
    command: 'python -m uvicorn app.main:app --host 0.0.0.0 --port 8000',
    url: 'http://localhost:8000/subscribe',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
      EMAIL_API_KEY: process.env.EMAIL_API_KEY,
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
      EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
      LLM_MODEL: process.env.LLM_MODEL,
      PORT: '8000',
    },
  },
})
