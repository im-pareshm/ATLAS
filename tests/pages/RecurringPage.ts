import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';
import { formatINR } from '../helpers/test-data';

export class RecurringPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Recurring")');
    this.createForm = page.locator(Sel.recurring.createForm);
  }

  async goto() {
    await this.page.goto('/recurring');
    await this.heading.waitFor({ state: 'visible' });
  }

  async createTemplate(data: { description: string; category: string; amount: number }) {
    await this.createForm.locator(Sel.recurring.createDescription).fill(data.description);
    await this.createForm.locator(Sel.recurring.createCategory).selectOption({ label: data.category });
    await this.createForm.locator(Sel.recurring.createAmount).fill(String(data.amount));
    await this.createForm.locator(Sel.recurring.createSubmit).click();
    await expect(this.createForm.locator(Sel.recurring.createDescription)).toHaveValue('');
  }

  async getTemplate(templateId: string) {
    return new RecurringTemplateRow(this.page, templateId);
  }

  async expectTemplateCount(count: number) {
    const rows = this.page.locator('[data-testid^="recurring-template-"]');
    await expect(rows).toHaveCount(count);
  }
}

export class RecurringTemplateRow {
  readonly page: Page;
  readonly container: Locator;
  readonly description: Locator;
  readonly category: Locator;
  readonly amount: Locator;
  readonly statusBtn: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, templateId: string) {
    this.page = page;
    this.container = page.locator(Sel.recurring.templateRow(templateId));
    this.description = this.container.locator(Sel.recurring.templateDescription(templateId));
    this.category = this.container.locator(Sel.recurring.templateCategory(templateId));
    this.amount = this.container.locator(Sel.recurring.templateAmount(templateId));
    this.statusBtn = this.container.locator(Sel.recurring.templateStatus(templateId));
    this.editBtn = this.container.locator(Sel.recurring.templateEditBtn(templateId));
    this.deleteBtn = this.container.locator(Sel.recurring.templateDeleteBtn(templateId));
  }

  async expectValues(description: string, category: string, amountPaise: number, isActive: boolean) {
    await expect(this.description).toContainText(description);
    await expect(this.category).toContainText(category);
    await expect(this.amount).toContainText(formatINR(amountPaise));
    await expect(this.statusBtn).toContainText(isActive ? 'Active' : 'Paused');
  }

  async toggleStatus() {
    await this.statusBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container.locator(Sel.recurring.editForm(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).waitFor({ state: 'visible' });
  }

  async edit(data: { description?: string; category?: string; amount?: number }) {
    const editForm = this.container.locator('[data-testid^="recurring-edit-form-"]');
    if (data.description !== undefined) {
      await editForm.locator(Sel.recurring.editDescription(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).fill(data.description);
    }
    if (data.category !== undefined) {
      await editForm.locator(Sel.recurring.editCategory(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).selectOption({ label: data.category });
    }
    if (data.amount !== undefined) {
      await editForm.locator(Sel.recurring.editAmount(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).fill(String(data.amount));
    }
    await editForm.locator(Sel.recurring.editSaveBtn(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator('[data-testid^="recurring-edit-form-"]');
    await editForm.locator(Sel.recurring.editCancelBtn(this.container.getAttribute('data-testid')?.replace('recurring-template-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}