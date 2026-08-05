import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class HistoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly monthSelector: Locator;
  readonly summary: Locator;
  readonly income: Locator;
  readonly knownExpenses: Locator;
  readonly discretionary: Locator;
  readonly received: Locator;
  readonly given: Locator;
  readonly remaining: Locator;
  readonly carryForward: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("History")');
    this.monthSelector = page.locator(Sel.history.monthSelector);
    this.summary = page.locator(Sel.history.summary);
    this.income = page.locator(Sel.history.income);
    this.knownExpenses = page.locator(Sel.history.knownExpenses);
    this.discretionary = page.locator(Sel.history.discretionary);
    this.received = page.locator(Sel.history.received);
    this.given = page.locator(Sel.history.given);
    this.remaining = page.locator(Sel.history.remaining);
    this.carryForward = page.locator(Sel.history.carryForward);
  }

  async goto() {
    await this.page.goto('/history');
    await this.heading.waitFor({ state: 'visible' });
  }

  async selectMonth(year: number, month: number) {
    await this.monthSelector.selectOption(Sel.history.monthOption(year, month));
    await this.page.waitForLoadState('networkidle');
  }

  async expectMonth(year: number, month: number) {
    await expect(this.monthSelector).toHaveValue(`${year}-${String(month).padStart(2, '0')}`);
  }

  async expectSummary(expected: {
    income?: string;
    knownExpenses?: string;
    discretionary?: string;
    received?: string;
    given?: string;
    remaining?: string;
    carryForward?: string;
  }) {
    if (expected.income) await expect(this.income).toContainText(expected.income);
    if (expected.knownExpenses) await expect(this.knownExpenses).toContainText(expected.knownExpenses);
    if (expected.discretionary) await expect(this.discretionary).toContainText(expected.discretionary);
    if (expected.received) await expect(this.received).toContainText(expected.received);
    if (expected.given) await expect(this.given).toContainText(expected.given);
    if (expected.remaining) await expect(this.remaining).toContainText(expected.remaining);
    if (expected.carryForward) await expect(this.carryForward).toContainText(expected.carryForward);
  }
}

export class HistoryMonthRow {
  readonly page: Page;
  readonly container: Locator;
  readonly month: Locator;
  readonly income: Locator;
  readonly expenses: Locator;
  readonly balance: Locator;

  constructor(page: Page, monthKey: string) {
    this.page = page;
    this.container = page.locator(`[data-testid="history-month-${monthKey}"]`);
    this.month = this.container.locator('[data-testid="month-label"]');
    this.income = this.container.locator('[data-testid="month-income"]');
    this.expenses = this.container.locator('[data-testid="month-expenses"]');
    this.balance = this.container.locator('[data-testid="month-balance"]');
  }
}

export class HistoryGroupRow {
  readonly page: Page;
  readonly container: Locator;
  readonly groupName: Locator;
  readonly amount: Locator;

  constructor(page: Page, groupKey: string) {
    this.page = page;
    this.container = page.locator(`[data-testid="history-group-${groupKey}"]`);
    this.groupName = this.container.locator('[data-testid="group-name"]');
    this.amount = this.container.locator('[data-testid="group-amount"]');
  }
}