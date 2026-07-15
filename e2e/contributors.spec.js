import { test, expect } from '@playwright/test'
import { EnrollPage, ContributorSignInPage } from './pages/ContributorPages.js'
import { createTestAdmin } from './fixtures/testUser.js'
import { deleteUserByEmail, deleteContributorByEmail, getContributorIdByEmail } from './fixtures/db.js'

test.describe('contributor enrollment lifecycle', () => {
  test('unauthenticated visit to /contribute redirects to contributor sign-in', async ({ page }) => {
    await page.goto('/contribute')
    await expect(page).toHaveURL(/\/contributor\/sign-in\?next=\/contribute/)
  })

  // Enrollment shows a "being reviewed" message for the contributor, but is
  // actually auto-approved in the backend immediately — no admin action
  // required. This intentionally tests that cosmetic-vs-real split.
  test('enroll shows a pending-review message, but the contributor is auto-approved and can sign in right away', async ({ page }) => {
    const unique = Date.now()
    const email = `e2e-enroll-${unique}@example.com`
    const password = 'verify-secret-123'
    const enrollPage = new EnrollPage(page)
    const signInPage = new ContributorSignInPage(page)

    try {
      await enrollPage.goto()
      await enrollPage.enroll('E2E Enroll Test', 'Engineering', email, password)
      await expect(enrollPage.successBanner).toBeVisible()
      await expect(enrollPage.successBanner).toHaveText(/being reviewed/i)

      await signInPage.goto()
      await signInPage.signIn(email, password)
      await expect(page).toHaveURL(/\/contribute$/)
    } finally {
      await deleteContributorByEmail(email)
    }
  })

  test('newly enrolled contributors already show as approved in the admin list, with no action needed', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const contributorContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const contributorPage = await contributorContext.newPage()

    const unique = Date.now()
    const email = `e2e-approve-${unique}@example.com`
    const password = 'verify-secret-123'
    const admin = await createTestAdmin(adminPage)

    try {
      const enrollPage = new EnrollPage(contributorPage)
      await enrollPage.goto()
      await enrollPage.enroll('E2E Approve Test', 'Product', email, password)

      await adminPage.goto('/admin/contributors')
      const row = adminPage.locator('.card', { hasText: email })
      await expect(row).toBeVisible()
      await expect(row.locator('.badge')).toHaveText('approved')
      // Approved rows have no Approve/Deny buttons (see contributor_row.html).
      await expect(row.getByRole('button', { name: 'Approve' })).toHaveCount(0)

      const signInPage = new ContributorSignInPage(contributorPage)
      await signInPage.goto()
      await signInPage.signIn(email, password)
      await expect(contributorPage).toHaveURL(/\/contribute$/)
    } finally {
      await deleteContributorByEmail(email)
      await deleteUserByEmail(admin.email)
      await adminContext.close()
      await contributorContext.close()
    }
  })

  // Enrollment auto-approves, but the deny endpoint doesn't gate on current
  // status — admin can still revoke access via a direct API call even
  // though the UI no longer shows a Deny button for an already-approved row.
  test('admin can deny an auto-approved contributor via the API, whose sign-in then stays blocked', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const contributorContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const contributorPage = await contributorContext.newPage()

    const unique = Date.now()
    const email = `e2e-deny-${unique}@example.com`
    const password = 'verify-secret-123'
    const admin = await createTestAdmin(adminPage)

    try {
      const enrollPage = new EnrollPage(contributorPage)
      await enrollPage.goto()
      await enrollPage.enroll('E2E Deny Test', 'Sales', email, password)

      const contributorId = await getContributorIdByEmail(email)
      await adminPage.request.post(`/admin/contributors/${contributorId}/deny`)

      const signInPage = new ContributorSignInPage(contributorPage)
      await signInPage.goto()
      await signInPage.signIn(email, password)
      await expect(signInPage.errorBanner).toBeVisible()
      await expect(signInPage.errorBanner).toHaveText(/not approved/i)
    } finally {
      await deleteContributorByEmail(email)
      await deleteUserByEmail(admin.email)
      await adminContext.close()
      await contributorContext.close()
    }
  })

  test('admin can access /contribute directly without a contributor account', async ({ page }) => {
    const admin = await createTestAdmin(page)
    try {
      await page.goto('/contribute')
      await expect(page).toHaveURL(/\/contribute$/)
      await expect(page.locator('text=Contributing as')).toContainText(admin.name)
    } finally {
      await deleteUserByEmail(admin.email)
    }
  })
})
