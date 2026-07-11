import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SubscribePage } from './pages/SubscribePage.js'
import { ContributePage } from './pages/ContributePage.js'
import { deleteSubscriberByEmail, deleteSubmissionByTitle } from './fixtures/db.js'

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

  test('contribute happy path, with an image attachment', async ({ page }) => {
    const title = `E2E contribution ${Date.now()}`
    const contributePage = new ContributePage(page)

    try {
      await contributePage.goto()
      await contributePage.submit({
        contributorName: 'E2E Tester',
        team: 'QA',
        title,
        body: 'Verifying the contribution pipeline end to end.',
        files: [testImage],
      })
      await expect(contributePage.successBanner).toBeVisible()
      await expect(contributePage.successBanner).toHaveText(/received/i)
    } finally {
      await deleteSubmissionByTitle(title)
    }
  })

  test('contribute rejects a file over the size limit', async ({ page }) => {
    // 11MB of zero bytes — over the 10MB image/doc cap in submissions.py.
    const oversized = Buffer.alloc(11 * 1024 * 1024)
    const contributePage = new ContributePage(page)
    await contributePage.goto()
    await contributePage.contributorNameInput.fill('E2E Oversized')
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
  })
})
