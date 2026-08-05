import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly summaryCards: Locator;
  readonly incomeCard: Locator;
  readonly knownExpensesCard: Locator;
  readonly discretionaryCard: Locator;
  readonly remainingCashCard: Locator;
  readonly carryForwardCard: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Dashboard")');
    this.summaryCards = page.locator(Sel.dashboard.summaryCards);
    this.incomeCard = page.locator(Sel.dashboard.incomeCard);
    this.knownExpensesCard = page.locator(Sel.dashboard.knownExpensesCard);
    this.discretionaryCard = page.locator(Sel.dashboard.discretionaryCard);
    this.remainingCashCard = page.locator(Sel.dashboard.remainingCashCard);
    this.carryForwardCard = page.locator(Sel.dashboard.carryForwardCard);
    this.quickActions = page.locator(Sel.dashboard.quickActions);
  }

  async goto() {
    await this.page.goto('/');
    await this.heading.waitFor({ state: 'visible' });
  }

  async expectSummaryCardsVisible() {
    await expect(this.incomeCard).toBeVisible();
    await expect(this.knownExpensesCard).toBeVisible();
    await expect(this.discretionaryCard).toBeVisible();
    await expect(this.remainingCashCard).toBeVisible();
    await expect(this.carryForwardCard).toBeVisible();
  }

  async expectIncomeCardValue(expected: string) {
    await expect(this.incomeCard).toContainText(expected);
  }

  async expectKnownExpensesCardValue(expected: string) {
    await expect(this.knownExpensesCard).toContainText(expected);
  }

  async expectDiscretionaryCardValue(expected: string) {
    await expect(this.discretionaryCard).toContainText(expected);
  }

  async expectRemainingCashCardValue(expected: string) {
    await expect(this.remainingCashCard).toContainText(expected);
  }

  async expectCarryForwardCardValue(expected: string) {
    await expect(this.carryForwardCard).toContainText(expected);
  }

  async clickAddKnown() {
    await this.page.locator(Sel.dashboard.addKnownBtn).click();
    await this.page.waitForURL('/known');
  }

  async clickAddExpense() {
    await this.page.locator(Sel.dashboard.addExpenseBtn).click();
    await this.page.waitForURL('/expenses');
  }

  async clickAddPerson() {
    await this.page.locator(Sel.dashboard.addPersonBtn).click();
    await this.page.waitForURL('/people');
  }
}