import { test, expect } from '@playwright/test'
import { createTestAdmin } from './fixtures/testUser.js'
import { SubmissionsPage } from './pages/SubmissionsPage.js'
import { deleteUserByEmail } from './fixtures/db.js'

// This spec calls the real Hugging Face embedding API (no mock) — kept to
// one search test, deliberately, per the "keep AI-calling tests small and
// deliberate" guidance in e2e-test-suite-python-base. Relies on the 25-item
// diversified seed batch (db/seed_submissions.py) already being present in
// the test database — assert on ranking/structure, not exact generated text.

test.describe('semantic search over submissions (real embeddings)', () => {
  let admin

  test.beforeEach(async ({ page }) => {
    admin = await createTestAdmin(page)
  })

  test.afterEach(async () => {
    await deleteUserByEmail(admin.email)
  })

  test('a topically-specific query ranks the matching seeded submission first', async ({ page }) => {
    const submissionsPage = new SubmissionsPage(page)
    await submissionsPage.goto()

    await submissionsPage.search('cloud infrastructure deployment kubernetes')

    const results = page.locator('#submission-results .project-card-title')
    await expect(results.first()).toHaveText('Migrated core services to Kubernetes', { timeout: 20_000 })
  })

  test('clearing the search box returns to the unfiltered list', async ({ page }) => {
    const submissionsPage = new SubmissionsPage(page)
    await submissionsPage.goto()

    await submissionsPage.search('research paper')
    await expect(page.locator('#submission-results .project-card-title').first()).toBeVisible({ timeout: 20_000 })

    await submissionsPage.search('')
    // Empty query falls back to the plain list query (_LIST_QUERY) — more
    // than the single top match a real search would narrow down to.
    await expect(page.locator('#submission-results .project-card')).not.toHaveCount(1)
  })
})
