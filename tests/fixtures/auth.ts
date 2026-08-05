import { test as base, type Page } from "@playwright/test";
import { TEST_USER } from "../helpers/test-data";

/**
 * Extended test fixture with authenticated page.
 * Logs in before tests and provides an authenticated page.
 */
interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Fixtures for authentication
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser }, providePage) => {
    const context = await browser.newContext({
      storageState: undefined,
    });

    const authPage = await context.newPage();

    await authPage.goto("/login");
    await authPage.fill('input[type="email"]', TEST_USER.email);
    await authPage.fill('input[type="password"]', TEST_USER.password);
    await authPage.click('button[type="submit"]');

    await authPage.waitForURL("/");
    await authPage.waitForSelector("main", { state: "visible" });

    await providePage(authPage);
    await context.close();
  },
});

export { expect } from "@playwright/test";
