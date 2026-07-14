import { test, expect } from '@playwright/test'
import { createTestAdmin } from './fixtures/testUser.js'
import { deleteUserByEmail, deleteSubscriberByEmail, getSubscriberIdByEmail } from './fixtures/db.js'

// This app has no per-user ownership model (all admins share one
// subscriber/campaign/submission pool) — there's no "user A can't see user
// B's private data" scenario to test. The concurrency-relevant behavior
// here instead is: two admins racing to delete the same shared row.

test.describe('concurrency: two admins racing on the same resource', () => {
  test('deleting the same subscriber from two sessions at once does not error, and it is removed exactly once', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const adminA = await createTestAdmin(pageA)
    const adminB = await createTestAdmin(pageB)
    const email = `e2e-race-${Date.now()}@example.com`

    try {
      await pageA.request.post('/subscribe', { form: { name: 'E2E Race Subscriber', email } })
      const subscriberId = await getSubscriberIdByEmail(email)
      expect(subscriberId).toBeTruthy()

      const [responseA, responseB] = await Promise.all([
        pageA.request.delete(`/admin/subscribers/${subscriberId}`),
        pageB.request.delete(`/admin/subscribers/${subscriberId}`),
      ])

      // Both requests should complete without a server error — a DELETE
      // on an already-gone row is a no-op, not a 500.
      expect(responseA.status()).toBeLessThan(500)
      expect(responseB.status()).toBeLessThan(500)

      await pageA.goto('/admin/subscribers')
      await expect(pageA.locator('.card', { hasText: email })).toHaveCount(0)
    } finally {
      await deleteUserByEmail(adminA.email)
      await deleteUserByEmail(adminB.email)
      await deleteSubscriberByEmail(email)
      await contextA.close()
      await contextB.close()
    }
  })
})
