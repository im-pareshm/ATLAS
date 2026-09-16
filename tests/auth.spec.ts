import { test, expect } from './fixtures/auth';
import { LoginPage } from './pages/LoginPage';
import { TEST_USER } from './helpers/test-data';
import { Sel } from './helpers/selectors';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should load login page with all elements', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.expectLoaded();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Should redirect to dashboard
      await expect(page).toHaveURL('/');
      await expect(page.locator(Sel.dashboard.moneyIn)).toBeVisible();
    });

    test('should show error with invalid email', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('invalid@atlas.local', TEST_USER.password);
      await loginPage.expectError('Invalid email or password.');
    });

    test('should show error with invalid password', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USER.email, 'wrongpassword');
      await loginPage.expectError('Invalid email or password.');
    });

    test('should not submit with empty credentials', async ({ page }) => {
      // Both inputs are `required`, so the browser blocks the submit client-side;
      // the server action (and its error message) never runs.
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('', '');
      expect(await loginPage.isBlockedByBrowserValidation()).toBe(true);
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.reload();
      await expect(page).toHaveURL('/');
      await expect(page.locator(Sel.dashboard.moneyIn)).toBeVisible();
    });

    test('should redirect to login when accessing protected route without session', async ({ page }) => {
      await page.goto('/known');
      // Auth.js appends ?callbackUrl=<original> when it bounces to the sign-in page.
      await expect(page).toHaveURL(/\/login(\?.*)?$/);
    });

    test('should redirect logged-in user away from login page', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.goto('/login');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Sign Out', () => {
    test('should sign out and redirect to login', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.click(Sel.nav.logout);
      await expect(page).toHaveURL('/login');

      // Verify cannot access protected routes
      await page.goto('/');
      await expect(page).toHaveURL(/\/login(\?.*)?$/);
    });
  });
});


