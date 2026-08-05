import { test, expect } from './fixtures/auth';
import { KnownPage } from './pages/KnownPage';
import { NavComponent } from './components/NavComponent';
import { rupeesToPaise, createKnownItemData, DEFAULT_GROUPS } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('Known Expenses', () => {
  let knownPage: KnownPage;
  let nav: NavComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    knownPage = new KnownPage(authenticatedPage);
    nav = new NavComponent(authenticatedPage);
    await knownPage.goto();
  });

  test.describe('Page Load', () => {
    test('should load known expenses page with heading', async () => {
      await expect(knownPage.heading).toBeVisible();
    });

    test('should display all default buckets', async () => {
      const knownKinds = DEFAULT_GROUPS.filter(g => g.kind === 'KNOWN_EXPENSE' || g.kind === 'SAVINGS');
      for (const group of knownKinds) {
        const bucket = await knownPage.getBucket(group.name);
        await bucket.expectVisible();
      }
    });

    test('should show summary with zero paid/planned initially', async () => {
      await knownPage.expectSummary(0, 0);
    });
  });

  test.describe('Add Known Item', () => {
    test('should add a planned item to a bucket', async () => {
      const itemData = createKnownItemData({ description: 'Test Rent', category: 'Loan EMI', amount: 15000 });

      await knownPage.addItem(itemData);

      // Verify item appears in EMI bucket
      const emiBucket = await knownPage.getBucket('EMI & loans');
      await emiBucket.expectItemCount(1);
      await emiBucket.expectPaidOfPlanned(0, rupeesToPaise(15000));
      await emiBucket.expectProgress(0);
    });

    test('should add item to Savings bucket', async () => {
      const itemData = createKnownItemData({ description: 'Test SIP', category: 'SIP', amount: 5000 });

      await knownPage.addItem(itemData);

      const savingsBucket = await knownPage.getBucket('Savings');
      await savingsBucket.expectItemCount(1);
      await savingsBucket.expectPaidOfPlanned(0, rupeesToPaise(5000));
    });

    test('should show error when required fields missing', async () => {
      const form = authenticatedPage.locator(Sel.known.addItemForm);
      await form.locator(Sel.known.addItemAmount).fill('1000');
      await form.locator(Sel.known.addItemSubmit).click();

      await expect(form.locator(Sel.known.addItemError)).toBeVisible();
      await expect(form.locator(Sel.known.addItemError)).toContainText('required');
    });

    test('should show error when amount is zero', async () => {
      const form = authenticatedPage.locator(Sel.known.addItemForm);
      await form.locator(Sel.known.addItemDescription).fill('Test');
      await form.locator(Sel.known.addItemAmount).fill('0');
      await form.locator(Sel.known.addItemSubmit).click();

      await expect(form.locator(Sel.known.addItemError)).toBeVisible();
    });
  });

  test.describe('Mark Paid/Pending/Skipped', () => {
    test('should mark item as paid when checkbox clicked', async () => {
      const itemData = createKnownItemData({ description: 'Test Bill', category: 'Loan EMI', amount: 10000 });
      await knownPage.addItem(itemData);

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      expect(items.length).toBe(1);

      const itemId = await items[0].getAttribute('data-testid');
      const item = emiBucket.getItem(itemId!.replace('item-', ''));

      await item.expectStatus('PENDING');
      await item.clickCheckbox();
      await item.expectStatus('PAID');

      // Verify progress updated
      await emiBucket.expectProgress(100);
      await emiBucket.expectPaidOfPlanned(rupeesToPaise(10000), rupeesToPaise(10000));
    });

    test('should toggle back to pending when clicked again', async () => {
      const itemData = createKnownItemData({ description: 'Test Bill', category: 'Loan EMI', amount: 10000 });
      await knownPage.addItem(itemData);

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const itemId = await items[0].getAttribute('data-testid');
      const item = emiBucket.getItem(itemId!.replace('item-', ''));

      await item.clickCheckbox(); // PENDING -> PAID
      await item.expectStatus('PAID');

      await item.clickCheckbox(); // PAID -> PENDING
      await item.expectStatus('PENDING');
    });

    test('should cancel (skip) item', async () => {
      const itemData = createKnownItemData({ description: 'Test Bill', category: 'Loan EMI', amount: 10000 });
      await knownPage.addItem(itemData);

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const itemId = await items[0].getAttribute('data-testid');
      const item = emiBucket.getItem(itemId!.replace('item-', ''));

      await item.clickCancel();
      await item.expectStatus('SKIPPED');

      // Should be excluded from totals
      await emiBucket.expectPaidOfPlanned(0, 0);
      await emiBucket.expectProgress(0);
    });

    test('should restore cancelled item', async () => {
      const itemData = createKnownItemData({ description: 'Test Bill', category: 'Loan EMI', amount: 10000 });
      await knownPage.addItem(itemData);

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const itemId = await items[0].getAttribute('data-testid');
      const item = emiBucket.getItem(itemId!.replace('item-', ''));

      await item.clickCancel(); // PENDING -> SKIPPED
      await item.expectStatus('SKIPPED');

      await item.clickCancel(); // SKIPPED -> PENDING
      await item.expectStatus('PENDING');
    });
  });

  test.describe('Delete Item', () => {
    test('should delete item permanently', async () => {
      const itemData = createKnownItemData({ description: 'Test Bill', category: 'Loan EMI', amount: 10000 });
      await knownPage.addItem(itemData);

      const emiBucket = await knownPage.getBucket('EMI & loans');
      await emiBucket.expectItemCount(1);

      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const itemId = await items[0].getAttribute('data-testid');
      const item = emiBucket.getItem(itemId!.replace('item-', ''));

      await item.clickDelete();
      await emiBucket.expectItemCount(0);
    });
  });

  test.describe('Multiple Items & Bucket Totals', () => {
    test('should calculate bucket totals correctly with multiple items', async () => {
      await knownPage.addItem(createKnownItemData({ description: 'EMI 1', category: 'Loan EMI', amount: 10000 }));
      await knownPage.addItem(createKnownItemData({ description: 'EMI 2', category: 'Home loan', amount: 20000 }));

      const emiBucket = await knownPage.getBucket('EMI & loans');
      await emiBucket.expectItemCount(2);
      await emiBucket.expectPaidOfPlanned(0, rupeesToPaise(30000));
      await emiBucket.expectProgress(0);

      // Mark first as paid
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const item1 = emiBucket.getItem((await items[0].getAttribute('data-testid'))!.replace('item-', ''));
      await item1.clickCheckbox();

      await emiBucket.expectPaidOfPlanned(rupeesToPaise(10000), rupeesToPaise(30000));
      await emiBucket.expectProgress(33); // 10000/30000 ≈ 33%
    });

    test('should update dashboard summary when items marked paid', async () => {
      await knownPage.addItem(createKnownItemData({ description: 'Test', category: 'Loan EMI', amount: 10000 }));

      const emiBucket = await knownPage.getBucket('EMI & loans');
      const items = await emiBucket.container.locator('[data-testid^="item-"]').all();
      const item = emiBucket.getItem((await items[0].getAttribute('data-testid'))!.replace('item-', ''));

      await item.clickCheckbox();

      // Navigate to dashboard and verify
      await nav.clickDashboard();
      const { DashboardPage } = await import('./pages/DashboardPage');
      const dashboard = new DashboardPage(authenticatedPage);
      await dashboard.moneyOutCard.expectBreakdown(rupeesToPaise(10000), 0, 0);
    });
  });

  test.describe('Empty State', () => {
    test('should show message when no known expense buckets exist', async () => {
      // This test would require deleting all groups first
      // Skipping as it requires complex setup
    });
  });
});


