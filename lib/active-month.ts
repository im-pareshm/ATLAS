import { cookies } from "next/headers";
import { parseMonthParam, currentYearMonth, type YearMonth } from "./month";

export const MONTH_COOKIE = "atlas-month";

/**
 * Resolve the month a screen should show: an explicit ?month= wins; otherwise the
 * last-selected month from the cookie; otherwise the current month. This is what
 * makes the selected month persist across sections (see MonthCookieSync).
 */
export async function resolveActiveMonth(param?: string): Promise<YearMonth> {
  if (param) return parseMonthParam(param);
  const store = await cookies();
  const cookieMonth = store.get(MONTH_COOKIE)?.value;
  if (cookieMonth) return parseMonthParam(cookieMonth);
  return currentYearMonth();
}
