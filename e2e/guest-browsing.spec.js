import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SubscribePage } from './pages/SubscribePage.js'
import { ContributePage } from './pages/ContributePage.js'
import { createTestAdmin, createApprovedContributor } from './fixtures/testUser.js'
import {
  deleteSubscriberByEmail,
  deleteSubmissionByTitle,
  deleteUserByEmail,
  deleteContributorByEmail,
} from './fixtures/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testImage = path.join(__dirname, 'test-files', 'test-image.png')

test.describe('guest browsing (no auth required)', () => {
  test('subscribe happy path', async ({ page }) => {
    const email = `subscriber-${Date.now()}@example.com`
    const subscribePage = new SubscribePage(page)

    try {
      await subscribePage.goto()
      await subscribePage.subscribe(email)
      await expect(subscribePage.successBanner).toBeVisible()
      await expect(subscribePage.successBanner).toHaveText(/subscribed/i)
    } finally {
      await deleteSubscriberByEmail(email)
    }
  })
})

// /contribute now requires an approved contributor (see contributors.spec.js
// for the enrollment/approval lifecycle itself) — these two need both an
// admin context (to approve) and a contributor context (to submit), so they
// live in their own describe block rather than under "no auth required".
test.describe('contribute (approved contributor required)', () => {
  test('contribute happy path, with an image attachment', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const contributorContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const contributorPage = await contributorContext.newPage()

    const title = `E2E contribution ${Date.now()}`
    const admin = await createTestAdmin(adminPage)
    const contributor = await createApprovedContributor(contributorPage, adminPage)

    try {
      const contributePage = new ContributePage(contributorPage)
      await contributePage.goto()
      await expect(contributePage.identityLine).toContainText(contributor.name)

      await contributePage.submit({
        title,
        body: 'Verifying the contribution pipeline end to end.',
        files: [testImage],
      })
      await expect(contributePage.successBanner).toBeVisible()
      await expect(contributePage.successBanner).toHaveText(/received/i)
    } finally {
      await deleteSubmissionByTitle(title)
      await deleteContributorByEmail(contributor.email)
      await deleteUserByEmail(admin.email)
      await adminContext.close()
      await contributorContext.close()
    }
  })

  test('contribute rejects a file over the size limit', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const contributorContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const contributorPage = await contributorContext.newPage()

    const admin = await createTestAdmin(adminPage)
    const contributor = await createApprovedContributor(contributorPage, adminPage)

    try {
      // 11MB of zero bytes — over the 10MB image/doc cap in submissions.py.
      const oversized = Buffer.alloc(11 * 1024 * 1024)
      const contributePage = new ContributePage(contributorPage)
      await contributePage.goto()
      await contributePage.bodyTextarea.fill('This attachment should be rejected.')
      await contributePage.filesInput.setInputFiles({
        name: 'too-big.bin',
        mimeType: 'application/octet-stream',
        buffer: oversized,
      })
      await contributePage.submitButton.click()
      await expect(contributePage.errorBanner).toBeVisible()
      await expect(contributePage.errorBanner).toHaveText(/too large/i)
      // Confirm nothing was actually inserted despite the oversized attempt.
      await expect(contributePage.successBanner).not.toBeVisible()
    } finally {
      await deleteContributorByEmail(contributor.email)
      await deleteUserByEmail(admin.email)
      await adminContext.close()
      await contributorContext.close()
    }
  })
})
