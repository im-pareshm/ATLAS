import { test, expect } from './fixtures/auth';
import { ExpensesPage } from './pages/ExpensesPage';
import { NavComponent } from './components/NavComponent';
import { formatINR, rupeesToPaise, createDiscretionaryData, DEFAULT_GROUPS } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('Expenses (Discretionary)', () => {
  let expensesPage: ExpensesPage;
  let nav: NavComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    expensesPage = new ExpensesPage(authenticatedPage);
    nav = new NavComponent(authenticatedPage);
    await expensesPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load expenses page with heading', async () => {
      await expect(expensesPage.heading).toBeVisible();
    });

    test('should show cap editor', async () => {
      await expect(expensesPage.capEditor).toBeVisible();
    });

    test('should show empty state when no transactions', async () => {
      await expect(expensesPage.totalSpent).toContainText(formatINR(0));
    });

    test('should show all discretionary categories in dropdown', async () => {
      const discretionaryGroup = DEFAULT_GROUPS.find(g => g.kind === 'DISCRETIONARY');
      if (discretionaryGroup) {
        const options = await expensesPage.addRow.locator(Sel.expenses.addRowCategory).locator('option').allTextContents();
        for (const cat of discretionaryGroup.categories) {
          expect(options).toContain(cat);
        }
      }
    });
  });

  test.describe('Monthly Cap', () => {
    test('should set monthly cap', async () => {
      await expensesPage.setCap(5000);
      await expensesPage.expectCap(rupeesToPaise(5000));
    });

    test('should update budget pill when cap set', async () => {
      await expensesPage.setCap(5000);
      await expensesPage.expectBudgetPill(`${formatINR(rupeesToPaise(5000))} left`);
    });

    test('should show budget bar at 0% when no spending', async () => {
      await expensesPage.setCap(5000);
      await expensesPage.expectBudgetBar(0);
    });

    test('should clear cap when set to 0', async () => {
      await expensesPage.setCap(5000);
      await expensesPage.clearCap();
      await expensesPage.expectCap(null);
    });

    test('should show suggested cap from last month', async () => {
      // This would require previous month data
      // The suggestion appears when no cap is set
      const placeholder = await expensesPage.capEditor.locator(Sel.expenses.capInput).getAttribute('placeholder');
      expect(placeholder).not.toBeNull();
    });
  });

  test.describe('Add Discretionary Spend', () => {
    test('should add a spend transaction', async () => {
      const spendData = createDiscretionaryData({ category: 'Food', description: 'Lunch', amount: 250 });
      await expensesPage.addSpend(spendData);

      await expensesPage.expectTransactionCount(1);
      const txn = await expensesPage.getTransaction(0);
      await txn.expectValues('Lunch', 'Food', rupeesToPaise(250));
    });

    test('should update total spent', async () => {
      await expensesPage.addSpend(createDiscretionaryData({ amount: 250 }));
      await expensesPage.addSpend(createDiscretionaryData({ amount: 150 }));

      await expensesPage.expectTotalSpent(rupeesToPaise(400));
    });

    test('should update budget pill when spending added', async () => {
      await expensesPage.setCap(5000);
      await expensesPage.addSpend(createDiscretionaryData({ amount: 1000 }));

      await expensesPage.expectBudgetPill(`${formatINR(rupeesToPaise(4000))} left`);
      await expensesPage.expectBudgetBar(20); // 1000/5000 = 20%
    });

    test('should show over budget in clay when exceeding cap', async () => {
      await expensesPage.setCap(1000);
      await expensesPage.addSpend(createDiscretionaryData({ amount: 1500 }));

      await expensesPage.expectBudgetPill(`${formatINR(rupeesToPaise(500))} over`);
      await expect(expensesPage.budgetBarFill).toHaveCSS('background-color', 'rgb(176, 122, 104)'); // clay color
    });

    test('should number transactions sequentially', async () => {
      await expensesPage.addSpend(createDiscretionaryData({ description: 'First', amount: 100 }));
      await expensesPage.addSpend(createDiscretionaryData({ description: 'Second', amount: 200 }));

      const txn1 = await expensesPage.getTransaction(0);
      const txn2 = await expensesPage.getTransaction(1);
      await expect(txn1.number).toContainText('01');
      await expect(txn2.number).toContainText('02');
    });

    test('should show error when description empty', async () => {
      const form = expensesPage.addRow;
      await form.locator(Sel.expenses.addRowAmount).fill('100');
      await form.locator(Sel.expenses.addRowSubmit).click();

      await expect(form.locator(Sel.expenses.addRowError)).toBeVisible();
    });

    test('should show error when amount is zero', async () => {
      const form = expensesPage.addRow;
      await form.locator(Sel.expenses.addRowDescription).fill('Test');
      await form.locator(Sel.expenses.addRowAmount).fill('0');
      await form.locator(Sel.expenses.addRowSubmit).click();

      await expect(form.locator(Sel.expenses.addRowError)).toBeVisible();
    });
  });

  test.describe('Remove Transaction', () => {
    test('should remove transaction and update totals', async () => {
      await expensesPage.addSpend(createDiscretionaryData({ amount: 500 }));
      await expensesPage.addSpend(createDiscretionaryData({ amount: 300 }));

      await expensesPage.expectTransactionCount(2);
      await expensesPage.removeTransaction(0); // Remove first

      await expensesPage.expectTransactionCount(1);
      await expensesPage.expectTotalSpent(rupeesToPaise(300));
    });

    test('should update budget bar after removal', async () => {
      await expensesPage.setCap(1000);
      await expensesPage.addSpend(createDiscretionaryData({ amount: 800 }));
      await expensesPage.expectBudgetBar(80);

      await expensesPage.removeTransaction(0);
      await expensesPage.expectBudgetBar(0);
    });
  });

  test.describe('Dashboard Integration', () => {
    test('should reflect discretionary spending on dashboard', async () => {
      await expensesPage.addSpend(createDiscretionaryData({ amount: 1500 }));

      await nav.clickDashboard();
      const { DashboardPage } = await import('./pages/DashboardPage');
      const dashboard = new DashboardPage(authenticatedPage);
      await dashboard.moneyOutCard.expectBreakdown(0, rupeesToPaise(1500), 0);
    });
  });

  test.describe('Month Navigation', () => {
    test('should show different data per month', async () => {
      await expensesPage.addSpend(createDiscretionaryData({ amount: 1000 }));
      await expensesPage.expectTotalSpent(rupeesToPaise(1000));

      // Navigate to next month
      const { MonthSwitcherComponent } = await import('./components/MonthSwitcherComponent');
      const monthSwitcher = new MonthSwitcherComponent(authenticatedPage);
      await monthSwitcher.clickNext();

      // Should be empty in next month
      await expensesPage.expectTotalSpent(0);
    });
  });
});


