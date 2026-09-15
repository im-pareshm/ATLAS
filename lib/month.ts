// Month helpers. A month is { year, month } with month 1-12. Boundaries use UTC
// to avoid timezone drift when filtering transactions by month.

export type YearMonth = { year: number; month: number };

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The current UTC year/month. */
export function currentYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** `ym` shifted by `n` months (negative goes backward). Handles year rollover. */
export function addMonths(ym: YearMonth, n: number): YearMonth {
  const zeroBased = ym.month - 1 + n;
  const year = ym.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/** Whole months from `start` to `end` (negative if `end` is before `start`). */
export function monthsBetween(start: YearMonth, end: YearMonth): number {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/** <0 if a before b, 0 if equal, >0 if a after b. */
export function compareYM(a: YearMonth, b: YearMonth): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

/** True if `a` and `b` are the same year/month. */
export function equalsYM(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/** First instant of the month (UTC). */
export function firstOfMonth(ym: YearMonth): Date {
  return new Date(Date.UTC(ym.year, ym.month - 1, 1));
}

/** [start, end) UTC range covering the whole month. */
export function monthRange(ym: YearMonth): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(ym.year, ym.month - 1, 1)),
    end: new Date(Date.UTC(ym.year, ym.month, 1)),
  };
}

/**
 * Whether a recurring template — first due in `start`, repeating every
 * `intervalMonths` months — is due in `candidate`. True for `start` itself and
 * every `intervalMonths`-th month after it; always false before `start`.
 *
 * Pulled out as pure month arithmetic (no Prisma) so it's unit-testable and
 * reusable without importing lib/recurring.ts's DB-touching generator.
 */
export function isDueMonth(
  start: YearMonth,
  candidate: YearMonth,
  intervalMonths: number,
): boolean {
  const delta = monthsBetween(start, candidate);
  return delta >= 0 && delta % intervalMonths === 0;
}

/** "January 2026" style label. */
export function formatMonth(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

/** "Jan 2026" style label. */
export function formatMonthShort(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1].slice(0, 3)} ${ym.year}`;
}

/** Parse "YYYY-MM" (falls back to current month on bad input). */
export function parseMonthParam(param?: string | null): YearMonth {
  if (param) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(param);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (month >= 1 && month <= 12) return { year, month };
    }
  }
  return currentYearMonth();
}

/** Serialize to "YYYY-MM" for URLs. */
export function toMonthParam(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}
