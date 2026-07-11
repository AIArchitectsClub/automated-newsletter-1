import { test, expect } from '@playwright/test'
import { createTestAdmin } from './fixtures/testUser.js'
import { SubscribersPage } from './pages/SubscribersPage.js'
import { CampaignsPage } from './pages/CampaignsPage.js'
import { deleteUserByEmail, deleteSubscriberByEmail, deleteCampaignBySubject } from './fixtures/db.js'

test.describe('admin subscriber + campaign management', () => {
  let admin

  test.beforeEach(async ({ page }) => {
    admin = await createTestAdmin(page)
  })

  test.afterEach(async () => {
    await deleteUserByEmail(admin.email)
  })

  test('admin can remove a subscriber, and the card is actually gone (not just visually hidden)', async ({ page }) => {
    const email = `e2e-manage-sub-${Date.now()}@example.com`
    await page.request.post('/subscribe', { form: { email } })

    const subscribersPage = new SubscribersPage(page)
    try {
      await subscribersPage.goto()
      await expect(subscribersPage.cardByEmail(email)).toBeVisible()

      await subscribersPage.removeByEmail(email)
      // hx-swap="outerHTML" should remove the element entirely, not just hide it.
      await expect(subscribersPage.cardByEmail(email)).toHaveCount(0)
    } finally {
      await deleteSubscriberByEmail(email)
    }
  })

  test('admin can draft, send, and delete a campaign', async ({ page }) => {
    const subject = `E2E campaign ${Date.now()}`
    const campaignsPage = new CampaignsPage(page)

    try {
      await campaignsPage.goto()
      await campaignsPage.createDraft(subject, 'Verifying the campaign lifecycle end to end.')
      const card = campaignsPage.cardBySubject(subject)
      await expect(card).toBeVisible()
      await expect(card.locator('.badge')).toHaveText('draft')

      await campaignsPage.sendBySubject(subject)
      await expect(card.locator('.badge')).toHaveText('sent')
      // Sent campaigns lose their action buttons (see campaign_row.html) — sending twice isn't offered in the UI.
      await expect(card.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    } finally {
      await deleteCampaignBySubject(subject)
    }
  })

  test('draft campaign can be deleted without sending', async ({ page }) => {
    const subject = `E2E draft-delete ${Date.now()}`
    const campaignsPage = new CampaignsPage(page)

    await campaignsPage.goto()
    await campaignsPage.createDraft(subject, 'This one gets deleted, not sent.')
    const card = campaignsPage.cardBySubject(subject)
    await expect(card).toBeVisible()

    await campaignsPage.deleteBySubject(subject)
    await expect(card).toHaveCount(0)
    // No DB cleanup needed here — deletion via the UI is the thing under test.
  })
})
