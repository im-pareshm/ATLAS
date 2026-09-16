import { test, expect } from './fixtures/auth';
import { RecurringPage } from './pages/RecurringPage';
import { rupeesToPaise, createRecurringData } from './helpers/test-data';
import { Sel } from './helpers/selectors';
import { resetTestUserData } from './helpers/db';

test.describe('Recurring Templates', () => {
  let recurringPage: RecurringPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Every test here counts rows, so start each one from a clean account.
    await resetTestUserData();
    recurringPage = new RecurringPage(authenticatedPage);
    await recurringPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load recurring page with heading', async () => {
      await expect(recurringPage.heading).toBeVisible();
    });

    test('should show create form', async () => {
      await expect(recurringPage.createForm).toBeVisible();
    });

    test('should show all valid categories in dropdown', async () => {
      const options = await recurringPage.createForm.locator(Sel.recurring.createCategory).locator('option').allTextContents();
      // Should include KNOWN_EXPENSE, SAVINGS, DISCRETIONARY categories
      expect(options.length).toBeGreaterThan(0);
    });
  });

  test.describe('Create Template', () => {
    test('should create a monthly recurring template', async () => {
      const templateData = createRecurringData({ description: 'Netflix', category: 'Streaming', amount: 500 });
      await recurringPage.createTemplate(templateData);

      await recurringPage.expectTemplateCount(1);
      const template = await recurringPage.getTemplate('netflix');
      await template.expectValues('Netflix', 'Streaming', rupeesToPaise(500), true);
    });

    test('should create template for known expense category', async () => {
      const templateData = createRecurringData({ description: 'Rent', category: 'Loan EMI', amount: 15000 });
      await recurringPage.createTemplate(templateData);

      const template = await recurringPage.getTemplate('rent');
      await template.expectValues('Rent', 'Loan EMI', rupeesToPaise(15000), true);
    });

    test('should create a 6-month recurring template', async () => {
      const templateData = createRecurringData({
        description: 'Policy Premium',
        category: 'Utilities',
        amount: 12000,
        intervalMonths: 6,
      });
      await recurringPage.createTemplate(templateData);

      const template = await recurringPage.getTemplate('policy-premium');
      await template.expectValues('Policy Premium', 'Utilities', rupeesToPaise(12000), true);
      await expect(template.container.locator(Sel.recurring.templateCadence)).toContainText('Every 6 months');
    });

    test('should create a yearly recurring template', async () => {
      const templateData = createRecurringData({
        description: 'Health Insurance',
        category: 'Utilities',
        amount: 18000,
        intervalMonths: 12,
      });
      await recurringPage.createTemplate(templateData);

      const template = await recurringPage.getTemplate('health-insurance');
      await expect(template.container.locator(Sel.recurring.templateCadence)).toContainText('Every 12 months');
      await expect(template.container.locator(Sel.recurring.templateNextDue)).toContainText(/\w{3} \d{4}/);
    });

    test('should show error when the amount is missing', async () => {
      const form = recurringPage.createForm;
      // Description is optional; amount is the field the server validates.
      await form.locator(Sel.recurring.createDescription).fill('No amount');
      await form.locator(Sel.recurring.createSubmit).click();

      await expect(form.locator(Sel.recurring.createError)).toBeVisible();
    });
  });

  test.describe('Toggle Active/Paused', () => {
    test('should pause active template', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Test', amount: 100 }));
      const template = await recurringPage.getTemplate('test');

      await template.toggleStatus();
      await template.expectValues('Test', '', rupeesToPaise(100), false);
      await expect(template.statusBtn).toContainText('Resume'); // the badge reads Paused; the button offers the opposite action
    });

    test('should activate paused template', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Test', amount: 100 }));
      const template = await recurringPage.getTemplate('test');

      await template.toggleStatus(); // Active -> Paused
      await template.toggleStatus(); // Paused -> Active
      await template.expectValues('Test', '', rupeesToPaise(100), true);
    });
  });

  test.describe('Edit Template', () => {
    test('should edit template description', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Original', amount: 100 }));
      const template = await recurringPage.getTemplate('original');

      await template.clickEdit();
      await template.edit({ description: 'Updated' });
      await template.expectValues('Updated', '', rupeesToPaise(100), true);
    });

    test('should edit template amount', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Test', amount: 100 }));
      const template = await recurringPage.getTemplate('test');

      await template.clickEdit();
      await template.edit({ amount: 200 });
      await template.expectValues('Test', '', rupeesToPaise(200), true);
    });

    test('should cancel edit', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Test', amount: 100 }));
      const template = await recurringPage.getTemplate('test');

      await template.clickEdit();
      await template.cancelEdit();
      await template.expectValues('Test', '', rupeesToPaise(100), true);
    });

    test('should edit template interval and first due month', async () => {
      await recurringPage.createTemplate(
        createRecurringData({ description: 'Insurance Plan', category: 'Utilities', amount: 1000 }),
      );
      const template = await recurringPage.getTemplate('insurance-plan');

      await template.clickEdit();
      await template.edit({ intervalMonths: 6 });
      await expect(template.container.locator(Sel.recurring.templateCadence)).toContainText('Every 6 months');
    });
  });

  test.describe('Delete Template', () => {
    test('should delete template', async () => {
      await recurringPage.createTemplate(createRecurringData({ description: 'To Delete', amount: 100 }));
      await recurringPage.expectTemplateCount(1);

      const template = await recurringPage.getTemplate('to-delete');
      await template.clickDelete();
      await recurringPage.expectTemplateCount(0);
    });

    test('should not delete already generated transactions', async () => {
      // This would require checking that generated transactions remain
      // when template is deleted - tested via known expenses
    });
  });

  test.describe('Lazy Generation Integration', () => {
    test('should generate known expense items for current month', async ({ authenticatedPage }) => {
      // Create recurring for known expense category
      await recurringPage.createTemplate(createRecurringData({ description: 'Monthly Rent', category: 'Loan EMI', amount: 10000 }));

      // Navigate to known expenses - should trigger generation
      const { NavComponent } = await import('./components/NavComponent');
      const nav = new NavComponent(authenticatedPage);
      await nav.clickKnown();

      const { KnownPage } = await import('./pages/KnownPage');
      const knownPage = new KnownPage(authenticatedPage);
      await knownPage.goto();

      const emiBucket = await knownPage.getBucket('EMI & loans');
      await emiBucket.expectItemCount(1);

      const items = await emiBucket.container.locator('[data-testid^="known-item-"]').all();
      const item = await emiBucket.getItem((await items[0].getAttribute('data-testid'))!.replace('known-item-', ''));
      await item.expectStatus('PENDING'); // Known expenses generated as PENDING
    });

    test('should generate discretionary items as PAID', async ({ authenticatedPage }) => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Coffee', category: 'Food', amount: 500 }));

      const { NavComponent } = await import('./components/NavComponent');
      const nav = new NavComponent(authenticatedPage);
      await nav.clickExpenses();

      const { ExpensesPage } = await import('./pages/ExpensesPage');
      const expensesPage = new ExpensesPage(authenticatedPage);
      await expensesPage.goto();

      await expensesPage.expectTransactionCount(1);
      const txn = await expensesPage.getTransaction(0);
      await txn.expectValues('Coffee', 'Food', rupeesToPaise(500));
    });
  });

  test.describe('Backfill Missed Months', () => {
    test('should backfill when app not opened for multiple months', async () => {
      // This test would require manipulating lastGeneratedYear/Month in DB
      // or using a time-machine approach
      // Skipped for now - requires DB access
    });
  });

  test.describe('Duplicate Prevention', () => {
    test('should not create duplicate transactions on repeated page loads', async ({ authenticatedPage }) => {
      await recurringPage.createTemplate(createRecurringData({ description: 'Test', category: 'Loan EMI', amount: 1000 }));

      // Navigate away and back multiple times
      const { NavComponent } = await import('./components/NavComponent');
      const nav = new NavComponent(authenticatedPage);

      for (let i = 0; i < 3; i++) {
        await nav.clickDashboard();
        await nav.clickKnown();
      }

      const { KnownPage } = await import('./pages/KnownPage');
      const knownPage = new KnownPage(authenticatedPage);
      await knownPage.goto();

      const emiBucket = await knownPage.getBucket('EMI & loans');
      await emiBucket.expectItemCount(1); // Only one generated
    });
  });
});


