import { closeDb } from './fixtures/db.js'

// Playwright reuses one worker process across spec files; whichever file's
// afterAll ran first would close a shared pool out from under files that
// haven't run yet. Close it exactly once, here.
export default async function globalTeardown() {
  await closeDb()
}
