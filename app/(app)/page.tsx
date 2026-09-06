import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { toMonthParam } from "@/lib/month";
import { resolveActiveMonth } from "@/lib/active-month";
import { monthRange } from "@/lib/month";
import { formatINR } from "@/lib/money";
import { computeMonthSummary } from "@/lib/cash";
import MonthSwitcher from "@/components/MonthSwitcher";
import MonthCookieSync from "@/components/MonthCookieSync";
import MoneyInCard from "./MoneyInCard";
import { prisma } from "@/lib/prisma";
import { setKnownStatus } from "./known/actions";

const KNOWN_KINDS = ["KNOWN_EXPENSE", "SAVINGS"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const ym = await resolveActiveMonth(monthParam);
  const { start, end } = monthRange(ym);
  const [
    s,
    pendingBills,
    pendingBillCount,
    peopleGiven,
    peopleReceived,
    funds,
  ] = await Promise.all([
    computeMonthSummary(userId, ym),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        status: "PENDING",
        category: { group: { kind: { in: KNOWN_KINDS } } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 3,
      select: {
        id: true,
        description: true,
        amount: true,
        category: { select: { name: true } },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        date: { gte: start, lt: end },
        status: "PENDING",
        category: { group: { kind: { in: KNOWN_KINDS } } },
      },
    }),
    prisma.personLedgerEntry.aggregate({
      where: { userId, pending: false, direction: "GIVEN" },
      _sum: { amount: true },
    }),
    prisma.personLedgerEntry.aggregate({
      where: { userId, pending: false, direction: "RECEIVED" },
      _sum: { amount: true },
    }),
    prisma.fund.aggregate({
      where: { userId },
      _sum: { balance: true },
    }),
  ]);

  const outRow = (label: string, paise: number) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="num text-[12.5px] font-semibold text-strong">
        {formatINR(paise)}
      </span>
    </div>
  );

  const remainingNegative = s.remaining < 0;
  const availableAfterPlanned = s.remaining - s.stillToPay;
  const availableAfterPlannedNegative = availableAfterPlanned < 0;
  const hasCap = s.cap > 0;
  const capOverage = s.discretionary - s.cap;
  const capProgress = hasCap
    ? Math.min(100, Math.round((s.discretionary / s.cap) * 100))
    : 0;
  const peopleBalance =
    (peopleGiven._sum.amount ?? 0) - (peopleReceived._sum.amount ?? 0);
  const fundTotal = funds._sum.balance ?? 0;

  return (
    <div>
      <MonthCookieSync month={toMonthParam(ym)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
            Your month, in one view
          </h1>
          <p className="mt-1 max-w-[60ch] text-[13px] text-secondary">
            See what has been paid, what is still due, and what is safe to spend.
          </p>
        </div>
        <MonthSwitcher ym={ym} basePath="/" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
        <MoneyInCard
          month={ym}
          moneyInPaise={s.moneyIn}
          incomePaise={s.income}
          additionalPaise={s.additional}
          carryInPlusReceivedPaise={s.carryIn + s.received}
        />

        <div className="rounded-card bg-card p-[18px_20px] shadow-card">
          <div className="mb-3 flex items-center gap-[9px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-clay-tint text-clay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12l7 7 7-7" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-secondary">
              Money out · paid
            </span>
          </div>
          <div className="num mb-[14px] text-[28px] font-extrabold tracking-[-.02em] text-clay">
            {formatINR(s.moneyOut)}
          </div>
          <div className="flex flex-col gap-[9px]">
            {outRow("Known expenses", s.knownPaid)}
            {outRow("Discretionary", s.discretionary)}
            {outRow("Given to people", s.given)}
          </div>
        </div>

        <div
          className="flex flex-col justify-between rounded-card p-[20px_22px] text-white shadow-hero"
          style={{
            background:
              "linear-gradient(150deg,var(--color-teal) 0%,var(--color-teal-hero) 100%)",
          }}
        >
          <div className="flex items-center gap-[9px]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="13" rx="2.5" />
              <path d="M16 12h.01" />
              <path d="M2 10h20" />
            </svg>
            <span className="text-[13px] font-semibold text-white/85">
              Monthly cash position
            </span>
          </div>
          <div>
            <div className="mt-7">
              <p className="text-[11.5px] font-semibold text-white/80">
                Safe to spend after planned bills
              </p>
              <div className="mt-[6px]">
                <span
                  data-testid="dashboard-safe-to-spend"
                  className="num text-[44px] font-extrabold leading-none tracking-[-.03em]"
                  style={{
                    color: availableAfterPlannedNegative
                      ? "var(--color-clay-neg)"
                      : "var(--color-mint)",
                  }}
                >
                  {formatINR(availableAfterPlanned)}
                </span>
                <span className="mt-2 block text-[11.5px] text-white/75">
                  after {formatINR(s.stillToPay)} in planned bills
                </span>
              </div>
            </div>
            <div className="mt-6 border-t border-white/20 pt-[10px]">
              <p className="text-[11.5px] text-white/75">Available cash</p>
              <div
                data-testid="dashboard-available-cash"
                className="num mt-1 text-[20px] font-extrabold leading-none tracking-[-.02em]"
                style={{
                  color: remainingNegative
                    ? "var(--color-clay-neg)"
                    : "var(--color-mint)",
                }}
              >
                {formatINR(s.remaining)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section data-testid="dashboard-attention" className="mt-6 rounded-card bg-card p-[20px_22px] shadow-card" aria-labelledby="attention-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="attention-heading" className="text-[17px] font-extrabold tracking-[-.01em]">
              This month needs attention
            </h2>
            <p className="mt-1 text-[12.5px] text-secondary">
              Take care of what affects your available cash first.
            </p>
          </div>
          <Link
            data-testid="dashboard-add-expense"
            href={`/expenses?month=${toMonthParam(ym)}`}
            className="atlas-focus-ring atlas-touch inline-flex items-center rounded-[10px] bg-teal px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-teal-hover"
          >
            Add expense
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
          <div data-testid="dashboard-planned-bills" className="rounded-[12px] bg-inputbg p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-bold text-strong">Planned bills</h3>
              <span className="text-[12px] font-semibold text-muted">
                {pendingBillCount === 0
                  ? "All caught up"
                  : `${pendingBillCount} still to pay`}
              </span>
            </div>
            {pendingBills.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-secondary">
                No planned bills are waiting to be paid.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {pendingBills.map((bill) => (
                  <div data-testid="dashboard-planned-bill" key={bill.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-strong">
                        {bill.description || bill.category.name}
                      </p>
                      <p className="text-[11.5px] text-muted">{bill.category.name}</p>
                    </div>
                    <span className="num text-[12.5px] font-bold text-strong">
                      {formatINR(bill.amount)}
                    </span>
                    <form action={setKnownStatus}>
                      <input type="hidden" name="id" value={bill.id} />
                      <input type="hidden" name="status" value="PAID" />
                      <button
                        type="submit"
                        data-testid="dashboard-mark-bill-paid"
                        className="atlas-focus-ring atlas-touch rounded-[9px] bg-mint-tint px-3 text-[11.5px] font-bold text-teal transition-colors hover:bg-teal hover:text-white"
                      >
                        Mark paid
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            {pendingBillCount > pendingBills.length ? (
              <Link href={`/known?month=${toMonthParam(ym)}`} className="atlas-focus-ring mt-3 inline-flex text-[12px] font-semibold text-teal hover:text-teal-hover">
                View all planned bills →
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <div data-testid="dashboard-spending-cap" className="rounded-[12px] border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13.5px] font-bold text-strong">Spending cap</h3>
                {hasCap ? (
                  <span className={`num text-[12px] font-bold ${capOverage > 0 ? "text-clay" : "text-teal"}`}>
                    {capOverage > 0
                      ? `${formatINR(capOverage)} over`
                      : `${formatINR(s.cap - s.discretionary)} left`}
                  </span>
                ) : null}
              </div>
              {hasCap ? (
                <>
                  <p className="mt-2 text-[12.5px] text-secondary">
                    <span className="num font-bold text-strong">{formatINR(s.discretionary)}</span> of{" "}
                    <span className="num font-bold text-strong">{formatINR(s.cap)}</span> spent
                  </p>
                  <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-track">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${capProgress}%`,
                        background: capOverage > 0 ? "var(--color-clay)" : "var(--color-teal)",
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[12.5px] text-secondary">
                  No monthly spending cap is set yet.
                </p>
              )}
              <Link href={`/expenses?month=${toMonthParam(ym)}`} className="atlas-focus-ring mt-3 inline-flex text-[12px] font-semibold text-teal hover:text-teal-hover">
                {hasCap ? "Review spending" : "Set a spending cap"} →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link data-testid="dashboard-people-summary" href="/people" className="atlas-focus-ring rounded-[12px] border border-line p-3 transition-colors hover:bg-inputbg">
                <p className="text-[11.5px] font-semibold text-muted">People</p>
                <p className="mt-1 text-[12.5px] font-bold text-strong">
                  {peopleBalance > 0
                    ? `${formatINR(peopleBalance)} owed to you`
                    : peopleBalance < 0
                      ? `You owe ${formatINR(-peopleBalance)}`
                      : "All settled"}
                </p>
              </Link>
              <Link data-testid="dashboard-funds-summary" href="/funds" className="atlas-focus-ring rounded-[12px] border border-line p-3 transition-colors hover:bg-inputbg">
                <p className="text-[11.5px] font-semibold text-muted">Savings &amp; funds</p>
                <p className="num mt-1 text-[12.5px] font-bold text-strong">{formatINR(fundTotal)}</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3 text-[13px]">
        <Link
          href="/known"
          className="atlas-focus-ring atlas-touch rounded-card bg-card px-4 py-3 font-semibold text-secondary shadow-card transition-colors hover:text-teal"
        >
          Known expenses →
        </Link>
        <Link
          href="/expenses"
          className="atlas-focus-ring atlas-touch rounded-card bg-card px-4 py-3 font-semibold text-secondary shadow-card transition-colors hover:text-teal"
        >
          Other spending →
        </Link>
        <Link
          href="/recurring"
          className="atlas-focus-ring atlas-touch rounded-card bg-card px-4 py-3 font-semibold text-secondary shadow-card transition-colors hover:text-teal"
        >
          Recurring →
        </Link>
      </div>
    </div>
  );
}
