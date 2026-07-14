export class SubscribePage {
  constructor(page) {
    this.page = page
    this.nameInput = page.locator('input[name="name"]')
    this.emailInput = page.locator('input[name="email"]')
    this.teamInput = page.locator('input[name="team"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.successBanner = page.locator('.contribute-success')
  }

  async goto() {
    await this.page.goto('/subscribe')
  }

  async subscribe(name, email, team) {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    if (team) await this.teamInput.fill(team)
    await this.submitButton.click()
  }
}
