import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import {
  addMonths,
  formatMonth,
  monthRange,
  toMonthParam,
  type YearMonth,
} from "@/lib/month";
import { resolveActiveMonth } from "@/lib/active-month";
import { formatINR } from "@/lib/money";
import { computeMonthSummaries, type MonthSummary } from "@/lib/cash";
import MonthSwitcher from "@/components/MonthSwitcher";
import MonthCookieSync from "@/components/MonthCookieSync";

const MONTHS_BACK = 6;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const anchor = await resolveActiveMonth(monthParam);

  // Last 6 months ending at the anchor (newest first).
  const months: YearMonth[] = Array.from({ length: MONTHS_BACK }, (_, i) =>
    addMonths(anchor, -i),
  );
  // One ledger load covers all six months (see lib/cash.ts on why this is not
  // six separate calls).
  const summaries = await computeMonthSummaries(userId, months);
  const rows = months.map((ym, i) => ({ ym, s: summaries[i] }));
  const maxOut = Math.max(1, ...rows.map((r) => r.s.moneyOut));

  // Anchor-month spend by group (paid known/savings + discretionary).
  const { start, end } = monthRange(anchor);
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
      OR: [
        {
          status: "PAID",
          category: { group: { kind: { in: ["KNOWN_EXPENSE", "SAVINGS"] } } },
        },
        { category: { group: { kind: "DISCRETIONARY" } } },
      ],
    },
    select: { amount: true, category: { select: { group: { select: { name: true } } } } },
  });
  const byGroup = new Map<string, number>();
  for (const t of txns) {
    const g = t.category.group.name;
    byGroup.set(g, (byGroup.get(g) ?? 0) + t.amount);
  }
  const groupRows = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
  const groupMax = Math.max(1, ...groupRows.map(([, v]) => v));

  const remainColor = (s: MonthSummary) =>
    s.remaining < 0 ? "text-clay" : "text-teal";

  return (
    <div>
      <MonthCookieSync month={toMonthParam(anchor)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
            History &amp; reports
          </h1>
          <p className="mt-1 text-[13px] text-secondary">
            The last {MONTHS_BACK} months of cash flow, and where this month&apos;s
            money went.
          </p>
        </div>
        <MonthSwitcher ym={anchor} basePath="/history" />
      </div>

      {/* Cash by month */}
      <section className="mb-6 rounded-card bg-card p-[18px_20px] shadow-card">
        <h2 className="mb-3 text-[15.5px] font-bold">Cash by month</h2>
        <div className="flex flex-col">
          {rows.map(({ ym, s }) => (
            <div
              key={toMonthParam(ym)}
              className="border-t border-divider py-[10px]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold">
                  {formatMonth(ym)}
                </span>
                <span
                  className={`num text-[13px] font-bold ${remainColor(s)}`}
                >
                  {formatINR(s.remaining)}
                </span>
              </div>
              <div className="mt-[6px] flex items-center gap-3">
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-clay"
                    style={{ width: `${Math.round((s.moneyOut / maxOut) * 100)}%` }}
                  />
                </div>
                <span className="num text-[12px] text-teal">
                  +{formatINR(s.moneyIn)}
                </span>
                <span className="num text-[12px] text-clay">
                  −{formatINR(s.moneyOut)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-[11px] text-faint">
          bar = money out · <span className="text-teal">+in</span>{" "}
          <span className="text-clay">−out</span> · bold = remaining
        </p>
      </section>

      {/* This month by group */}
      <section className="rounded-card bg-card p-[18px_20px] shadow-card">
        <h2 className="mb-3 text-[15.5px] font-bold">
          {formatMonth(anchor)} — where it went
        </h2>
        {groupRows.length === 0 ? (
          <p className="py-2 text-[12.5px] text-faint">
            No spending recorded for this month.
          </p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {groupRows.map(([name, value]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-[130px] truncate text-[13px]">{name}</span>
                <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-teal"
                    style={{ width: `${Math.round((value / groupMax) * 100)}%` }}
                  />
                </div>
                <span className="num w-[92px] text-right text-[13px] font-semibold">
                  {formatINR(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
