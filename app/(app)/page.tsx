import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { toMonthParam } from "@/lib/month";
import { resolveActiveMonth } from "@/lib/active-month";
import { formatINR } from "@/lib/money";
import { computeMonthSummary } from "@/lib/cash";
import MonthSwitcher from "@/components/MonthSwitcher";
import MonthCookieSync from "@/components/MonthCookieSync";
import MoneyInCard from "./MoneyInCard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const ym = await resolveActiveMonth(monthParam);
  const s = await computeMonthSummary(userId, ym);

  const outRow = (label: string, paise: number) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="num text-[12.5px] font-semibold text-strong">
        {formatINR(paise)}
      </span>
    </div>
  );

  const negative = s.remaining < 0;

  return (
    <div>
      <MonthCookieSync month={toMonthParam(ym)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
            Your month, in one view
          </h1>
          <p className="mt-1 max-w-[60ch] text-[13px] text-secondary">
            Money in minus everything paid out — the cash you actually have left.
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
              Remaining cash
            </span>
          </div>
          <div>
            <div
              className="num my-[10px] text-[44px] font-extrabold leading-none tracking-[-.03em]"
              style={{ color: negative ? "var(--color-clay-neg)" : "var(--color-mint)" }}
            >
              {formatINR(s.remaining)}
            </div>
            <div className="inline-flex items-center gap-[6px] rounded-full bg-white/15 px-[10px] py-[4px] text-[12px] font-semibold">
              <span className="num">{formatINR(s.stillToPay)}</span> still to pay
            </div>
          </div>
        </div>
      </div>

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
