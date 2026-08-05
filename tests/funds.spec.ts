import { test, expect } from './fixtures/auth';
import { FundsPage } from './pages/FundsPage';
import { rupeesToPaise, createFundData } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('Funds (Savings Snapshot)', () => {
  let fundsPage: FundsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    fundsPage = new FundsPage(authenticatedPage);
    await fundsPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load funds page with heading', async () => {
      await expect(fundsPage.heading).toBeVisible();
    });

    test('should show add fund form', async () => {
      await expect(fundsPage.addFundForm).toBeVisible();
    });

    test('should show total as 0 initially', async () => {
      await fundsPage.expectTotal(0);
    });

    test('should show disclaimer', async () => {
      await expect(fundsPage.page.locator(Sel.funds.disclaimer)).toBeVisible();
      await expect(fundsPage.page.locator(Sel.funds.disclaimer)).toContainText('not part of the monthly cash math');
    });
  });

  test.describe('Add Fund', () => {
    test('should add a new fund with balance', async () => {
      const fundData = createFundData({ name: 'Bike Fund', balance: 50000 });
      await fundsPage.addFund(fundData.name, fundData.balance);

      await fundsPage.expectFundCount(1);
      await fundsPage.expectTotal(rupeesToPaise(50000));
    });

    test('should add fund with zero balance', async () => {
      await fundsPage.addFund('Emergency Fund', 0);

      await fundsPage.expectFundCount(1);
      await fundsPage.expectTotal(0);
    });

    test('should show error for duplicate name', async () => {
      await fundsPage.addFund('Duplicate Fund', 1000);
      await fundsPage.addFund('Duplicate Fund', 2000);

      await expect(fundsPage.addFundForm.locator(Sel.funds.addFundError)).toBeVisible();
      await expect(fundsPage.addFundForm.locator(Sel.funds.addFundError)).toContainText('already have a fund');
    });
  });

  test.describe('Edit Fund Balance', () => {
    test('should update fund balance inline', async () => {
      await fundsPage.addFund('Test Fund', 10000);
      const fund = await fundsPage.getFund('test-fund');

      await fund.expectBalance(10000);
      await fund.setBalance(15000);
      await fund.expectBalance(15000);
      await fundsPage.expectTotal(rupeesToPaise(15000));
    });

    test('should update total when balance changed', async () => {
      await fundsPage.addFund('Fund 1', 5000);
      await fundsPage.addFund('Fund 2', 3000);
      await fundsPage.expectTotal(rupeesToPaise(8000));

      const fund1 = await fundsPage.getFund('fund-1');
      await fund1.setBalance(7000);
      await fundsPage.expectTotal(rupeesToPaise(10000));
    });
  });

  test.describe('Delete Fund', () => {
    test('should delete fund and update total', async () => {
      await fundsPage.addFund('To Delete', 5000);
      await fundsPage.addFund('To Keep', 3000);
      await fundsPage.expectTotal(rupeesToPaise(8000));

      const fund = await fundsPage.getFund('to-delete');
      await fund.clickDelete();
      await fundsPage.expectTotal(rupeesToPaise(3000));
      await fundsPage.expectFundCount(1);
    });
  });

  test.describe('Multiple Funds', () => {
    test('should calculate total correctly', async () => {
      await fundsPage.addFund('Fund A', 10000);
      await fundsPage.addFund('Fund B', 20000);
      await fundsPage.addFund('Fund C', 30000);

      await fundsPage.expectTotal(rupeesToPaise(60000));
      await fundsPage.expectFundCount(3);
    });
  });
});


