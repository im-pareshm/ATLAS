import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Local runs read .env; CI has no .env and supplies the same variables through the
// job's env block, so a missing file is not an error (same guard as prisma/seed.ts).
try {
  process.loadEnvFile(".env");
} catch {
  // env already provided
}

const databaseUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./prisma/dev.db";
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  }),
});

type DashboardFixture = {
  email: string;
  password: string;
  billDescription: string;
};

function currentMonth() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

async function createDashboardFixture(): Promise<DashboardFixture & { userId: string }> {
  const id = randomUUID();
  const email = `dashboard-${id}@atlas.test`;
  const password = "dashboard-test-password";
  const billDescription = `Electricity ${id.slice(0, 8)}`;
  const { year, month } = currentMonth();
  const date = new Date();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  const [knownGroup, spendingGroup] = await Promise.all([
    prisma.categoryGroup.create({
      data: { userId: user.id, name: `Bills ${id}`, kind: "KNOWN_EXPENSE", sortOrder: 0 },
    }),
    prisma.categoryGroup.create({
      data: { userId: user.id, name: `Spending ${id}`, kind: "DISCRETIONARY", sortOrder: 1 },
    }),
  ]);
  const [billCategory, spendingCategory] = await Promise.all([
    prisma.category.create({
      data: { userId: user.id, groupId: knownGroup.id, name: `Utilities ${id}`, sortOrder: 0 },
    }),
    prisma.category.create({
      data: { userId: user.id, groupId: spendingGroup.id, name: `Food ${id}`, sortOrder: 0 },
    }),
  ]);
  const person = await prisma.person.create({
    data: { userId: user.id, name: `Asha ${id}` },
  });

  await prisma.$transaction([
    prisma.budget.create({
      data: { userId: user.id, year, month, income: 2_000_000, cap: 1_000_000 },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: billCategory.id,
        description: billDescription,
        amount: 300_000,
        status: "PENDING",
        date,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: spendingCategory.id,
        description: "Groceries",
        amount: 250_000,
        status: "PAID",
        date,
      },
    }),
    prisma.personLedgerEntry.create({
      data: {
        userId: user.id,
        personId: person.id,
        direction: "GIVEN",
        description: "Lunch",
        amount: 100_000,
        pending: false,
        date,
      },
    }),
    prisma.fund.create({
      data: { userId: user.id, name: "Emergency fund", balance: 4_500_000, sortOrder: 0 },
    }),
  ]);

  return { userId: user.id, email, password, billDescription };
}

test.describe("Dashboard attention", () => {
  test.describe.configure({ mode: "serial" });

  let fixture: (DashboardFixture & { userId: string }) | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await createDashboardFixture();
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
  });

  test.afterEach(async () => {
    if (fixture) await prisma.user.delete({ where: { id: fixture.userId } });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("shows the safe-to-spend amount as the primary cash figure", async ({ page }) => {
    await expect(page.getByTestId("dashboard-safe-to-spend")).toHaveText("₹13,500");
    await expect(page.getByTestId("dashboard-available-cash")).toHaveText("₹16,500");

    const [safeToSpendSize, availableCashSize] = await Promise.all([
      page.getByTestId("dashboard-safe-to-spend").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
      page.getByTestId("dashboard-available-cash").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ]);
    expect(safeToSpendSize).toBeGreaterThan(availableCashSize);
  });

  test("saves income only after an explicit confirmation", async ({ page }) => {
    const income = page.getByLabel("Income");
    await income.fill("21000");
    await page.getByLabel("Additional").focus();

    await expect(page.getByTestId("dashboard-safe-to-spend")).toHaveText("₹13,500");
    await expect(page.getByTestId("money-in-save-success")).toHaveCount(0);

    await page.getByTestId("money-in-save").click();
    await expect(page.getByTestId("money-in-save-success")).toHaveText("Saved");
    await expect(page.getByTestId("dashboard-safe-to-spend")).toHaveText("₹14,500");
    await expect(page.getByTestId("dashboard-available-cash")).toHaveText("₹17,500");
  });

  test("surfaces attention data and keeps safe-to-spend stable when a bill is paid", async ({ page }) => {
    const bill = page.getByTestId("dashboard-planned-bill").filter({
      hasText: fixture?.billDescription,
    });
    await expect(bill).toBeVisible();
    await expect(page.getByTestId("dashboard-spending-cap")).toContainText("₹2,500 of ₹10,000 spent");
    await expect(page.getByTestId("dashboard-spending-cap")).toContainText("₹7,500 left");
    await expect(page.getByTestId("dashboard-people-summary")).toContainText("₹1,000 owed to you");
    await expect(page.getByTestId("dashboard-funds-summary")).toContainText("₹45,000");
    await expect(page.getByTestId("dashboard-next-steps")).toContainText("Pay 1 planned bill");
    await expect(page.getByTestId("dashboard-next-steps")).toContainText("Log an expense");
    await expect(page.getByTestId("dashboard-next-steps")).toContainText("₹7,500 left in cap");
    await expect(page.getByTestId("dashboard-next-steps")).not.toContainText("Recurring");

    await bill.getByTestId("dashboard-mark-bill-paid").click();
    await expect(bill).toHaveCount(0);
    await expect(page.getByTestId("dashboard-planned-bills")).toContainText("All caught up");
    await expect(page.getByTestId("dashboard-safe-to-spend")).toHaveText("₹13,500");
    await expect(page.getByTestId("dashboard-available-cash")).toHaveText("₹13,500");
  });
});
