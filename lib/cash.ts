import { prisma } from "@/lib/prisma";
import { toMonthParam, type YearMonth } from "@/lib/month";
import {
  summarizeMonthCash,
  type MonthCashInputs,
  type MonthSummary,
} from "@/lib/cash-math";

export type { MonthSummary } from "@/lib/cash-math";

/**
 * Integrated monthly cash math (see UI_DESIGN_GUIDE.md §7 / DESIGN.md §1).
 *
 * WHY THIS IS SHAPED THE WAY IT IS — read before "simplifying" it back into
 * per-month Prisma aggregates:
 *
 * `@prisma/adapter-libsql` serialises *every* query through a single mutex
 * (see its `performIO`), and against Turso each query is its own HTTPS round
 * trip. So `Promise.all` over Prisma calls buys no parallelism at all — the
 * round trips simply queue. The old shape cost 12 queries per month, which made
 * the 6-month history page 72 round trips ≈ 14s on a cross-region deployment.
 *
 * Instead we fetch the user's whole history *once*, bucketed by month, in a
 * fixed 4 queries regardless of how many months are asked for, and do the
 * per-month slicing in memory. Carry-in falls out as a prefix sum over the
 * buckets rather than its own pair of range aggregates.
 *
 * The arithmetic itself still lives in the pure, unit-tested `summarizeMonthCash`
 * (lib/cash-math.ts) — this file only feeds it. If the money math looks wrong,
 * look there first; it's the part that doesn't need a database to verify.
 */

/** One month's raw totals, straight out of the grouped queries. */
type MonthBucket = {
  knownPaid: number;
  knownPlanned: number;
  discretionary: number;
  received: number;
  given: number;
};

type BudgetRow = { income: number; additional: number; cap: number };

/** A user's entire cash history, bucketed by "YYYY-MM" and ready to slice. */
export type CashLedger = {
  openingBalance: number;
  budgets: Map<string, BudgetRow>;
  buckets: Map<string, MonthBucket>;
};

/** libSQL hands back INTEGER sums as number (or bigint if very large); COALESCE keeps them non-null. */
const n = (v: unknown): number =>
  typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0;

const emptyBucket = (): MonthBucket => ({
  knownPaid: 0,
  knownPlanned: 0,
  discretionary: 0,
  received: 0,
  given: 0,
});

type TxnBucketRow = {
  ym: string;
  knownPaid: number | bigint;
  knownPlanned: number | bigint;
  discretionary: number | bigint;
};

type LedgerBucketRow = {
  ym: string;
  received: number | bigint;
  given: number | bigint;
};

/**
 * Fetch everything the cash math needs for *any* month, in 4 round trips.
 *
 * Months are bucketed with `substr(date, 1, 7)`. That is safe because Prisma
 * stores SQLite DateTime as fixed-width ISO-8601 UTC text ("2026-08-01T00:00:00.000Z"),
 * so the first 7 characters are exactly the UTC "YYYY-MM" that `monthRange`
 * would have produced, and the strings sort chronologically.
 */
export async function loadCashLedger(userId: string): Promise<CashLedger> {
  const [user, budgetRows, txnRows, ledgerRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { openingBalance: true },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: {
        year: true,
        month: true,
        income: true,
        additional: true,
        cap: true,
      },
    }),
    prisma.$queryRaw<TxnBucketRow[]>`
      SELECT substr(t."date", 1, 7) AS "ym",
             COALESCE(SUM(CASE WHEN g."kind" IN ('KNOWN_EXPENSE', 'SAVINGS') AND t."status" = 'PAID'
                               THEN t."amount" END), 0) AS "knownPaid",
             COALESCE(SUM(CASE WHEN g."kind" IN ('KNOWN_EXPENSE', 'SAVINGS') AND t."status" <> 'SKIPPED'
                               THEN t."amount" END), 0) AS "knownPlanned",
             COALESCE(SUM(CASE WHEN g."kind" = 'DISCRETIONARY'
                               THEN t."amount" END), 0) AS "discretionary"
      FROM "Transaction" t
      JOIN "Category" c ON c."id" = t."categoryId"
      JOIN "CategoryGroup" g ON g."id" = c."groupId"
      WHERE t."userId" = ${userId}
      GROUP BY substr(t."date", 1, 7)
    `,
    prisma.$queryRaw<LedgerBucketRow[]>`
      SELECT substr("date", 1, 7) AS "ym",
             COALESCE(SUM(CASE WHEN "direction" = 'RECEIVED' THEN "amount" END), 0) AS "received",
             COALESCE(SUM(CASE WHEN "direction" = 'GIVEN'    THEN "amount" END), 0) AS "given"
      FROM "PersonLedgerEntry"
      WHERE "userId" = ${userId} AND "pending" = 0
      GROUP BY substr("date", 1, 7)
    `,
  ]);

  const buckets = new Map<string, MonthBucket>();
  const bucketFor = (ym: string) => {
    let b = buckets.get(ym);
    if (!b) buckets.set(ym, (b = emptyBucket()));
    return b;
  };

  for (const r of txnRows) {
    const b = bucketFor(r.ym);
    b.knownPaid = n(r.knownPaid);
    b.knownPlanned = n(r.knownPlanned);
    b.discretionary = n(r.discretionary);
  }
  for (const r of ledgerRows) {
    const b = bucketFor(r.ym);
    b.received = n(r.received);
    b.given = n(r.given);
  }

  const budgets = new Map<string, BudgetRow>();
  for (const b of budgetRows) {
    budgets.set(toMonthParam({ year: b.year, month: b.month }), {
      income: b.income,
      additional: b.additional,
      cap: b.cap,
    });
  }

  return { openingBalance: user?.openingBalance ?? 0, budgets, buckets };
}

/**
 * Slice one month out of an already-loaded ledger. Pure — no I/O — so the whole
 * history page costs the same 4 queries as a single month.
 *
 * "Prior" totals are a prefix sum over every bucket whose "YYYY-MM" key sorts
 * before this month's, which is exactly what the old `date: { lt: start }`
 * aggregates computed.
 */
export function monthSummaryFrom(
  ledger: CashLedger,
  ym: YearMonth,
): MonthSummary {
  const key = toMonthParam(ym);
  const here = ledger.buckets.get(key) ?? emptyBucket();
  const budget = ledger.budgets.get(key);

  let priorKnownPaid = 0;
  let priorDiscretionary = 0;
  let priorReceived = 0;
  let priorGiven = 0;
  for (const [k, b] of ledger.buckets) {
    if (k >= key) continue;
    priorKnownPaid += b.knownPaid;
    priorDiscretionary += b.discretionary;
    priorReceived += b.received;
    priorGiven += b.given;
  }

  let priorIncomeAdd = 0;
  for (const [k, b] of ledger.budgets) {
    if (k < key) priorIncomeAdd += b.income + b.additional;
  }

  const inputs: MonthCashInputs = {
    openingBalance: ledger.openingBalance,
    income: budget?.income ?? 0,
    additional: budget?.additional ?? 0,
    cap: budget?.cap ?? 0,
    knownPaid: here.knownPaid,
    knownPlanned: here.knownPlanned,
    discretionary: here.discretionary,
    received: here.received,
    given: here.given,
    priorIncomeAdd,
    priorKnownPaid,
    priorDiscretionary,
    priorReceived,
    priorGiven,
  };

  return summarizeMonthCash(inputs);
}

/** One month's summary. 4 queries. */
export async function computeMonthSummary(
  userId: string,
  ym: YearMonth,
): Promise<MonthSummary> {
  return monthSummaryFrom(await loadCashLedger(userId), ym);
}

/** Many months' summaries. Still 4 queries — this is what the history page wants. */
export async function computeMonthSummaries(
  userId: string,
  yms: YearMonth[],
): Promise<MonthSummary[]> {
  const ledger = await loadCashLedger(userId);
  return yms.map((ym) => monthSummaryFrom(ledger, ym));
}
