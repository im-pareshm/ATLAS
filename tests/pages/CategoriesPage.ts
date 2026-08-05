import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class CategoriesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addGroupForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Categories")');
    this.addGroupForm = page.locator(Sel.categories.addGroupForm);
  }

  async goto() {
    await this.page.goto('/categories');
    await this.heading.waitFor({ state: 'visible' });
  }

  async addGroup(name: string, kind: 'INCOME' | 'KNOWN_EXPENSE' | 'SAVINGS' | 'DISCRETIONARY') {
    await this.addGroupForm.locator(Sel.categories.addGroupName).fill(name);
    await this.addGroupForm.locator(Sel.categories.addGroupKind).selectOption(kind);
    await this.addGroupForm.locator(Sel.categories.addGroupSubmit).click();
    await expect(this.addGroupForm.locator(Sel.categories.addGroupName)).toHaveValue('');
  }

  async getGroup(groupId: string) {
    return new CategoryGroupCard(this.page, groupId);
  }

  async expectGroupCount(count: number) {
    const cards = this.page.locator('[data-testid^="category-group-"]');
    await expect(cards).toHaveCount(count);
  }
}

export class CategoryGroupCard {
  readonly page: Page;
  readonly container: Locator;
  readonly name: Locator;
  readonly kindBadge: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;
  readonly moveUpBtn: Locator;
  readonly moveDownBtn: Locator;

  constructor(page: Page, groupId: string) {
    this.page = page;
    this.container = page.locator(Sel.categories.groupCard(groupId));
    this.name = this.container.locator(Sel.categories.groupName(groupId));
    this.kindBadge = this.container.locator(Sel.categories.groupKindBadge(groupId));
    this.editBtn = this.container.locator(Sel.categories.groupEditBtn(groupId));
    this.deleteBtn = this.container.locator(Sel.categories.groupDeleteBtn(groupId));
    this.moveUpBtn = this.container.locator(Sel.categories.groupMoveUp(groupId));
    this.moveDownBtn = this.container.locator(Sel.categories.groupMoveDown(groupId));
  }

  async expectValues(name: string, kind: string) {
    await expect(this.name).toContainText(name);
    await expect(this.kindBadge).toContainText(kind);
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container.locator(Sel.categories.groupEditForm(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).waitFor({ state: 'visible' });
  }

  async edit(name: string, kind: 'INCOME' | 'KNOWN_EXPENSE' | 'SAVINGS' | 'DISCRETIONARY') {
    const editForm = this.container.locator('[data-testid^="category-group-edit-"]');
    await editForm.locator(Sel.categories.groupEditName(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).fill(name);
    await editForm.locator(Sel.categories.groupEditKind(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).selectOption(kind);
    await editForm.locator(Sel.categories.groupEditSave(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator('[data-testid^="category-group-edit-"]');
    await editForm.locator(Sel.categories.groupEditCancel(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    // First click arms the delete, second confirms
    await this.deleteBtn.click();
    await this.page.waitForTimeout(100); // Wait for armed state
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickMoveUp() {
    await this.moveUpBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickMoveDown() {
    await this.moveDownBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addCategory(name: string) {
    const form = this.container.locator('[data-testid^="add-category-form-"]');
    await form.locator(Sel.categories.addCategoryName(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).fill(name);
    await form.locator(Sel.categories.addCategorySubmit(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? '')).click();
    await expect(form.locator(Sel.categories.addCategoryName(this.container.getAttribute('data-testid')?.replace('category-group-', '') ?? ''))).toHaveValue('');
  }

  async getCategory(categoryId: string) {
    return new CategoryRow(this.page, categoryId);
  }
}

export class CategoryRow {
  readonly page: Page;
  readonly container: Locator;
  readonly name: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;
  readonly moveUpBtn: Locator;
  readonly moveDownBtn: Locator;

  constructor(page: Page, categoryId: string) {
    this.page = page;
    this.container = page.locator(Sel.categories.categoryRow(categoryId));
    this.name = this.container.locator(Sel.categories.categoryName(categoryId));
    this.editBtn = this.container.locator(Sel.categories.categoryEditBtn(categoryId));
    this.deleteBtn = this.container.locator(Sel.categories.categoryDeleteBtn(categoryId));
    this.moveUpBtn = this.container.locator(Sel.categories.categoryMoveUp(categoryId));
    this.moveDownBtn = this.container.locator(Sel.categories.categoryMoveDown(categoryId));
  }

  async expectName(name: string) {
    await expect(this.name).toContainText(name);
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.container.locator(Sel.categories.categoryEditForm(this.container.getAttribute('data-testid')?.replace('category-', '') ?? '')).waitFor({ state: 'visible' });
  }

  async edit(name: string) {
    const editForm = this.container.locator('[data-testid^="category-edit-form-"]');
    await editForm.locator(Sel.categories.categoryEditName(this.container.getAttribute('data-testid')?.replace('category-', '') ?? '')).fill(name);
    await editForm.locator(Sel.categories.categoryEditSave(this.container.getAttribute('data-testid')?.replace('category-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async cancelEdit() {
    const editForm = this.container.locator('[data-testid^="category-edit-form-"]');
    await editForm.locator(Sel.categories.categoryEditCancel(this.container.getAttribute('data-testid')?.replace('category-', '') ?? '')).click();
    await expect(editForm).not.toBeVisible();
  }

  async clickDelete() {
    // First click arms the delete, second confirms
    await this.deleteBtn.click();
    await this.page.waitForTimeout(100);
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickMoveUp() {
    await this.moveUpBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickMoveDown() {
    await this.moveDownBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}