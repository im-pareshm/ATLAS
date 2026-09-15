import { prisma } from "@/lib/prisma";
import { monthRange, type YearMonth } from "@/lib/month";
import { summarizeMonthCash, type MonthCashInputs, type MonthSummary } from "@/lib/cash-math";

export type { MonthSummary } from "@/lib/cash-math";

const KNOWN_KINDS = ["KNOWN_EXPENSE", "SAVINGS"];

const sum = (agg: { _sum: { amount: number | null } }) => agg._sum.amount ?? 0;

/**
 * Integrated monthly cash math (see UI_DESIGN_GUIDE.md §7 / DESIGN.md §1).
 * Carry-in is derived from the opening balance plus the net of every prior month,
 * computed with range aggregates (no month-by-month walk).
 *
 * This function's only job is fetching the raw numbers from the DB; the actual
 * arithmetic (carryIn/moneyIn/moneyOut/remaining) lives in the pure, unit-tested
 * `summarizeMonthCash` (lib/cash-math.ts). If the money math itself looks wrong,
 * look there first — it's the part that doesn't need a database to verify.
 */
export async function computeMonthSummary(
  userId: string,
  ym: YearMonth,
): Promise<MonthSummary> {
  const { start, end } = monthRange(ym);

  const [user, budget, budgets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { openingBalance: true },
    }),
    prisma.budget.findUnique({
      where: { userId_year_month: { userId, year: ym.year, month: ym.month } },
      select: { income: true, additional: true, cap: true },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { year: true, month: true, income: true, additional: true },
    }),
  ]);

  const openingBalance = user?.openingBalance ?? 0;
  const income = budget?.income ?? 0;
  const additional = budget?.additional ?? 0;
  const cap = budget?.cap ?? 0;

  // --- current month sums ---
  const [knownPaidAgg, knownPlannedAgg, discAgg, recvAgg, givenAgg] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          date: { gte: start, lt: end },
          status: "PAID",
          category: { group: { kind: { in: KNOWN_KINDS } } },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          date: { gte: start, lt: end },
          status: { not: "SKIPPED" },
          category: { group: { kind: { in: KNOWN_KINDS } } },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          date: { gte: start, lt: end },
          category: { group: { kind: "DISCRETIONARY" } },
        },
        _sum: { amount: true },
      }),
      prisma.personLedgerEntry.aggregate({
        where: {
          userId,
          date: { gte: start, lt: end },
          direction: "RECEIVED",
          pending: false,
        },
        _sum: { amount: true },
      }),
      prisma.personLedgerEntry.aggregate({
        where: {
          userId,
          date: { gte: start, lt: end },
          direction: "GIVEN",
          pending: false,
        },
        _sum: { amount: true },
      }),
    ]);

  // --- everything strictly before this month (for carry-in) ---
  const [priorKnownPaid, priorDisc, priorRecv, priorGiven] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { lt: start },
        status: "PAID",
        category: { group: { kind: { in: KNOWN_KINDS } } },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { lt: start },
        category: { group: { kind: "DISCRETIONARY" } },
      },
      _sum: { amount: true },
    }),
    prisma.personLedgerEntry.aggregate({
      where: { userId, date: { lt: start }, direction: "RECEIVED", pending: false },
      _sum: { amount: true },
    }),
    prisma.personLedgerEntry.aggregate({
      where: { userId, date: { lt: start }, direction: "GIVEN", pending: false },
      _sum: { amount: true },
    }),
  ]);

  const priorIncomeAdd = budgets
    .filter(
      (b) => b.year < ym.year || (b.year === ym.year && b.month < ym.month),
    )
    .reduce((s, b) => s + b.income + b.additional, 0);

  const inputs: MonthCashInputs = {
    openingBalance,
    income,
    additional,
    cap,
    knownPaid: sum(knownPaidAgg),
    knownPlanned: sum(knownPlannedAgg),
    discretionary: sum(discAgg),
    received: sum(recvAgg),
    given: sum(givenAgg),
    priorIncomeAdd,
    priorKnownPaid: sum(priorKnownPaid),
    priorDiscretionary: sum(priorDisc),
    priorReceived: sum(priorRecv),
    priorGiven: sum(priorGiven),
  };

  return summarizeMonthCash(inputs);
}
