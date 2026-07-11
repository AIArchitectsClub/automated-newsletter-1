import { test, expect } from '@playwright/test'
import { createTestAdmin } from './fixtures/testUser.js'
import { AskPage } from './pages/AskPage.js'
import { deleteUserByEmail } from './fixtures/db.js'

// Calls the real Hugging Face chat-completions API — one core test covering
// ask -> progress indicator -> answer -> follow-up (conversation memory) ->
// reload persistence -> clear, rather than one test per behavior, to keep
// live-API calls few. Assert on structure/behavior, not exact answer text.

test.describe('Q&A conversation (real LLM)', () => {
  let admin

  test.beforeEach(async ({ page }) => {
    admin = await createTestAdmin(page)
  })

  test.afterEach(async () => {
    await deleteUserByEmail(admin.email)
  })

  test('ask, see progress + disabled button, get an answer with one source, follow up, reload, clear', async ({ page }) => {
    const askPage = new AskPage(page)
    await askPage.goto()

    await askPage.questionInput.fill('what has the sales team accomplished recently')
    await askPage.submitButton.click()

    // The real HF call takes real seconds — this window is reliably
    // observable, unlike testing against a near-instant local call.
    await expect(askPage.submitButton).toBeDisabled()
    // htmx's indicator mechanism is opacity-based (see style.css), not
    // display/visibility — toBeVisible()/toBeHidden() check layout
    // presence and would never see this as "hidden", so assert the actual
    // CSS property instead.
    await expect(askPage.progressBar).toHaveCSS('opacity', '1')

    await expect(askPage.firstTurnAnswer()).toBeVisible({ timeout: 35_000 })
    await expect(askPage.submitButton).toBeEnabled()
    await expect(askPage.progressBar).toHaveCSS('opacity', '0')

    const firstAnswerText = await askPage.firstTurnAnswer().textContent()
    expect(firstAnswerText.trim().length).toBeGreaterThan(0)

    // Exactly one source card under the answer, not a stack of matches.
    await expect(askPage.firstTurnSourceCards()).toHaveCount(1)

    // Follow-up: conversation memory should make this read as a continuation.
    await askPage.ask('what about marketing')
    await expect(askPage.firstTurnAnswer()).toBeVisible({ timeout: 35_000 })
    // Newest turn inserted at the top (afterbegin) — the follow-up question
    // bubble should now be the first one on the page.
    await expect(askPage.firstTurnBubble()).toHaveText(/marketing/i)

    // Persistence: conversation history survives a hard reload (session cookie).
    await page.reload()
    await expect(page.locator('.qa-turn')).toHaveCount(2)
    await expect(askPage.firstTurnBubble()).toHaveText(/marketing/i)

    // Clear resets to the empty state.
    await askPage.clearButton.click()
    await expect(page.locator('.qa-turn')).toHaveCount(0)
    await expect(page.getByText('Ask a question to get started')).toBeVisible()
  })
})
