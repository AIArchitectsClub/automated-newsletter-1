export class AskPage {
  constructor(page) {
    this.page = page
    this.questionInput = page.locator('input[name="q"]')
    this.submitButton = page.locator('#qa-submit-btn')
    this.typingIndicator = page.locator('#qa-typing')
    this.clearButton = page.getByRole('button', { name: 'Clear conversation' })
    this.conversation = page.locator('#qa-conversation')
  }

  async goto() {
    await this.page.goto('/admin/ask')
  }

  async ask(question) {
    await this.questionInput.fill(question)
    await this.submitButton.click()
  }

  // Newest turn is appended at the bottom (hx-swap="beforeend", chronological
  // order) — see ask.html. This is the opposite of an early version of this
  // page, which inserted at the top; don't assume "first" means "newest".
  lastTurnUserBubble() {
    return this.conversation.locator('.chat-turn').last().locator('.chat-bubble-user')
  }

  lastTurnAnswer() {
    // Direct child combinator: the answer's own <p> is a direct child of
    // .chat-bubble-assistant, but the source citation's meta/snippet
    // paragraphs are also descendants (nested inside its <details>) — a
    // plain descendant selector matches all three.
    return this.conversation.locator('.chat-turn').last().locator('.chat-bubble-assistant > p.mb-0')
  }

  lastTurnSource() {
    return this.conversation.locator('.chat-turn').last().locator('.chat-source')
  }
}
