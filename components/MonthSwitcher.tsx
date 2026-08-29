import Link from "next/link";
import { addMonths, formatMonth, toMonthParam, type YearMonth } from "@/lib/month";

// Server component: renders month navigation links for the current page.
export default function MonthSwitcher({
  ym,
  basePath,
}: {
  ym: YearMonth;
  basePath: string;
}) {
  const prev = toMonthParam(addMonths(ym, -1));
  const next = toMonthParam(addMonths(ym, 1));
  const chevron =
    "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] text-[15px] text-secondary transition-colors hover:bg-divider hover:text-strong";

  return (
    <div
      data-testid="month-switcher"
      className="inline-flex items-center gap-1 rounded-[13px] border border-line bg-card p-[4px] shadow-card"
    >
      <Link
        href={`${basePath}?month=${prev}`}
        data-testid="month-switcher-prev"
        className={chevron}
        aria-label="Previous month"
      >
        <span aria-hidden="true">‹</span>
      </Link>
      <span
        data-testid="month-switcher-current"
        className="num min-w-[132px] px-2 text-center text-[14px] font-bold"
      >
        {formatMonth(ym)}
      </span>
      <Link
        href={`${basePath}?month=${next}`}
        data-testid="month-switcher-next"
        className={chevron}
        aria-label="Next month"
      >
        <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}
