export class SubscribersPage {
  constructor(page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/admin/subscribers')
  }

  cardByEmail(email) {
    return this.page.locator('.card', { hasText: email })
  }

  async removeByEmail(email) {
    const card = this.cardByEmail(email)
    this.page.once('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: 'Remove' }).click()
  }
}
