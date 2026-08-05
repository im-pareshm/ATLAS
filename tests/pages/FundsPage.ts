import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class FundsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addForm: Locator;
  readonly fundsList: Locator;
  readonly total: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Funds")');
    this.addForm = page.locator(Sel.funds.addForm);
    this.fundsList = page.locator('[data-testid^="fund-"]');
    this.total = page.locator(Sel.funds.total);
  }

  async goto() {
    await this.page.goto('/funds');
    await this.heading.waitFor({ state: 'visible' });
  }

  async addFund(data: { name: string; balance: number }) {
    await this.addForm.locator(Sel.funds.addName).fill(data.name);
    await this.addForm.locator(Sel.funds.addBalance).fill(String(data.balance));
    await this.addForm.locator(Sel.funds.addSubmit).click();
    await expect(this.addForm.locator(Sel.funds.addName)).toHaveValue('');
  }

  async getFund(fundId: string) {
    return new FundRow(this.page, fundId);
  }

  async expectFundCount(count: number) {
    const funds = this.page.locator('[data-testid^="fund-"]');
    await expect(funds).toHaveCount(count);
  }

  async expectTotal(expected: string) {
    await expect(this.total).toContainText(expected);
  }
}

export class FundRow {
  readonly page: Page;
  readonly container: Locator;
  readonly name: Locator;
  readonly balance: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, fundId: string) {
    this.page = page;
    this.container = page.locator(Sel.funds.fund(fundId));
    this.name = this.container.locator(Sel.funds.fundName);
    this.balance = this.container.locator(Sel.funds.fundBalance);
    this.editBtn = this.container.locator(Sel.funds.fundEdit);
    this.deleteBtn = this.container.locator(Sel.funds.fundDelete);
  }

  async expectValues(name: string, balance: string) {
    await expect(this.name).toContainText(name);
    await expect(this.balance).toContainText(balance);
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container.locator(Sel.funds.fundEditForm).waitFor({ state: 'visible' });
  }

  async edit(data: { name?: string; balance?: number }) {
    const editForm = this.container.locator(Sel.funds.fundEditForm);
    if (data.name !== undefined) {
      await editForm.locator(Sel.funds.fundEditName).fill(data.name);
    }
    if (data.balance !== undefined) {
      await editForm.locator(Sel.funds.fundEditBalance).fill(String(data.balance));
    }
    await editForm.locator(Sel.funds.fundEditSubmit).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator(Sel.funds.fundEditForm);
    await editForm.locator(Sel.funds.fundEditCancel).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}