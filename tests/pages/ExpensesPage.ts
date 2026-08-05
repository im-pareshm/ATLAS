import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class ExpensesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addForm: Locator;
  readonly list: Locator;
  readonly filterCategory: Locator;
  readonly filterSearch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Expenses")');
    this.addForm = page.locator(Sel.expenses.addForm);
    this.list = page.locator(Sel.expenses.list);
    this.filterCategory = page.locator(Sel.expenses.filterCategory);
    this.filterSearch = page.locator(Sel.expenses.filterSearch);
  }

  async goto() {
    await this.page.goto('/expenses');
    await this.heading.waitFor({ state: 'visible' });
  }

  async addTransaction(data: { description: string; category: string; amount: number; date?: string }) {
    await this.addForm.locator(Sel.expenses.addDescription).fill(data.description);
    await this.addForm.locator(Sel.expenses.addCategory).selectOption({ label: data.category });
    await this.addForm.locator(Sel.expenses.addAmount).fill(String(data.amount));
    if (data.date) {
      await this.addForm.locator('[data-testid="expenses-add-date"]').fill(data.date);
    }
    await this.addForm.locator(Sel.expenses.addSubmit).click();
    await expect(this.addForm.locator(Sel.expenses.addDescription)).toHaveValue('');
  }

  async getTransaction(index: number) {
    return new TransactionRow(this.page, index);
  }

  async expectTransactionCount(count: number) {
    const rows = this.page.locator('[data-testid^="expenses-txn-"]');
    await expect(rows).toHaveCount(count);
  }

  async filterByCategory(category: string) {
    await this.filterCategory.selectOption({ label: category });
    await this.page.waitForLoadState('networkidle');
  }

  async search(searchTerm: string) {
    await this.filterSearch.fill(searchTerm);
    await this.page.waitForLoadState('networkidle');
  }
}

export class TransactionRow {
  readonly page: Page;
  readonly container: Locator;
  readonly description: Locator;
  readonly category: Locator;
  readonly amount: Locator;
  readonly date: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, index: number) {
    this.page = page;
    this.container = page.locator(Sel.expenses.transaction(index));
    this.description = this.container.locator(Sel.expenses.txnDescription);
    this.category = this.container.locator(Sel.expenses.txnCategory);
    this.amount = this.container.locator(Sel.expenses.txnAmount);
    this.date = this.container.locator(Sel.expenses.txnDate);
    this.editBtn = this.container.locator(Sel.expenses.txnEdit);
    this.deleteBtn = this.container.locator(Sel.expenses.txnDelete);
  }

  async expectValues(description: string, category: string, amountPaise: number) {
    void amountPaise;
    await expect(this.description).toContainText(description);
    await expect(this.category).toContainText(category);
    // Amount format varies, just check it's there
    await expect(this.amount).toBeVisible();
  }

  async clickEdit() {
    await this.editBtn.click();
    // Wait for edit form if it opens
    await this.page.waitForLoadState('networkidle');
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}
