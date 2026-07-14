import { test, expect } from '@playwright/test'
import { EnrollPage, ContributorSignInPage } from './pages/ContributorPages.js'
import { createTestAdmin } from './fixtures/testUser.js'
import { deleteUserByEmail, deleteContributorByEmail, getContributorIdByEmail } from './fixtures/db.js'

test.describe('contributor enrollment lifecycle', () => {
  test('unauthenticated visit to /contribute redirects to contributor sign-in', async ({ page }) => {
    await page.goto('/contribute')
    await expect(page).toHaveURL(/\/contributor\/sign-in\?next=\/contribute/)
  })

  test('enroll shows a pending-review message, and signing in before approval is blocked', async ({ page }) => {
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
      await expect(signInPage.errorBanner).toBeVisible()
      await expect(signInPage.errorBanner).toHaveText(/still under review/i)
      await expect(page).not.toHaveURL(/\/contribute$/)
    } finally {
      await deleteContributorByEmail(email)
    }
  })

  test('admin approves a pending contributor, who can then sign in and reach /contribute', async ({ browser }) => {
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
      await expect(row.locator('.badge')).toHaveText('pending')

      await row.getByRole('button', { name: 'Approve' }).click()
      await expect(row.locator('.badge')).toHaveText('approved')
      // Approved rows lose their action buttons (see contributor_row.html).
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

  test('admin denies a pending contributor, whose sign-in stays blocked with a clear message', async ({ browser }) => {
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
