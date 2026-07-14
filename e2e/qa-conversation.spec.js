import { test, expect } from '@playwright/test'
import { createTestAdmin } from './fixtures/testUser.js'
import { AskPage } from './pages/AskPage.js'
import { deleteUserByEmail } from './fixtures/db.js'

// Calls the real Hugging Face chat-completions API — one core test covering
// ask -> typing indicator -> answer -> follow-up (conversation memory) ->
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

  test('ask, see typing indicator + disabled button, get an answer with a source, follow up, reload, clear', async ({ page }) => {
    const askPage = new AskPage(page)
    await askPage.goto()

    await askPage.questionInput.fill('what has the sales team accomplished recently')
    await askPage.submitButton.click()

    // The real HF call takes real seconds — this window is reliably
    // observable, unlike testing against a near-instant local call. The
    // typing indicator toggles via a real display:none/flex class switch
    // (not opacity), so plain visibility assertions work directly here.
    await expect(askPage.submitButton).toBeDisabled()
    await expect(askPage.typingIndicator).toBeVisible()

    await expect(askPage.lastTurnAnswer()).toBeVisible({ timeout: 35_000 })
    await expect(askPage.submitButton).toBeEnabled()
    await expect(askPage.typingIndicator).not.toBeVisible()

    const firstAnswerText = await askPage.lastTurnAnswer().textContent()
    expect(firstAnswerText.trim().length).toBeGreaterThan(0)

    // The source citation is a single collapsed <details> chip, not a card.
    await expect(askPage.lastTurnSource()).toHaveCount(1)

    // Follow-up: conversation memory should make this read as a continuation.
    await askPage.ask('what about marketing')
    await expect(askPage.lastTurnAnswer()).toBeVisible({ timeout: 35_000 })
    // Newest turn is appended at the bottom — the follow-up question bubble
    // should now be the last one on the page.
    await expect(askPage.lastTurnUserBubble()).toHaveText(/marketing/i)

    // Persistence: conversation history survives a hard reload (session cookie).
    await page.reload()
    await expect(page.locator('.chat-turn')).toHaveCount(2)
    await expect(askPage.lastTurnUserBubble()).toHaveText(/marketing/i)

    // Clear resets to the empty state.
    await askPage.clearButton.click()
    await expect(page.locator('.chat-turn')).toHaveCount(0)
    await expect(page.getByText('Ask a question to get started')).toBeVisible()
  })
})
