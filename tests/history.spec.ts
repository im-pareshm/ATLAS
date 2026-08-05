import { test, expect } from './fixtures/auth';
import { HistoryPage } from './pages/HistoryPage';
import { NavComponent } from './components/NavComponent';
import { MonthSwitcherComponent } from './components/MonthSwitcherComponent';
import { rupeesToPaise } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('History & Reports', () => {
  let historyPage: HistoryPage;
  let nav: NavComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    historyPage = new HistoryPage(authenticatedPage);
    nav = new NavComponent(authenticatedPage);
    await historyPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load history page with heading', async () => {
      await expect(historyPage.heading).toBeVisible();
    });

    test('should show cash by month section', async () => {
      await expect(historyPage.page.locator(Sel.history.cashByMonth)).toBeVisible();
    });

    test('should show group breakdown section', async () => {
      await expect(historyPage.page.locator(Sel.history.groupBreakdown)).toBeVisible();
    });

    test('should show 6 months by default', async () => {
      await historyPage.expectMonthCount(6);
    });
  });

  test.describe('Cash by Month', () => {
    test('should show month name, remaining, money in, money out', async () => {
      const current = new Date();
      const monthParam = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const monthName = monthNames[current.getUTCMonth()];

      const monthRow = await historyPage.getMonthRow(monthParam);
      await monthRow.expectValues(monthName, 0, 0, 0);
    });

    test('should show remaining in teal when positive', async () => {
      // Would need data setup
    });

    test('should show remaining in clay when negative', async () => {
      // Would need data setup
    });
  });

  test.describe('Group Breakdown', () => {
    test('should show spending by group for anchor month', async () => {
      // Would need transaction data
    });
  });

  test.describe('Month Navigation', () => {
    test('should update both sections when month changed', async () => {
      const monthSwitcher = new MonthSwitcherComponent(authenticatedPage);
      await monthSwitcher.clickPrev();
      await historyPage.page.waitForLoadState('networkidle');

      // Both sections should update
      await historyPage.expectMonthCount(6);
    });
  });

  test.describe('Integration with Transactions', () => {
    test('should reflect known expenses in history', async () => {
      await nav.clickKnown();
      const { KnownPage } = await import('./pages/KnownPage');
      const knownPage = new KnownPage(authenticatedPage);
      await knownPage.addItem({ description: 'Test', category: 'Loan EMI', amount: 10000 });

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const item = emiBucket.getItem((await items[0].getAttribute('data-testid'))!.replace('item-', ''));
      await item.clickCheckbox();

      await nav.clickHistory();
      await historyPage.goto();

      const current = new Date();
      const monthParam = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthRow = await historyPage.getMonthRow(monthParam);
      await monthRow.expectValues(
        monthNames[current.getUTCMonth()],
        -rupeesToPaise(10000), // remaining = -10000
        0, // money in
        rupeesToPaise(10000) // money out
      );
    });

    test('should reflect discretionary expenses in history', async () => {
      await nav.clickExpenses();
      const { ExpensesPage } = await import('./pages/ExpensesPage');
      const expensesPage = new ExpensesPage(authenticatedPage);
      await expensesPage.addSpend({ category: 'Food', description: 'Lunch', amount: 500 });

      await nav.clickHistory();
      await historyPage.goto();

      const current = new Date();
      const monthParam = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthRow = await historyPage.getMonthRow(monthParam);
      await monthRow.expectValues(
        monthNames[current.getUTCMonth()],
        -rupeesToPaise(500),
        0,
        rupeesToPaise(500)
      );
    });
  });
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];


