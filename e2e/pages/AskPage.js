export class AskPage {
  constructor(page) {
    this.page = page
    this.questionInput = page.locator('input[name="q"]')
    this.submitButton = page.locator('#qa-submit-btn')
    this.progressBar = page.locator('#qa-progress')
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

  // The newest turn is inserted at the top (afterbegin) — see ask.html.
  firstTurnBubble() {
    return this.conversation.locator('.qa-turn').first().locator('.bg-primary.qa-bubble')
  }

  firstTurnAnswer() {
    // .qa-bubble specifically distinguishes the answer card from a nested
    // source submission card (also a .card, but without this class) —
    // see qa_turn.html.
    return this.conversation.locator('.qa-turn').first().locator('.card.qa-bubble .card-body p')
  }

  firstTurnSourceCards() {
    return this.conversation.locator('.qa-turn').first().locator('.card:not(.qa-bubble)')
  }
}
