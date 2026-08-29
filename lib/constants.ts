// Enum-like constants. SQLite (Prisma) has no native enums, so these mirror the
// String fields in schema.prisma and back the zod validators in lib/validations.ts.

export const CATEGORY_KINDS = [
  "INCOME",
  "KNOWN_EXPENSE",
  "SAVINGS",
  "DISCRETIONARY",
] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TXN_STATUSES = ["PENDING", "PAID", "SKIPPED"] as const;
export type TxnStatus = (typeof TXN_STATUSES)[number];

export const RECURRING_INTERVAL_MONTHS = [1, 2, 3, 4, 6, 12] as const;
export type RecurringIntervalMonths = (typeof RECURRING_INTERVAL_MONTHS)[number];

export const LEDGER_DIRECTIONS = ["GIVEN", "RECEIVED"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

// Bucket color/tint per group kind (fallbacks; per-group overrides may come later).
export const KIND_COLORS: Record<CategoryKind, { color: string; tint: string }> = {
  INCOME: { color: "#4f7c6b", tint: "#e4efe9" },
  SAVINGS: { color: "#4f7c6b", tint: "#e4efe9" },
  KNOWN_EXPENSE: { color: "#b07a68", tint: "#f3e7e1" },
  DISCRETIONARY: { color: "#82968c", tint: "#e8ecea" },
};

// Cycled by bucket order so multiple known buckets read distinctly (matches the
// mockup: Savings=teal, EMI=clay, Subscriptions=grey-teal, Misc=dim).
export const BUCKET_PALETTE: { color: string; tint: string }[] = [
  { color: "#4f7c6b", tint: "#e4efe9" },
  { color: "#b07a68", tint: "#f3e7e1" },
  { color: "#82968c", tint: "#e8ecea" },
  { color: "#6a706e", tint: "#e9ebea" },
];
