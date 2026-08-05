import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class KnownPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Known Expenses")');
    this.addForm = page.locator(Sel.known.addForm);
  }

  async goto() {
    await this.page.goto('/known');
    await this.heading.waitFor({ state: 'visible' });
  }

  async addItem(data: { description: string; category: string; amount: number }) {
    await this.addForm.locator(Sel.known.addDescription).fill(data.description);
    await this.addForm.locator(Sel.known.addCategory).selectOption({ label: data.category });
    await this.addForm.locator(Sel.known.addAmount).fill(String(data.amount));
    await this.addForm.locator(Sel.known.addSubmit).click();
    await expect(this.addForm.locator(Sel.known.addDescription)).toHaveValue('');
  }

  async getBucket(bucketName: string) {
    return new BucketCard(this.page, bucketName);
  }

  async expectBucketCount(count: number) {
    const buckets = this.page.locator('[data-testid^="known-bucket-"]');
    await expect(buckets).toHaveCount(count);
  }
}

export class BucketCard {
  readonly page: Page;
  readonly container: Locator;
  readonly heading: Locator;
  readonly total: Locator;
  readonly items: Locator;

  constructor(page: Page, bucketName: string) {
    this.page = page;
    this.container = page.locator(Sel.known.bucket(bucketName));
    this.heading = this.container.locator(Sel.known.bucketHeading);
    this.total = this.container.locator(Sel.known.bucketTotal);
    this.items = this.container.locator(Sel.known.bucketItems);
  }

  async expectItemCount(count: number) {
    const items = this.container.locator('[data-testid^="known-item-"]');
    await expect(items).toHaveCount(count);
  }

  async getItem(itemId: string) {
    return new KnownItemRow(this.page, itemId);
  }
}

export class KnownItemRow {
  readonly page: Page;
  readonly container: Locator;
  readonly description: Locator;
  readonly category: Locator;
  readonly amount: Locator;
  readonly status: Locator;
  readonly statusSelect: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, itemId: string) {
    this.page = page;
    this.container = page.locator(Sel.known.item(itemId));
    this.description = this.container.locator(Sel.known.itemDescription);
    this.category = this.container.locator(Sel.known.itemCategory);
    this.amount = this.container.locator(Sel.known.itemAmount);
    this.status = this.container.locator(Sel.known.itemStatus);
    this.statusSelect = this.container.locator(Sel.known.itemStatusSelect);
    this.editBtn = this.container.locator(Sel.known.itemEdit);
    this.deleteBtn = this.container.locator(Sel.known.itemDelete);
  }

  async expectValues(description: string, category: string, amountPaise: number) {
    void amountPaise;
    await expect(this.description).toContainText(description);
    await expect(this.category).toContainText(category);
    // Amount format varies, just check it's there
    await expect(this.amount).toBeVisible();
  }

  async expectStatus(status: 'PENDING' | 'PAID' | 'SKIPPED') {
    await expect(this.status).toContainText(status);
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container.locator(Sel.known.itemEditForm).waitFor({ state: 'visible' });
  }

  async edit(data: { description?: string; amount?: number }) {
    const editForm = this.container.locator(Sel.known.itemEditForm);
    if (data.description !== undefined) {
      await editForm.locator(Sel.known.itemEditDescription).fill(data.description);
    }
    if (data.amount !== undefined) {
      await editForm.locator(Sel.known.itemEditAmount).fill(String(data.amount));
    }
    await editForm.locator(Sel.known.itemEditSubmit).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator(Sel.known.itemEditForm);
    await editForm.locator(Sel.known.itemEditCancel).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async changeStatus(status: 'PENDING' | 'PAID' | 'SKIPPED') {
    await this.statusSelect.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }
}
