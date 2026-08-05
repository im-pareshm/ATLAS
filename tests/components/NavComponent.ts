import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class NavComponent {
  readonly page: Page;
  readonly dashboard: Locator;
  readonly known: Locator;
  readonly expenses: Locator;
  readonly people: Locator;
  readonly funds: Locator;
  readonly history: Locator;
  readonly recurring: Locator;
  readonly categories: Locator;
  readonly signOut: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboard = page.locator(Sel.nav.dashboard);
    this.known = page.locator(Sel.nav.known);
    this.expenses = page.locator(Sel.nav.expenses);
    this.people = page.locator(Sel.nav.people);
    this.funds = page.locator(Sel.nav.funds);
    this.history = page.locator(Sel.nav.history);
    this.recurring = page.locator(Sel.nav.recurring);
    this.categories = page.locator(Sel.nav.categories);
    this.signOut = page.locator(Sel.nav.logout);
    this.themeToggle = page.locator(Sel.nav.themeToggle);
  }

  async clickDashboard() {
    await this.dashboard.click();
    await this.page.waitForURL('/');
  }

  async clickKnown() {
    await this.known.click();
    await this.page.waitForURL('/known');
  }

  async clickExpenses() {
    await this.expenses.click();
    await this.page.waitForURL('/expenses');
  }

  async clickPeople() {
    await this.people.click();
    await this.page.waitForURL('/people');
  }

  async clickFunds() {
    await this.funds.click();
    await this.page.waitForURL('/funds');
  }

  async clickHistory() {
    await this.history.click();
    await this.page.waitForURL('/history');
  }

  async clickRecurring() {
    await this.recurring.click();
    await this.page.waitForURL('/recurring');
  }

  async clickCategories() {
    await this.categories.click();
    await this.page.waitForURL('/categories');
  }

  async clickSignOut() {
    await this.signOut.click();
    await this.page.waitForURL('/login');
  }

  async clickThemeToggle() {
    await this.themeToggle.click();
  }

  async expectActive(link: 'dashboard' | 'known' | 'expenses' | 'people' | 'funds' | 'history' | 'recurring' | 'categories') {
    const locator = this[link];
    await expect(locator).toHaveClass(/bg-mint-tint text-teal/);
  }

  async expectAllVisible() {
    await expect(this.dashboard).toBeVisible();
    await expect(this.known).toBeVisible();
    await expect(this.expenses).toBeVisible();
    await expect(this.people).toBeVisible();
    await expect(this.funds).toBeVisible();
    await expect(this.history).toBeVisible();
    await expect(this.recurring).toBeVisible();
    await expect(this.categories).toBeVisible();
    await expect(this.signOut).toBeVisible();
    await expect(this.themeToggle).toBeVisible();
  }
}
