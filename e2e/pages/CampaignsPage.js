export class CampaignsPage {
  constructor(page) {
    this.page = page
    this.subjectInput = page.locator('input[name="subject"]')
    this.bodyTextarea = page.locator('textarea[name="body"]')
    this.saveDraftButton = page.getByRole('button', { name: 'Save draft' })
  }

  async goto() {
    await this.page.goto('/admin/campaigns')
  }

  async createDraft(subject, body) {
    await this.subjectInput.fill(subject)
    await this.bodyTextarea.fill(body)
    await this.saveDraftButton.click()
  }

  cardBySubject(subject) {
    return this.page.locator('.card', { hasText: subject })
  }

  async sendBySubject(subject) {
    const card = this.cardBySubject(subject)
    this.page.once('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: 'Send now' }).click()
  }

  async deleteBySubject(subject) {
    const card = this.cardBySubject(subject)
    this.page.once('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: 'Delete' }).click()
  }
}
