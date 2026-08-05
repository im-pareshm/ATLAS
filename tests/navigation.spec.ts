import { test, expect } from './fixtures/auth';
import { NavComponent } from './components/NavComponent';
import { MonthSwitcherComponent } from './components/MonthSwitcherComponent';

test.describe('Navigation & State Persistence', () => {
  let nav: NavComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    nav = new NavComponent(authenticatedPage);
  });

  test.describe('Navigation Bar', () => {
    test('should show all 8 navigation links', async () => {
      await nav.expectAllVisible();
    });

    test('should highlight active link', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/known');
      await nav.expectActive('known');

      await authenticatedPage.goto('/expenses');
      await nav.expectActive('expenses');
    });

    test('should navigate to all screens', async ({ authenticatedPage }) => {
      await nav.clickDashboard();
      await expect(authenticatedPage).toHaveURL('/');

      await nav.clickKnown();
      await expect(authenticatedPage).toHaveURL('/known');

      await nav.clickExpenses();
      await expect(authenticatedPage).toHaveURL('/expenses');

      await nav.clickPeople();
      await expect(authenticatedPage).toHaveURL('/people');

      await nav.clickFunds();
      await expect(authenticatedPage).toHaveURL('/funds');

      await nav.clickHistory();
      await expect(authenticatedPage).toHaveURL('/history');

      await nav.clickRecurring();
      await expect(authenticatedPage).toHaveURL('/recurring');

      await nav.clickCategories();
      await expect(authenticatedPage).toHaveURL('/categories');
    });
  });

  test.describe('Month Persistence (Cookie)', () => {
    test('should persist selected month across screens', async ({ authenticatedPage }) => {
      const monthSwitcher = new MonthSwitcherComponent(authenticatedPage);

      // Go to dashboard, change month
      await authenticatedPage.goto('/');
      await monthSwitcher.clickPrev();

      // Navigate to known - should keep the month
      await nav.clickKnown();
      const knownSwitcher = new MonthSwitcherComponent(authenticatedPage);
      const knownMonth = await knownSwitcher.getCurrentMonth();

      // Navigate to expenses - should keep the month
      await nav.clickExpenses();
      const expensesSwitcher = new MonthSwitcherComponent(authenticatedPage);
      const expensesMonth = await expensesSwitcher.getCurrentMonth();

      expect(knownMonth).toEqual(expensesMonth);
    });

    test('should persist month after page reload', async ({ authenticatedPage }) => {
      const monthSwitcher = new MonthSwitcherComponent(authenticatedPage);

      await authenticatedPage.goto('/');
      await monthSwitcher.clickPrev();
      const beforeReload = await monthSwitcher.getCurrentMonth();

      await authenticatedPage.reload();
      await monthSwitcher.expectVisible();
      const afterReload = await monthSwitcher.getCurrentMonth();

      expect(afterReload).toEqual(beforeReload);
    });
  });

  test.describe('Theme Toggle', () => {
    test('should toggle between light and dark', async ({ authenticatedPage }) => {
      // Check initial theme (should be light or system)
      const html = authenticatedPage.locator('html');
      const initialTheme = await html.getAttribute('data-theme');

      await nav.clickThemeToggle();
      const toggledTheme = await html.getAttribute('data-theme');
      expect(toggledTheme).not.toBe(initialTheme);

      await nav.clickThemeToggle();
      const backToOriginal = await html.getAttribute('data-theme');
      expect(backToOriginal).toBe(initialTheme);
    });

    test('should persist theme preference', async ({ authenticatedPage }) => {
      await nav.clickThemeToggle();
      const theme = await authenticatedPage.locator('html').getAttribute('data-theme');

      await authenticatedPage.reload();
      const persistedTheme = await authenticatedPage.locator('html').getAttribute('data-theme');
      expect(persistedTheme).toBe(theme);
    });
  });

  test.describe('Responsive Navigation', () => {
    test('should work on mobile viewport', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await nav.expectAllVisible();
      await nav.clickKnown();
      await expect(authenticatedPage).toHaveURL('/known');
    });

    test('should work on tablet viewport', async ({ authenticatedPage }) => {
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
      await nav.expectAllVisible();
    });
  });
});


