import { test, expect } from "./fixtures/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { MonthSwitcherComponent } from "./components/MonthSwitcherComponent";

test.describe("Dashboard", () => {
  let dashboard: DashboardPage;
  let monthSwitcher: MonthSwitcherComponent;

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboard = new DashboardPage(authenticatedPage);
    monthSwitcher = new MonthSwitcherComponent(authenticatedPage);
    await dashboard.goto();
  });

  test("shows the current dashboard summary", async () => {
    await dashboard.expectSummaryVisible();
    await expect(dashboard.attention).toBeVisible();
    await expect(
      dashboard.attention.getByRole("heading", {
        name: "This month needs attention",
      }),
    ).toBeVisible();
  });

  test("shows the active month in the month switcher", async () => {
    const current = new Date();
    await monthSwitcher.expectVisible();
    await monthSwitcher.expectCurrentMonth(
      current.getUTCFullYear(),
      current.getUTCMonth() + 1,
    );
  });

  test("opens the selected month expense entry flow", async () => {
    await dashboard.clickAddExpense();
    await expect(dashboard.page.getByRole("heading", { name: "Expenses" })).toBeVisible();
  });

  test("moves to the previous month", async () => {
    await monthSwitcher.clickPrev();
    const current = new Date();
    const expectedMonth = current.getUTCMonth() === 0 ? 12 : current.getUTCMonth();
    const expectedYear =
      current.getUTCMonth() === 0
        ? current.getUTCFullYear() - 1
        : current.getUTCFullYear();
    await monthSwitcher.expectCurrentMonth(expectedYear, expectedMonth);
  });
});
