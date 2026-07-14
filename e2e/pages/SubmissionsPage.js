export class SubmissionsPage {
  constructor(page) {
    this.page = page
    this.searchBox = page.locator('input[name="q"]')
  }

  async goto() {
    await this.page.goto('/admin/submissions')
  }

  async search(query) {
    await this.searchBox.fill(query)
    // The search box fires on keyup with a debounce, not a submit button —
    // fill() alone can leave the debounce timer mid-flight; a trailing
    // keypress event nudges it the same way a real keystroke would.
    await this.searchBox.press('End')
  }

  cardByTitle(title) {
    return this.page.locator('#submission-results .project-card', { hasText: title })
  }
}
