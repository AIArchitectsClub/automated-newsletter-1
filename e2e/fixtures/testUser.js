// Generates a unique admin test user and signs up via the API — using
// page.request (not the global `request` fixture) so the session cookie
// lands in the same browser context the test's `page` uses.
export async function createTestAdmin(page, { next } = {}) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const email = `e2e-${unique}@example.com`
  const name = `E2E Test ${unique}`
  const password = 'verify-secret-123'

  // application/x-www-form-urlencoded — this app's sign-up route is a
  // FastAPI Form(...) endpoint, not a JSON API. Use `form`, not `data`.
  await page.request.post('/auth/sign-up', {
    form: { name, email, password, next: next || '/admin/subscribers' },
  })

  return { email, name, password }
}
