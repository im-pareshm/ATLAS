import { type Locator, type Page, expect } from '@playwright/test';
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

  async createTemplate(data: {
    description: string;
    category: string;
    amount: number;
    intervalMonths?: number;
    startAt?: string;
  }) {
    await this.createForm.locator(Sel.recurring.createDescription).fill(data.description);
    await this.selectCategoryByText(
      this.createForm.locator(Sel.recurring.createCategory),
      data.category,
    );
    await this.createForm.locator(Sel.recurring.createAmount).fill(String(data.amount));
    if (data.intervalMonths !== undefined) {
      await this.createForm
        .locator(Sel.recurring.createInterval)
        .selectOption(String(data.intervalMonths));
    }
    if (data.startAt !== undefined) {
      await this.createForm.locator(Sel.recurring.createStart).fill(data.startAt);
    }
    await this.createForm.locator(Sel.recurring.createSubmit).click();
    await expect(this.createForm.locator(Sel.recurring.createDescription)).toHaveValue('');
  }

  async getTemplate(templateSlug: string) {
    const descriptionPattern = this.slugToText(templateSlug);
    const row = this.page
      .locator('[data-testid^="recurring-template-"]')
      .filter({
        has: this.page.locator(Sel.recurring.templateDescription, {
          hasText: descriptionPattern,
        }),
      })
      .first();

    const testId = await row.getAttribute('data-testid');
    if (!testId) {
      throw new Error(`Could not find recurring template matching "${templateSlug}"`);
    }

    return new RecurringTemplateRow(
      this.page,
      testId.replace('recurring-template-', ''),
    );
  }

  async expectTemplateCount(count: number) {
    const rows = this.page.locator('[data-testid^="recurring-template-"]');
    await expect(rows).toHaveCount(count);
  }

  private async selectCategoryByText(select: Locator, text: string) {
    const option = select.locator('option').filter({ hasText: text }).first();
    const value = await option.getAttribute('value');
    if (!value) throw new Error(`Could not find category option matching "${text}"`);
    await select.selectOption(value);
  }

  private slugToText(slug: string): RegExp {
    const words = slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(words.join('.*'), 'i');
  }
}

export class RecurringTemplateRow {
  readonly page: Page;
  readonly templateId: string;
  readonly container: Locator;
  readonly description: Locator;
  readonly category: Locator;
  readonly amount: Locator;
  readonly statusBtn: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, templateId: string) {
    this.page = page;
    this.templateId = templateId;
    this.container = page.locator(Sel.recurring.template(templateId));
    this.description = this.container.locator(Sel.recurring.templateDescription);
    this.category = this.container.locator(Sel.recurring.templateCategory);
    this.amount = this.container.locator(Sel.recurring.templateAmount);
    this.statusBtn = this.container.locator(Sel.recurring.templateStatusBtn);
    this.editBtn = this.container.locator(Sel.recurring.templateEdit);
    this.deleteBtn = this.container.locator(Sel.recurring.templateDelete);
  }

  async expectValues(
    description: string,
    category: string,
    amountPaise: number,
    isActive: boolean,
  ) {
    await expect(this.description).toContainText(description);
    await expect(this.category).toContainText(category);
    await expect(this.amount).toContainText(formatINR(amountPaise));
    await expect(this.container.locator(Sel.recurring.templateStatus)).toContainText(
      isActive ? 'Active' : 'Paused',
    );
  }

  async toggleStatus() {
    await this.statusBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container
      .locator(Sel.recurring.editForm(this.templateId))
      .waitFor({ state: 'visible' });
  }

  async edit(data: {
    description?: string;
    category?: string;
    amount?: number;
    intervalMonths?: number;
    startAt?: string;
  }) {
    const editForm = this.container.locator(Sel.recurring.editForm(this.templateId));
    if (data.description !== undefined) {
      await editForm
        .locator(Sel.recurring.editDescription(this.templateId))
        .fill(data.description);
    }
    if (data.category !== undefined) {
      const select = editForm.locator(Sel.recurring.editCategory(this.templateId));
      const option = select.locator('option').filter({ hasText: data.category }).first();
      const value = await option.getAttribute('value');
      if (!value) throw new Error(`Could not find category option matching "${data.category}"`);
      await select.selectOption(value);
    }
    if (data.amount !== undefined) {
      await editForm
        .locator(Sel.recurring.editAmount(this.templateId))
        .fill(String(data.amount));
    }
    if (data.intervalMonths !== undefined) {
      await editForm
        .locator(Sel.recurring.editInterval(this.templateId))
        .selectOption(String(data.intervalMonths));
    }
    if (data.startAt !== undefined) {
      await editForm.locator(Sel.recurring.editStart(this.templateId)).fill(data.startAt);
    }
    await editForm.locator(Sel.recurring.editSaveBtn).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator(Sel.recurring.editForm(this.templateId));
    await editForm.locator(Sel.recurring.editCancelBtn).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.container.locator(Sel.recurring.deleteConfirm).click();
    await this.page.waitForLoadState('networkidle');
  }
}
