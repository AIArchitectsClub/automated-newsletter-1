export class SubscribePage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.successBanner = page.locator('.alert-success')
  }

  async goto() {
    await this.page.goto('/subscribe')
  }

  async subscribe(email) {
    await this.emailInput.fill(email)
    await this.submitButton.click()
  }
}
