import { prisma } from "@/lib/prisma";
import { addMonths, monthRange, type YearMonth } from "@/lib/month";

/** The persisted overall discretionary cap for the month (paise), or null if unset. */
export async function getDiscretionaryCap(
  userId: string,
  ym: YearMonth,
): Promise<number | null> {
  const b = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year: ym.year, month: ym.month } },
    select: { cap: true },
  });
  return b?.cap ?? null;
}

/** Total discretionary spend for the month (paise). */
export async function getDiscretionarySpent(
  userId: string,
  ym: YearMonth,
): Promise<number> {
  const { start, end } = monthRange(ym);
  const agg = await prisma.transaction.aggregate({
    where: {
      userId,
      date: { gte: start, lt: end },
      category: { group: { kind: "DISCRETIONARY" } },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Last month's actual discretionary spend (paise) — the pre-fill suggestion. */
export async function getLastMonthDiscretionaryActual(
  userId: string,
  ym: YearMonth,
): Promise<number> {
  return getDiscretionarySpent(userId, addMonths(ym, -1));
}
