export class EnrollPage {
  constructor(page) {
    this.page = page
    this.nameInput = page.locator('input[name="name"]')
    this.teamInput = page.locator('input[name="team"]')
    this.emailInput = page.locator('input[name="email"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.successBanner = page.locator('.contribute-success')
    this.errorBanner = page.locator('.alert-danger')
  }

  async goto() {
    await this.page.goto('/enroll')
  }

  async enroll(name, team, email, password) {
    await this.nameInput.fill(name)
    if (team) await this.teamInput.fill(team)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}

export class ContributorSignInPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorBanner = page.locator('.alert-danger')
  }

  async goto(next) {
    await this.page.goto(next ? `/contributor/sign-in?next=${encodeURIComponent(next)}` : '/contributor/sign-in')
  }

  async signIn(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
