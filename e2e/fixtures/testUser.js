import { getContributorIdByEmail } from './db.js'

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

// Enrolls a contributor, approves them (needs a *separate* already-signed-in
// admin page/context — approval is inherently an admin action, and one
// browser context only ever holds one session cookie, so the contributor
// and the approving admin can't share a context), then signs the
// contributor in. Returns their credentials for use in the test.
export async function createApprovedContributor(contributorPage, adminPage, { team = 'QA', next } = {}) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const email = `e2e-contributor-${unique}@example.com`
  const name = `E2E Contributor ${unique}`
  const password = 'verify-secret-123'

  await contributorPage.request.post('/enroll', { form: { name, team, email, password } })

  const contributorId = await getContributorIdByEmail(email)
  await adminPage.request.post(`/admin/contributors/${contributorId}/approve`)

  await contributorPage.request.post('/contributor/sign-in', {
    form: { email, password, next: next || '/contribute' },
  })

  return { id: contributorId, email, name, team, password }
}
