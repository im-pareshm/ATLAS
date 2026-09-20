import { describe, expect, it } from "vitest";
import { monthSummaryFrom, type CashLedger } from "@/lib/cash";

/**
 * `monthSummaryFrom` is the half of lib/cash.ts that does no I/O: it slices one
 * month out of an already-fetched, month-bucketed ledger. The DB half
 * (`loadCashLedger`) is what the e2e suite covers; this pins the slicing —
 * above all the prefix-sum that replaced the old `date: { lt: start }`
 * carry-in aggregates.
 */

type Bucket = {
  knownPaid: number;
  knownPlanned: number;
  discretionary: number;
  received: number;
  given: number;
};

const bucket = (b: Partial<Bucket>): Bucket => ({
  knownPaid: 0,
  knownPlanned: 0,
  discretionary: 0,
  received: 0,
  given: 0,
  ...b,
});

function ledger(init: Partial<CashLedger> = {}): CashLedger {
  return {
    openingBalance: 0,
    budgets: new Map(),
    buckets: new Map(),
    ...init,
  };
}

describe("monthSummaryFrom", () => {
  it("reads the asked-for month's own totals, not a neighbour's", () => {
    const out = monthSummaryFrom(
      ledger({
        buckets: new Map([
          ["2026-08", bucket({ knownPaid: 111_00, discretionary: 5_00 })],
          ["2026-09", bucket({ knownPaid: 222_00, discretionary: 7_00 })],
          ["2026-10", bucket({ knownPaid: 333_00, discretionary: 9_00 })],
        ]),
      }),
      { year: 2026, month: 9 },
    );
    expect(out.knownPaid).toBe(222_00);
    expect(out.discretionary).toBe(7_00);
  });

  it("a month with no bucket at all reads as zeroes, not undefined", () => {
    const out = monthSummaryFrom(ledger(), { year: 2026, month: 4 });
    expect(out.moneyIn).toBe(0);
    expect(out.moneyOut).toBe(0);
    expect(out.remaining).toBe(0);
    expect(out.cap).toBe(0);
  });

  it("carry-in sums every earlier bucket and excludes the month itself", () => {
    const out = monthSummaryFrom(
      ledger({
        openingBalance: 1_000_00,
        buckets: new Map([
          ["2026-06", bucket({ knownPaid: 100_00, discretionary: 50_00 })],
          ["2026-07", bucket({ knownPaid: 200_00, received: 30_00 })],
          // The anchor month must NOT contribute to its own carry-in.
          ["2026-08", bucket({ knownPaid: 999_00, discretionary: 999_00 })],
          // Nor may anything after it.
          ["2026-09", bucket({ knownPaid: 777_00 })],
        ]),
      }),
      { year: 2026, month: 8 },
    );
    // 1,000 − 100 − 50 − 200 + 30 = 680
    expect(out.carryIn).toBe(680_00);
  });

  it("crosses a year boundary in the right direction", () => {
    const out = monthSummaryFrom(
      ledger({
        buckets: new Map([
          ["2025-11", bucket({ received: 10_00 })],
          ["2025-12", bucket({ received: 20_00 })],
          ["2026-01", bucket({ received: 40_00 })],
        ]),
      }),
      { year: 2026, month: 1 },
    );
    // Only 2025-11 and 2025-12 are "prior"; lexicographic order must agree
    // with chronological order across the year rollover.
    expect(out.carryIn).toBe(30_00);
    expect(out.received).toBe(40_00);
  });

  it("takes income/additional/cap from the month's budget row", () => {
    const out = monthSummaryFrom(
      ledger({
        budgets: new Map([
          ["2026-09", { income: 50_000_00, additional: 1_500_00, cap: 9_000_00 }],
        ]),
      }),
      { year: 2026, month: 9 },
    );
    expect(out.income).toBe(50_000_00);
    expect(out.additional).toBe(1_500_00);
    expect(out.cap).toBe(9_000_00);
  });

  it("rolls prior months' income+additional into carry-in, but not this month's", () => {
    const out = monthSummaryFrom(
      ledger({
        budgets: new Map([
          ["2026-07", { income: 10_000_00, additional: 500_00, cap: 0 }],
          ["2026-08", { income: 20_000_00, additional: 0, cap: 0 }],
          ["2026-09", { income: 30_000_00, additional: 0, cap: 0 }],
        ]),
      }),
      { year: 2026, month: 9 },
    );
    // 10,000 + 500 + 20,000 carried in; September's 30,000 is current income.
    expect(out.carryIn).toBe(30_500_00);
    expect(out.income).toBe(30_000_00);
    expect(out.moneyIn).toBe(60_500_00);
  });

  it("stillToPay is the planned-minus-paid gap for the month", () => {
    const out = monthSummaryFrom(
      ledger({
        buckets: new Map([
          ["2026-09", bucket({ knownPaid: 1_353_700, knownPlanned: 1_885_265 })],
        ]),
      }),
      { year: 2026, month: 9 },
    );
    expect(out.stillToPay).toBe(531_565);
  });

  it("the same ledger answers many months independently", () => {
    const l = ledger({
      openingBalance: 500_00,
      buckets: new Map([
        ["2026-07", bucket({ discretionary: 100_00 })],
        ["2026-08", bucket({ discretionary: 200_00 })],
        ["2026-09", bucket({ discretionary: 300_00 })],
      ]),
    });
    const [jul, aug, sep] = [7, 8, 9].map((month) =>
      monthSummaryFrom(l, { year: 2026, month }),
    );
    expect(jul.carryIn).toBe(500_00);
    expect(aug.carryIn).toBe(400_00);
    expect(sep.carryIn).toBe(200_00);
    expect(sep.remaining).toBe(-100_00);
  });
});
