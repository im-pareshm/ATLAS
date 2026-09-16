import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.emailInput = page.locator(Sel.login.email);
    this.passwordInput = page.locator(Sel.login.password);
    this.submitBtn = page.locator(Sel.login.submit);
    this.error = page.locator(Sel.login.error);
  }

  async goto() {
    await this.page.goto('/login');
    await this.heading.waitFor({ state: 'visible' });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitBtn).toBeVisible();
  }

  /** Submits the form. Does not wait for navigation — a failed login stays on /login. */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  /** True when the browser's own validation (e.g. `required`) is blocking submission. */
  async isBlockedByBrowserValidation() {
    return this.emailInput.evaluate((el) => !(el as HTMLInputElement).checkValidity());
  }

  async expectError(message: string) {
    await expect(this.error).toContainText(message);
  }
}