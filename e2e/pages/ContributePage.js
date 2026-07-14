export class ContributePage {
  constructor(page) {
    this.page = page
    this.titleInput = page.locator('input[name="title"]')
    this.bodyTextarea = page.locator('textarea[name="body"]')
    this.filesInput = page.locator('input[name="files"]')
    this.submitButton = page.locator('.contribute-submit-btn')
    this.successBanner = page.locator('.contribute-success')
    this.errorBanner = page.locator('.alert-danger')
    this.identityLine = page.locator('text=Contributing as')
  }

  async goto() {
    await this.page.goto('/contribute')
  }

  async submit({ title = '', body, files = [] }) {
    if (title) await this.titleInput.fill(title)
    await this.bodyTextarea.fill(body)
    if (files.length) await this.filesInput.setInputFiles(files)
    await this.submitButton.click()
  }
}
