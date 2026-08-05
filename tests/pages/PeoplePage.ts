import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class PeoplePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addForm: Locator;
  readonly peopleList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("People")');
    this.addForm = page.locator(Sel.people.addForm);
    this.peopleList = page.locator('[data-testid^="person-"]');
  }

  async goto() {
    await this.page.goto('/people');
    await this.heading.waitFor({ state: 'visible' });
  }

  async addPerson(name: string) {
    await this.addForm.locator(Sel.people.addName).fill(name);
    await this.addForm.locator(Sel.people.addSubmit).click();
    await expect(this.addForm.locator(Sel.people.addName)).toHaveValue('');
  }

  async getPerson(personId: string) {
    return new PersonCard(this.page, personId);
  }

  async expectPersonCount(count: number) {
    const people = this.page.locator('[data-testid^="person-"]');
    await expect(people).toHaveCount(count);
  }
}

export class PersonCard {
  readonly page: Page;
  readonly container: Locator;
  readonly name: Locator;
  readonly balance: Locator;
  readonly received: Locator;
  readonly given: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;
  readonly ledger: Locator;

  constructor(page: Page, personId: string) {
    this.page = page;
    this.container = page.locator(Sel.people.person(personId));
    this.name = this.container.locator(Sel.people.personName);
    this.balance = this.container.locator(Sel.people.personBalance);
    this.received = this.container.locator(Sel.people.personReceived);
    this.given = this.container.locator(Sel.people.personGiven);
    this.editBtn = this.container.locator(Sel.people.personEdit);
    this.deleteBtn = this.container.locator(Sel.people.personDelete);
    this.ledger = this.container.locator(Sel.people.ledger);
  }

  async expectValues(name: string, balance: string, received: string, given: string) {
    await expect(this.name).toContainText(name);
    await expect(this.balance).toContainText(balance);
    await expect(this.received).toContainText(received);
    await expect(this.given).toContainText(given);
  }

  async clickEdit() {
    await this.editBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickDelete() {
    await this.deleteBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addLedgerEntry(data: { description: string; amount: number; direction: 'RECEIVED' | 'GIVEN' }) {
    const form = this.ledger.locator(Sel.people.ledgerAddForm);
    await form.locator(Sel.people.ledgerAddDescription).fill(data.description);
    await form.locator(Sel.people.ledgerAddAmount).fill(String(data.amount));
    await form.locator(Sel.people.ledgerAddDirection).selectOption(data.direction);
    await form.locator(Sel.people.ledgerAddSubmit).click();
    await expect(form.locator(Sel.people.ledgerAddDescription)).toHaveValue('');
  }

  async getLedgerEntry(index: number) {
    return new LedgerEntryRow(this.page, index);
  }

  async expectLedgerEntryCount(count: number) {
    const entries = this.ledger.locator('[data-testid^="ledger-entry-"]');
    await expect(entries).toHaveCount(count);
  }
}

export class LedgerEntryRow {
  readonly page: Page;
  readonly container: Locator;
  readonly description: Locator;
  readonly amount: Locator;
  readonly direction: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page, index: number) {
    this.page = page;
    this.container = page.locator(Sel.people.ledgerEntry(index));
    this.description = this.container.locator('[data-testid="ledger-entry-description"]');
    this.amount = this.container.locator('[data-testid="ledger-entry-amount"]');
    this.direction = this.container.locator('[data-testid="ledger-entry-direction"]');
    this.editBtn = this.container.locator('[data-testid="ledger-entry-edit"]');
    this.deleteBtn = this.container.locator('[data-testid="ledger-entry-delete"]');
  }

  async expectValues(description: string, amount: string, direction: 'RECEIVED' | 'GIVEN') {
    await expect(this.description).toContainText(description);
    await expect(this.amount).toContainText(amount);
    await expect(this.direction).toContainText(direction);
  }
}