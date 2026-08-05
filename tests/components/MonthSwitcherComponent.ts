import { type Page, type Locator, expect } from '@playwright/test';
import { Sel } from '../helpers/selectors';

export class MonthSwitcherComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly prevBtn: Locator;
  readonly current: Locator;
  readonly nextBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator(Sel.monthSwitcher.container);
    this.prevBtn = page.locator(Sel.monthSwitcher.prev);
    this.current = page.locator(Sel.monthSwitcher.currentMonth);
    this.nextBtn = page.locator(Sel.monthSwitcher.next);
  }

  async expectVisible() {
    await expect(this.container).toBeVisible();
  }

  async expectCurrentMonth(expectedYear: number, expectedMonth: number) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const expectedText = `${monthNames[expectedMonth - 1]} ${expectedYear}`;
    await expect(this.current).toContainText(expectedText);
  }

  async clickPrev() {
    await this.prevBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNext() {
    await this.nextBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToMonth(targetYear: number, targetMonth: number) {
    // Navigate by clicking prev/next until we reach the target
    let current = await this.getCurrentMonth();
    while (current.year > targetYear || (current.year === targetYear && current.month > targetMonth)) {
      await this.clickPrev();
      current = await this.getCurrentMonth();
    }
    while (current.year < targetYear || (current.year === targetYear && current.month < targetMonth)) {
      await this.clickNext();
      current = await this.getCurrentMonth();
    }
  }

  async getCurrentMonth(): Promise<{ year: number; month: number }> {
    const text = await this.current.textContent();
    if (!text) throw new Error('Could not read current month');

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    for (let i = 0; i < monthNames.length; i++) {
      if (text.includes(monthNames[i])) {
        const yearMatch = text.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
        return { year, month: i + 1 };
      }
    }
    throw new Error(`Could not parse month from: ${text}`);
  }
}
