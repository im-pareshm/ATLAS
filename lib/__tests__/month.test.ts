import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  compareYM,
  equalsYM,
  formatMonth,
  isDueMonth,
  monthsBetween,
  parseMonthParam,
  toMonthParam,
  type YearMonth,
} from "@/lib/month";

describe("addMonths", () => {
  it("steps forward within a year", () => {
    expect(addMonths({ year: 2026, month: 3 }, 2)).toEqual({ year: 2026, month: 5 });
  });

  it("rolls over into the next year", () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
  });

  it("steps backward and rolls over into the previous year", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("handles multi-year jumps in both directions", () => {
    expect(addMonths({ year: 2026, month: 6 }, 30)).toEqual({ year: 2028, month: 12 });
    expect(addMonths({ year: 2026, month: 6 }, -30)).toEqual({ year: 2023, month: 12 });
  });
});

describe("monthsBetween / compareYM / equalsYM", () => {
  it("counts whole months between two YearMonths", () => {
    expect(monthsBetween({ year: 2026, month: 1 }, { year: 2026, month: 4 })).toBe(3);
    expect(monthsBetween({ year: 2026, month: 4 }, { year: 2026, month: 1 })).toBe(-3);
    expect(monthsBetween({ year: 2025, month: 11 }, { year: 2026, month: 2 })).toBe(3);
  });

  it("compares chronologically", () => {
    expect(compareYM({ year: 2026, month: 1 }, { year: 2026, month: 2 })).toBeLessThan(0);
    expect(compareYM({ year: 2026, month: 2 }, { year: 2026, month: 1 })).toBeGreaterThan(0);
    expect(compareYM({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
    expect(compareYM({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });

  it("checks equality by value, not reference", () => {
    expect(equalsYM({ year: 2026, month: 9 }, { year: 2026, month: 9 })).toBe(true);
    expect(equalsYM({ year: 2026, month: 9 }, { year: 2026, month: 10 })).toBe(false);
  });
});

describe("isDueMonth", () => {
  const start: YearMonth = { year: 2026, month: 1 };

  it("is due in the start month itself", () => {
    expect(isDueMonth(start, start, 1)).toBe(true);
    expect(isDueMonth(start, start, 3)).toBe(true);
  });

  it("is never due before the start month", () => {
    expect(isDueMonth(start, { year: 2025, month: 12 }, 1)).toBe(false);
  });

  it("monthly (interval 1) is due every month after start", () => {
    expect(isDueMonth(start, { year: 2026, month: 7 }, 1)).toBe(true);
    expect(isDueMonth(start, { year: 2027, month: 2 }, 1)).toBe(true);
  });

  it("quarterly (interval 3) is only due on exact multiples", () => {
    expect(isDueMonth(start, { year: 2026, month: 4 }, 3)).toBe(true); // +3
    expect(isDueMonth(start, { year: 2026, month: 7 }, 3)).toBe(true); // +6
    expect(isDueMonth(start, { year: 2026, month: 5 }, 3)).toBe(false); // +4
    expect(isDueMonth(start, { year: 2026, month: 6 }, 3)).toBe(false); // +5
  });

  it("annual (interval 12) recurs the same month a year later", () => {
    expect(isDueMonth(start, { year: 2027, month: 1 }, 12)).toBe(true);
    expect(isDueMonth(start, { year: 2027, month: 2 }, 12)).toBe(false);
  });
});

describe("month param round-trip", () => {
  it("toMonthParam / parseMonthParam agree", () => {
    const ym: YearMonth = { year: 2026, month: 3 };
    expect(parseMonthParam(toMonthParam(ym))).toEqual(ym);
  });

  it("pads single-digit months", () => {
    expect(toMonthParam({ year: 2026, month: 9 })).toBe("2026-09");
  });

  describe("fallback to the current month", () => {
    // Pin the clock so the assertions are concrete and can't straddle a month
    // boundary between two `new Date()` calls. UTC, to match currentYearMonth().
    afterEach(() => vi.useRealTimers());

    it("falls back on garbage input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 8, 15))); // 2026-09-15
      expect(parseMonthParam("not-a-month")).toEqual({ year: 2026, month: 9 });
      expect(parseMonthParam(undefined)).toEqual({ year: 2026, month: 9 });
      expect(parseMonthParam(null)).toEqual({ year: 2026, month: 9 });
    });

    it("rejects an out-of-range month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 8, 15)));
      expect(parseMonthParam("2026-13")).toEqual({ year: 2026, month: 9 });
      expect(parseMonthParam("2026-00")).toEqual({ year: 2026, month: 9 });
    });
  });
});

describe("formatMonth", () => {
  it("renders a readable label", () => {
    expect(formatMonth({ year: 2026, month: 1 })).toBe("January 2026");
  });
});
