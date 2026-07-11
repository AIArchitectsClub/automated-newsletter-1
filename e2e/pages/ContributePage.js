export class ContributePage {
  constructor(page) {
    this.page = page
    this.contributorNameInput = page.locator('input[name="contributor_name"]')
    this.teamInput = page.locator('input[name="team"]')
    this.titleInput = page.locator('input[name="title"]')
    this.bodyTextarea = page.locator('textarea[name="body"]')
    this.filesInput = page.locator('input[name="files"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.successBanner = page.locator('.alert-success')
    this.errorBanner = page.locator('.alert-danger')
  }

  async goto() {
    await this.page.goto('/contribute')
  }

  async submit({ contributorName, team = '', title = '', body, files = [] }) {
    await this.contributorNameInput.fill(contributorName)
    if (team) await this.teamInput.fill(team)
    if (title) await this.titleInput.fill(title)
    await this.bodyTextarea.fill(body)
    if (files.length) await this.filesInput.setInputFiles(files)
    await this.submitButton.click()
  }
}
