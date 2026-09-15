/**
 * Test data constants and utilities.
 * Centralized test data for consistent, maintainable tests.
 */

// The fixed e2e account. The suite seeds the DB with these and logs in with them;
// .github/workflows/ci.yml mirrors the same two values for its seed step, so keep
// them in sync. Deliberately public and obviously fake — never reuse for a real
// deployment, and never point these at anything but a throwaway local DB.
export const TEST_USER = {
  email: "test@atlas.local",
  password: "e2e-only-not-a-real-password",
} as const;

export const DEFAULT_GROUPS = [
  { name: "Income", kind: "INCOME" as const },
  { name: "EMI & loans", kind: "KNOWN_EXPENSE" as const },
  { name: "Recurring bills", kind: "KNOWN_EXPENSE" as const },
  { name: "Subscriptions", kind: "DISCRETIONARY" as const },
  { name: "Savings & investments", kind: "SAVINGS" as const },
  { name: "Essentials", kind: "DISCRETIONARY" as const },
  { name: "Lifestyle", kind: "DISCRETIONARY" as const },
  { name: "Miscellaneous", kind: "DISCRETIONARY" as const },
] as const;

export const DEFAULT_CATEGORIES = {
  Income: ["Salary", "Freelance", "Interest", "Other Income"],
  "EMI & loans": ["Loan EMI", "Credit Card EMI", "Other EMI"],
  "Recurring bills": [
    "Electricity",
    "Water",
    "Internet",
    "Phone",
    "Gas",
    "Rent",
    "Insurance",
  ],
  Subscriptions: [
    "Streaming",
    "Software",
    "Gym",
    "News",
    "Other Subscriptions",
  ],
  "Savings & investments": [
    "Emergency Fund",
    "Stocks",
    "Mutual Funds",
    "PPF",
    "NPS",
    "Gold",
    "Other Investments",
  ],
  Essentials: [
    "Groceries",
    "Transport",
    "Healthcare",
    "Education",
    "Household",
  ],
  Lifestyle: [
    "Dining Out",
    "Entertainment",
    "Shopping",
    "Travel",
    "Hobbies",
    "Personal Care",
  ],
  Miscellaneous: ["Gifts", "Donations", "Repairs", "Other"],
} as const;

export const RUPEE_SYMBOL = "\u20B9";

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number): string {
  const rupees = paiseToRupees(paise);
  const sign = rupees < 0 ? "-" : "";
  const abs = Math.abs(rupees);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${RUPEE_SYMBOL}${formatted}`;
}

export function formatINRPlain(paise: number): string {
  const rupees = paiseToRupees(paise);
  const sign = rupees < 0 ? "-" : "";
  const abs = Math.abs(rupees);
  return `${sign}${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function createGroupData(
  overrides: Partial<{
    name: string;
    kind: "INCOME" | "KNOWN_EXPENSE" | "SAVINGS" | "DISCRETIONARY";
  }> = {},
) {
  return {
    name: overrides.name ?? `Test Group ${Date.now()}`,
    kind: overrides.kind ?? "DISCRETIONARY",
  };
}

export function createCategoryData(
  overrides: Partial<{
    name: string;
    groupName: string;
  }> = {},
) {
  return {
    name: overrides.name ?? `Test Category ${Date.now()}`,
    groupName: overrides.groupName ?? "Miscellaneous",
  };
}

export function createRecurringData(
  overrides: Partial<{
    description: string;
    category: string;
    amount: number;
    intervalMonths: number;
    startAt: string;
    isActive: boolean;
  }> = {},
) {
  return {
    description: overrides.description ?? `Test Recurring ${Date.now()}`,
    category: overrides.category ?? "Streaming",
    amount: overrides.amount ?? 500,
    intervalMonths: overrides.intervalMonths ?? 1,
    startAt: overrides.startAt ?? getCurrentMonth(),
    isActive: overrides.isActive ?? true,
  };
}

export function createKnownExpenseData(
  overrides: Partial<{
    description: string;
    category: string;
    amount: number;
    status: "PENDING" | "PAID" | "SKIPPED";
  }> = {},
) {
  return {
    description: overrides.description ?? `Test Known ${Date.now()}`,
    category: overrides.category ?? "Loan EMI",
    amount: overrides.amount ?? 10000,
    status: overrides.status ?? "PENDING",
  };
}

export function createExpenseData(
  overrides: Partial<{
    description: string;
    category: string;
    amount: number;
    date: string;
  }> = {},
) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return {
    description: overrides.description ?? `Test Expense ${Date.now()}`,
    category: overrides.category ?? "Groceries",
    amount: overrides.amount ?? 500,
    date: overrides.date ?? `${year}-${month}-${day}`,
  };
}

export function createPersonData(
  overrides: Partial<{
    name: string;
  }> = {},
) {
  return {
    name: overrides.name ?? `Test Person ${Date.now()}`,
  };
}

export function createLedgerEntryData(
  overrides: Partial<{
    description: string;
    amount: number;
    direction: "RECEIVED" | "GIVEN";
    date: string;
  }> = {},
) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return {
    description: overrides.description ?? `Test Ledger ${Date.now()}`,
    amount: overrides.amount ?? 1000,
    direction: overrides.direction ?? "RECEIVED",
    date: overrides.date ?? `${year}-${month}-${day}`,
  };
}

export function createFundData(
  overrides: Partial<{
    name: string;
    balance: number;
  }> = {},
) {
  return {
    name: overrides.name ?? `Test Fund ${Date.now()}`,
    balance: overrides.balance ?? 50000,
  };
}

export function uniqueId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonth(): string {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getNextMonth(): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 500,
): Promise<T> {
  let lastError: Error;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}
