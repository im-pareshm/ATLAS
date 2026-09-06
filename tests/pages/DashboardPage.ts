import { type Locator, type Page, expect } from "@playwright/test";
import { Sel } from "../helpers/selectors";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly moneyInCard: Locator;
  readonly moneyOutCard: Locator;
  readonly cashPositionCard: Locator;
  readonly safeToSpend: Locator;
  readonly availableCash: Locator;
  readonly attention: Locator;
  readonly addExpense: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Your month, in one view" });
    this.moneyInCard = page.locator(Sel.dashboard.moneyIn);
    this.moneyOutCard = page.locator(Sel.dashboard.moneyOut);
    this.cashPositionCard = page.locator(Sel.dashboard.cashPosition);
    this.safeToSpend = page.locator(Sel.dashboard.safeToSpend);
    this.availableCash = page.locator(Sel.dashboard.availableCash);
    this.attention = page.locator(Sel.dashboard.attention);
    this.addExpense = page.locator(Sel.dashboard.addExpense);
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.heading).toBeVisible();
  }

  async expectSummaryVisible() {
    await expect(this.moneyInCard).toBeVisible();
    await expect(this.moneyOutCard).toBeVisible();
    await expect(this.cashPositionCard).toBeVisible();
    await expect(this.safeToSpend).toBeVisible();
    await expect(this.availableCash).toBeVisible();
  }

  async clickAddExpense() {
    await this.addExpense.click();
    await this.page.waitForURL(/\/expenses\?month=\d{4}-\d{2}/);
  }
}
