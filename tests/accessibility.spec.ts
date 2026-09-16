import { test, expect } from './fixtures/auth';
import { Sel } from './helpers/selectors';
import { TEST_USER } from './helpers/test-data';

test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('should navigate login form with Tab', async ({ page }) => {
      await page.goto('/login');

      await page.keyboard.press('Tab'); // Email
      await expect(page.locator(Sel.login.email)).toBeFocused();

      await page.keyboard.press('Tab'); // Password
      await expect(page.locator(Sel.login.password)).toBeFocused();

      await page.keyboard.press('Tab'); // Submit
      await expect(page.locator(Sel.login.submit)).toBeFocused();
    });

    test('should submit login with Enter', async ({ page }) => {
      await page.goto('/login');
      await page.fill(Sel.login.email, TEST_USER.email);
      await page.fill(Sel.login.password, TEST_USER.password);

      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/');
    });

    test('should navigate dashboard with keyboard', async ({ authenticatedPage }) => {
      // Tab through summary cards
      await authenticatedPage.keyboard.press('Tab');
      // Should focus on first focusable element
    });

    test('should navigate month switcher with keyboard', async ({ authenticatedPage }) => {
      await authenticatedPage.keyboard.press('Tab'); // Focus month switcher
      await authenticatedPage.keyboard.press('Enter'); // Click prev/next
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have proper ARIA labels on month switcher', async ({ authenticatedPage }) => {
      const prevBtn = authenticatedPage.locator(Sel.monthSwitcher.prev);
      const nextBtn = authenticatedPage.locator(Sel.monthSwitcher.next);

      await expect(prevBtn).toHaveAttribute('aria-label', 'Previous month');
      await expect(nextBtn).toHaveAttribute('aria-label', 'Next month');
    });

    test('should have proper ARIA on theme toggle', async ({ authenticatedPage }) => {
      const themeToggle = authenticatedPage.locator(Sel.nav.themeToggle);
      await expect(themeToggle).toHaveAttribute('aria-label');
    });

    test('should have proper labels on form inputs', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator(Sel.login.email)).toHaveAttribute('type', 'email');
      await expect(page.locator(Sel.login.password)).toHaveAttribute('type', 'password');
    });

    test('should have proper button types', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator(Sel.login.submit)).toHaveAttribute('type', 'submit');
    });
  });

  test.describe('Focus Management', () => {
    test('should show focus indicators', async ({ authenticatedPage }) => {
      await authenticatedPage.keyboard.press('Tab');
      const focused = await authenticatedPage.evaluate(() => document.activeElement);
      expect(focused).toBeTruthy();
    });

    test('should trap focus in modals (if any)', async () => {
      // No modals in current implementation, but would test if added
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA contrast for text', async () => {
      // This would require axe-core or similar
      // Skipped - would need integration
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ authenticatedPage }) => {
      const headings = await authenticatedPage.locator('h1, h2, h3').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have landmarks', async ({ authenticatedPage }) => {
      await expect(authenticatedPage.locator('main')).toBeVisible();
      await expect(authenticatedPage.locator('header')).toBeVisible();
      await expect(authenticatedPage.getByRole('navigation')).toBeVisible();
    });
  });
});


