import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toMonthParam, monthRange } from "@/lib/month";
import { resolveActiveMonth } from "@/lib/active-month";
import {
  getDiscretionaryCap,
  getLastMonthDiscretionaryActual,
} from "@/lib/budget";
import MonthSwitcher from "@/components/MonthSwitcher";
import MonthCookieSync from "@/components/MonthCookieSync";
import OtherSpending, { type Row, type CategoryOption } from "./OtherSpending";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const ym = await resolveActiveMonth(monthParam);
  const { start, end } = monthRange(ym);

  const [categories, txns, capPaise, suggestedCapPaise] = await Promise.all([
    prisma.category.findMany({
      where: { userId, group: { kind: "DISCRETIONARY" } },
      orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        category: { group: { kind: "DISCRETIONARY" } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        description: true,
        amount: true,
        category: { select: { name: true } },
      },
    }),
    getDiscretionaryCap(userId, ym),
    getLastMonthDiscretionaryActual(userId, ym),
  ]);

  const rows: Row[] = txns.map((t, i) => ({
    id: t.id,
    n: String(i + 1).padStart(2, "0"),
    description: t.description ?? "",
    categoryName: t.category.name,
    amountPaise: t.amount,
  }));
  const totalPaise = txns.reduce((sum, t) => sum + t.amount, 0);
  const categoryOptions: CategoryOption[] = categories;

  return (
    <div>
      <MonthCookieSync month={toMonthParam(ym)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
            Expenses
          </h1>
          <p className="mt-1 text-[13px] text-secondary">
            Day-to-day discretionary spending for the month.
          </p>
        </div>
        <MonthSwitcher ym={ym} basePath="/expenses" />
      </div>

      <OtherSpending
        month={ym}
        categories={categoryOptions}
        rows={rows}
        totalPaise={totalPaise}
        capPaise={capPaise}
        suggestedCapPaise={suggestedCapPaise}
      />
    </div>
  );
}
