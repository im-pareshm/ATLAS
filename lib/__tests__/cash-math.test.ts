import { describe, expect, it } from "vitest";
import { summarizeMonthCash, type MonthCashInputs } from "@/lib/cash-math";

/** A month with nothing going on: every field zero. Individual tests override. */
const BASE: MonthCashInputs = {
  openingBalance: 0,
  income: 0,
  additional: 0,
  cap: 0,
  knownPaid: 0,
  knownPlanned: 0,
  discretionary: 0,
  received: 0,
  given: 0,
  priorIncomeAdd: 0,
  priorKnownPaid: 0,
  priorDiscretionary: 0,
  priorReceived: 0,
  priorGiven: 0,
};

describe("summarizeMonthCash", () => {
  it("first month ever: carryIn is just the opening balance", () => {
    const out = summarizeMonthCash({ ...BASE, openingBalance: 500_00 });
    expect(out.carryIn).toBe(500_00);
    expect(out.moneyIn).toBe(500_00);
    expect(out.remaining).toBe(500_00);
  });

  it("carries forward net of every prior month, not just the opening balance", () => {
    const out = summarizeMonthCash({
      ...BASE,
      openingBalance: 1_000_00,
      priorIncomeAdd: 50_000_00,
      priorReceived: 200_00,
      priorKnownPaid: 30_000_00,
      priorDiscretionary: 5_000_00,
      priorGiven: 100_00,
    });
    // 1,000 + 50,000 + 200 − 30,000 − 5,000 − 100 = 16,100
    expect(out.carryIn).toBe(16_100_00);
  });

  it("combines income + additional + carryIn + received into moneyIn", () => {
    const out = summarizeMonthCash({
      ...BASE,
      income: 80_000_00,
      additional: 5_000_00,
      openingBalance: 10_000_00,
      received: 1_000_00,
    });
    expect(out.moneyIn).toBe(80_000_00 + 5_000_00 + 10_000_00 + 1_000_00);
  });

  it("combines knownPaid + discretionary + given into moneyOut", () => {
    const out = summarizeMonthCash({
      ...BASE,
      knownPaid: 20_000_00,
      discretionary: 8_000_00,
      given: 500_00,
    });
    expect(out.moneyOut).toBe(20_000_00 + 8_000_00 + 500_00);
  });

  it("remaining is moneyIn minus moneyOut and can go negative", () => {
    const out = summarizeMonthCash({
      ...BASE,
      income: 10_000_00,
      knownPaid: 25_000_00,
    });
    expect(out.remaining).toBe(10_000_00 - 25_000_00);
    expect(out.remaining).toBeLessThan(0);
  });

  it("stillToPay is knownPlanned minus knownPaid (pending known/savings items)", () => {
    const out = summarizeMonthCash({
      ...BASE,
      knownPlanned: 40_000_00,
      knownPaid: 15_000_00,
    });
    expect(out.stillToPay).toBe(25_000_00);
  });

  it("the discretionary cap is passed through untouched and never enters moneyOut on its own", () => {
    const out = summarizeMonthCash({ ...BASE, cap: 12_000_00, discretionary: 3_000_00 });
    expect(out.cap).toBe(12_000_00);
    expect(out.moneyOut).toBe(3_000_00); // cap itself does not add to moneyOut
  });

  it("a fully zeroed month nets to zero everywhere", () => {
    const out = summarizeMonthCash(BASE);
    expect(out).toMatchObject({
      carryIn: 0,
      moneyIn: 0,
      moneyOut: 0,
      remaining: 0,
      stillToPay: 0,
    });
  });
});
