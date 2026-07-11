import { test, expect } from '@playwright/test'
import { SignInPage, SignUpPage } from './pages/AuthPages.js'
import { deleteUserByEmail } from './fixtures/db.js'

test.describe('authentication', () => {
  test('sign up, sign out, sign back in', async ({ page }) => {
    const unique = Date.now()
    const email = `e2e-auth-${unique}@example.com`
    const password = 'verify-secret-123'
    const signUpPage = new SignUpPage(page)
    const signInPage = new SignInPage(page)

    try {
      await signUpPage.goto()
      await signUpPage.signUp('E2E Auth Test', email, password)
      await expect(page).toHaveURL(/\/admin\/subscribers/)

      await page.getByRole('button', { name: /Sign out/ }).click()
      await expect(page).toHaveURL(/\/subscribe/)

      await signInPage.goto()
      await signInPage.signIn(email, password)
      await expect(page).toHaveURL(/\/admin\/subscribers/)
    } finally {
      await deleteUserByEmail(email)
    }
  })

  test('wrong password is rejected with an error, not a silent failure', async ({ page }) => {
    const unique = Date.now()
    const email = `e2e-auth-wrong-${unique}@example.com`
    const signUpPage = new SignUpPage(page)
    const signInPage = new SignInPage(page)

    try {
      await signUpPage.goto()
      await signUpPage.signUp('E2E Wrong Password', email, 'correct-password-123')
      await page.getByRole('button', { name: /Sign out/ }).click()

      await signInPage.goto()
      await signInPage.signIn(email, 'totally-wrong-password')
      await expect(signInPage.errorBanner).toBeVisible()
      await expect(page).not.toHaveURL(/\/admin\/subscribers/)
    } finally {
      await deleteUserByEmail(email)
    }
  })

  test.describe('auth gating', () => {
    for (const protectedPath of ['/admin/subscribers', '/admin/campaigns', '/admin/submissions', '/admin/ask']) {
      test(`unauthenticated visit to ${protectedPath} redirects to sign-in`, async ({ page }) => {
        await page.goto(protectedPath)
        await expect(page).toHaveURL(new RegExp(`/auth/sign-in\\?next=${protectedPath.replace(/\//g, '\\/')}`))
      })
    }

    test('after signing in, lands back on the originally-requested page, not a fixed default', async ({ page }) => {
      const unique = Date.now()
      const email = `e2e-redirect-${unique}@example.com`
      const password = 'verify-secret-123'
      const signInPage = new SignInPage(page)

      try {
        // Sign up once via a plain page request (no need to exercise the UI for setup).
        await page.request.post('/auth/sign-up', { form: { name: 'Redirect Test', email, password, next: '/admin/subscribers' } })
        await page.request.post('/auth/sign-out')

        // Visit a protected page while logged out — should bounce to sign-in with ?next=.
        await page.goto('/admin/ask')
        await expect(page).toHaveURL(/\/auth\/sign-in\?next=\/admin\/ask/)

        await signInPage.signIn(email, password)
        await expect(page).toHaveURL(/\/admin\/ask$/)
      } finally {
        await deleteUserByEmail(email)
      }
    })

    test('an attacker-supplied next= pointing off-site is not followed after login', async ({ page }) => {
      const unique = Date.now()
      const email = `e2e-openredirect-${unique}@example.com`
      const password = 'verify-secret-123'

      try {
        await page.request.post('/auth/sign-up', { form: { name: 'Open Redirect Test', email, password, next: '/admin/subscribers' } })
        await page.request.post('/auth/sign-out')

        await page.goto('/auth/sign-in?next=https://evil.example')
        const signInPage = new SignInPage(page)
        await signInPage.signIn(email, password)
        // Must land somewhere in our own app, never on the injected host.
        await expect(page).toHaveURL(/^http:\/\/localhost:8000\//)
        await expect(page).not.toHaveURL(/evil\.example/)
      } finally {
        await deleteUserByEmail(email)
      }
    })
  })
})
