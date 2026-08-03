import { prisma } from "@/lib/prisma";
import { monthRange, type YearMonth } from "@/lib/month";

const KNOWN_KINDS = ["KNOWN_EXPENSE", "SAVINGS"];

export type MonthSummary = {
  income: number;
  additional: number;
  carryIn: number;
  received: number;
  moneyIn: number;
  knownPaid: number;
  knownPlanned: number;
  discretionary: number;
  given: number;
  moneyOut: number;
  remaining: number;
  stillToPay: number;
  cap: number;
};

const sum = (agg: { _sum: { amount: number | null } }) => agg._sum.amount ?? 0;

/**
 * Integrated monthly cash math (see UI_DESIGN_GUIDE.md §7 / DESIGN.md §1).
 * Carry-in is derived from the opening balance plus the net of every prior month,
 * computed with range aggregates (no month-by-month walk).
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

  const carryIn =
    openingBalance +
    priorIncomeAdd +
    sum(priorRecv) -
    sum(priorKnownPaid) -
    sum(priorDisc) -
    sum(priorGiven);

  const received = sum(recvAgg);
  const given = sum(givenAgg);
  const knownPaid = sum(knownPaidAgg);
  const knownPlanned = sum(knownPlannedAgg);
  const discretionary = sum(discAgg);

  const moneyIn = income + additional + carryIn + received;
  const moneyOut = knownPaid + discretionary + given;

  return {
    income,
    additional,
    carryIn,
    received,
    moneyIn,
    knownPaid,
    knownPlanned,
    discretionary,
    given,
    moneyOut,
    remaining: moneyIn - moneyOut,
    stillToPay: knownPlanned - knownPaid,
    cap,
  };
}
