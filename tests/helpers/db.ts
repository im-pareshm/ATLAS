import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { TEST_USER } from "./test-data";

// Direct DB access for test isolation. Local runs read .env; CI has no .env and
// supplies the same variables through the job's env block (same guard as
// prisma/seed.ts). Only ever pointed at a local file DB — never at Turso.
try {
  process.loadEnvFile(".env");
} catch {
  // env already provided
}

const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./prisma/dev.db";

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  }),
});

/**
 * Deletes everything the e2e account has created — transactions, recurring
 * templates, people and their ledger entries, funds, monthly budgets — while
 * keeping the account itself and the seeded category groups. Call it from a
 * `beforeEach` in any spec whose assertions count rows, so tests don't depend on
 * what earlier tests left behind.
 */
export async function resetTestUserData() {
  const user = await prisma.user.findUnique({
    where: { email: TEST_USER.email },
    select: { id: true },
  });
  if (!user) return;
  const where = { userId: user.id };
  await prisma.transaction.deleteMany({ where });
  await prisma.recurringTransaction.deleteMany({ where });
  await prisma.personLedgerEntry.deleteMany({ where });
  await prisma.person.deleteMany({ where });
  await prisma.fund.deleteMany({ where });
  await prisma.budget.deleteMany({ where });
}
