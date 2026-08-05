import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';
import { NavComponent } from './components/NavComponent';
import { MonthSwitcherComponent } from './components/MonthSwitcherComponent';
import { formatINR } from './helpers/test-data';

test.describe('Dashboard', () => {
  let dashboard: DashboardPage;
  let nav: NavComponent;
  let monthSwitcher: MonthSwitcherComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboard = new DashboardPage(authenticatedPage);
    nav = new NavComponent(authenticatedPage);
    monthSwitcher = new MonthSwitcherComponent(authenticatedPage);
    await dashboard.goto();
  });

  test.describe('Layout & Navigation', () => {
    test('should display all three summary cards', async () => {
      await expect(dashboard.moneyInCard.container).toBeVisible();
      await expect(dashboard.moneyOutCard.container).toBeVisible();
      await expect(dashboard.remainingCard.container).toBeVisible();
    });

    test('should show month switcher with current month', async () => {
      await monthSwitcher.expectVisible();
      const current = new Date();
      await monthSwitcher.expectCurrentMonth(current.getUTCFullYear(), current.getUTCMonth() + 1);
    });

    test('should have all navigation links', async () => {
      await nav.expectAllVisible();
    });

    test('should navigate to Known expenses via quick link', async () => {
      await dashboard.clickKnownLink();
      await expect(authenticatedPage).toHaveURL('/known');
    });

    test('should navigate to Expenses via quick link', async () => {
      await dashboard.clickExpensesLink();
      await expect(authenticatedPage).toHaveURL('/expenses');
    });

    test('should navigate to Recurring via quick link', async () => {
      await dashboard.clickRecurringLink();
      await expect(authenticatedPage).toHaveURL('/recurring');
    });
  });

  test.describe('Money In Card', () => {
    test('should display money in total', async () => {
      await dashboard.moneyInCard.expectTotal(0); // Initially 0
    });

    test('should allow setting income and additional', async () => {
      await dashboard.setIncome(50000, 5000);
      await dashboard.moneyInCard.expectIncome(50000);
      await dashboard.moneyInCard.expectTotal(55000); // 50000 + 5000 + 0 carry-in
    });

    test('should show carry-in + received as read-only', async () => {
      // Initially should be 0 (no carry-in, no received)
      await expect(dashboard.moneyInCard.carryInReceived).toContainText(formatINR(0));
    });
  });

  test.describe('Money Out Card', () => {
    test('should display money out total', async () => {
      await dashboard.moneyOutCard.expectTotal(0);
    });

    test('should show breakdown rows', async () => {
      await dashboard.moneyOutCard.expectBreakdown(0, 0, 0);
    });
  });

  test.describe('Remaining Cash Card (Hero)', () => {
    test('should display remaining cash', async () => {
      await dashboard.remainingCard.expectTotal(0);
    });

    test('should show still to pay pill', async () => {
      await dashboard.remainingCard.expectStillToPay(0);
    });

    test('should show positive (mint) color when remaining >= 0', async () => {
      await dashboard.setIncome(50000);
      await dashboard.remainingCard.expectPositive();
    });
  });

  test.describe('Month Navigation', () => {
    test('should navigate to previous month', async () => {
      await monthSwitcher.clickPrev();
      const current = new Date();
      const prevMonth = current.getUTCMonth() === 0 ? 12 : current.getUTCMonth();
      const prevYear = current.getUTCMonth() === 0 ? current.getUTCFullYear() - 1 : current.getUTCFullYear();
      await monthSwitcher.expectCurrentMonth(prevYear, prevMonth);
    });

    test('should navigate to next month', async () => {
      await monthSwitcher.clickNext();
      const current = new Date();
      const nextMonth = current.getUTCMonth() === 11 ? 1 : current.getUTCMonth() + 2;
      const nextYear = current.getUTCMonth() === 11 ? current.getUTCFullYear() + 1 : current.getUTCFullYear();
      await monthSwitcher.expectCurrentMonth(nextYear, nextMonth);
    });

    test('should persist selected month across navigation', async () => {
      await monthSwitcher.clickPrev();
      await nav.clickKnown();
      await nav.clickDashboard();
      // Should still be on previous month
      const current = new Date();
      const prevMonth = current.getUTCMonth() === 0 ? 12 : current.getUTCMonth();
      const prevYear = current.getUTCMonth() === 0 ? current.getUTCFullYear() - 1 : current.getUTCFullYear();
      await monthSwitcher.expectCurrentMonth(prevYear, prevMonth);
    });
  });
});

// Need to import authenticatedPage for use in tests
import { authenticatedPage } from './fixtures/auth';


