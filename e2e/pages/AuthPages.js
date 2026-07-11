export class SignInPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorBanner = page.locator('.alert-danger')
    this.signUpLink = page.locator('a:has-text("Sign up")')
  }

  async goto(next) {
    await this.page.goto(next ? `/auth/sign-in?next=${encodeURIComponent(next)}` : '/auth/sign-in')
  }

  async signIn(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}

export class SignUpPage {
  constructor(page) {
    this.page = page
    this.nameInput = page.locator('input[name="name"]')
    this.emailInput = page.locator('input[name="email"]')
    this.passwordInput = page.locator('input[name="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.errorBanner = page.locator('.alert-danger')
  }

  async goto(next) {
    await this.page.goto(next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : '/auth/sign-up')
  }

  async signUp(name, email, password) {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
