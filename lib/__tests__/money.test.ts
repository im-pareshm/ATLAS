import { describe, expect, it } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "@/lib/money";

describe("rupeesToPaise / paiseToRupees", () => {
  it("converts rupees to integer paise", () => {
    expect(rupeesToPaise(250)).toBe(25_000);
    expect(rupeesToPaise(1.5)).toBe(150);
  });

  it("converts paise back to rupees", () => {
    expect(paiseToRupees(1050)).toBe(10.5);
    expect(paiseToRupees(100)).toBe(1);
  });

  it("round-trips whole-rupee amounts", () => {
    expect(rupeesToPaise(paiseToRupees(250_000))).toBe(250_000);
  });
});

describe("formatINR", () => {
  it("does not group amounts under 1,000", () => {
    expect(formatINR(50_000)).toBe("₹500"); // 500 rupees
  });

  it("groups the last 3 digits, then by 2s (Indian grouping)", () => {
    expect(formatINR(100_000)).toBe("₹1,000"); // 1,000
    expect(formatINR(12_000_000)).toBe("₹1,20,000"); // 1,20,000 — AGENTS.md's example
  });

  it("rounds to whole rupees", () => {
    expect(formatINR(150_49)).toBe("₹150"); // 150.49 rounds down
    expect(formatINR(150_50)).toBe("₹151"); // 150.50 rounds up
  });

  it("prefixes negative amounts with a U+2212 minus sign, not a hyphen", () => {
    expect(formatINR(-50_000)).toBe("\u2212₹500");
    expect(formatINR(-50_000)).not.toContain("-");
  });
});
