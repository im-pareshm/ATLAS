import { test, expect } from './fixtures/auth';
import { PeoplePage } from './pages/PeoplePage';
import { formatINR, rupeesToPaise, createPersonData, createLedgerEntryData } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('People Ledger', () => {
  let peoplePage: PeoplePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    peoplePage = new PeoplePage(authenticatedPage);
    await peoplePage.goto();
  });

  test.describe('Page Load', () => {
    test('should load people page with heading', async () => {
      await expect(peoplePage.heading).toBeVisible();
    });

    test('should show add person form', async () => {
      await expect(peoplePage.addPersonForm).toBeVisible();
    });
  });

  test.describe('Add Person', () => {
    test('should add a new person', async () => {
      const personData = createPersonData({ name: 'Test Person' });
      await peoplePage.addPerson(personData.name);

      await peoplePage.expectPersonCount(1);
      await expect(peoplePage.page.locator('text=Test Person')).toBeVisible();
    });

    test('should show error for duplicate name', async () => {
      const personData = createPersonData({ name: 'Duplicate Person' });
      await peoplePage.addPerson(personData.name);
      await peoplePage.addPerson(personData.name);

      await expect(peoplePage.addPersonForm.locator(Sel.people.addPersonError)).toBeVisible();
      await expect(peoplePage.addPersonForm.locator(Sel.people.addPersonError)).toContainText('already have a person');
    });
  });

  test.describe('Person Card', () => {
    test('should show net pill with "no entries" for new person', async () => {
      await peoplePage.addPerson('New Person');
      await peoplePage.expectPersonCount(1);

      const person = await peoplePage.getPerson('new-person');
      await person.expectNetPill('no entries');
    });

    test('should show "owes you" when received > given', async () => {
      await peoplePage.addPerson('Friend');
      await peoplePage.expectPersonCount(1);

      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 5000 }));
      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', amount: 1000 }));

      await person.expectOwesYou(rupeesToPaise(4000));
    });

    test('should show "you owe" when given > received', async () => {
      await peoplePage.addPerson('Friend');
      await peoplePage.expectPersonCount(1);

      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', amount: 5000 }));
      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 1000 }));

      await person.expectYouOwe(rupeesToPaise(4000));
    });

    test('should show "settled" when given === received', async () => {
      await peoplePage.addPerson('Friend');
      await peoplePage.expectPersonCount(1);

      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', amount: 2000 }));
      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 2000 }));

      await person.expectSettled();
    });
  });

  test.describe('Ledger Entries', () => {
    test('should add entry with description and amount', async () => {
      await peoplePage.addPerson('Test Person');
      const person = await peoplePage.getPerson('test-person');

      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', description: 'Lent money', amount: 1000 }));

      const entries = await person.container.locator('[data-testid^="entry-"]').all();
      expect(entries.length).toBe(1);
      const entry = person.getEntry((await entries[0].getAttribute('data-testid'))!.replace('entry-', ''));
      await entry.expectValues('GIVEN', 'Lent money', rupeesToPaise(1000), false);
    });

    test('should show pending badge when entry is pending', async () => {
      await peoplePage.addPerson('Test Person');
      const person = await peoplePage.getPerson('test-person');

      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 1000, pending: true }));

      const entries = await person.container.locator('[data-testid^="entry-"]').all();
      const entry = person.getEntry((await entries[0].getAttribute('data-testid'))!.replace('entry-', ''));
      await entry.expectValues('RECEIVED', '', rupeesToPaise(1000), true);
    });

    test('should mark pending entry as received', async () => {
      await peoplePage.addPerson('Test Person');
      const person = await peoplePage.getPerson('test-person');

      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 1000, pending: true }));
      const entries = await person.container.locator('[data-testid^="entry-"]').all();
      const entry = person.getEntry((await entries[0].getAttribute('data-testid'))!.replace('entry-', ''));

      await entry.clickMarkReceived();
      await entry.expectValues('RECEIVED', '', rupeesToPaise(1000), false);
    });

    test('should not count pending entries in net balance', async () => {
      await peoplePage.addPerson('Test Person');
      const person = await peoplePage.getPerson('test-person');

      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 5000, pending: true }));
      await person.expectNetPill('no entries'); // Pending excluded

      const entries = await person.container.locator('[data-testid^="entry-"]').all();
      const entry = person.getEntry((await entries[0].getAttribute('data-testid'))!.replace('entry-', ''));
      await entry.clickMarkReceived();
      await person.expectOwesYou(rupeesToPaise(5000));
    });

    test('should delete entry', async () => {
      await peoplePage.addPerson('Test Person');
      const person = await peoplePage.getPerson('test-person');

      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', amount: 1000 }));
      const entries = await person.container.locator('[data-testid^="entry-"]').all();
      const entry = person.getEntry((await entries[0].getAttribute('data-testid'))!.replace('entry-', ''));

      await entry.clickDelete();
      await person.expectNetPill('no entries');
    });
  });

  test.describe('Delete Person', () => {
    test('should delete person and all their entries', async () => {
      await peoplePage.addPerson('To Delete');
      await peoplePage.addPerson('To Keep');
      await peoplePage.expectPersonCount(2);

      const person = await peoplePage.getPerson('to-delete');
      await person.delete();
      await peoplePage.expectPersonCount(1);
    });
  });

  test.describe('Dashboard Integration', () => {
    test('should reflect received (non-pending) in dashboard money in', async () => {
      await peoplePage.addPerson('Friend');
      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 3000 }));

      const { DashboardPage } = await import('./pages/DashboardPage');
      const dashboard = new DashboardPage(authenticatedPage);
      await dashboard.goto();

      // Carry-in + received should include the 3000
      await expect(dashboard.moneyInCard.carryInReceived).toContainText(formatINR(rupeesToPaise(3000)));
    });

    test('should reflect given (non-pending) in dashboard money out', async () => {
      await peoplePage.addPerson('Friend');
      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'GIVEN', amount: 2000 }));

      const { DashboardPage } = await import('./pages/DashboardPage');
      const dashboard = new DashboardPage(authenticatedPage);
      await dashboard.goto();

      await dashboard.moneyOutCard.expectBreakdown(0, 0, rupeesToPaise(2000));
    });

    test('should NOT count pending entries in dashboard', async () => {
      await peoplePage.addPerson('Friend');
      const person = await peoplePage.getPerson('friend');
      await person.addEntry(createLedgerEntryData({ direction: 'RECEIVED', amount: 3000, pending: true }));

      const { DashboardPage } = await import('./pages/DashboardPage');
      const dashboard = new DashboardPage(authenticatedPage);
      await dashboard.goto();

      await expect(dashboard.moneyInCard.carryInReceived).toContainText(formatINR(0));
    });
  });
});


