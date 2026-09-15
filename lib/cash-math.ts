// Pure cash-math core for computeMonthSummary (see lib/cash.ts). Deliberately has
// zero imports beyond types: no Prisma, no I/O. Everything here is plain
// arithmetic on numbers already fetched from the DB, which is what makes it
// unit-testable (lib/__tests__/cash-math.test.ts) without a database.
//
// Formula (see AGENTS.md "Key Architectural Decisions to Preserve" and
// UI_DESIGN_GUIDE.md §7 for the product rationale — don't change the shape of
// this without updating those docs too):
//   carryIn   = openingBalance + (all prior income+additional) + prior received
//               − prior known-paid − prior discretionary − prior given
//   moneyIn   = income + additional + carryIn + received
//   moneyOut  = knownPaid + discretionary + given
//   remaining = moneyIn − moneyOut
// The discretionary `cap` is a self-imposed target only — it never appears in
// the moneyIn/moneyOut/remaining math. All amounts are integer paise.

/** Everything computeMonthSummary needs after its DB aggregates come back. */
export type MonthCashInputs = {
  /** User.openingBalance — seeds the very first carry-forward. */
  openingBalance: number;
  /** This month's Budget.income (paise). */
  income: number;
  /** This month's Budget.additional (paise). */
  additional: number;
  /** This month's Budget.cap (paise) — passed through, not used in the math. */
  cap: number;
  /** This month's known/savings transactions with status PAID (paise). */
  knownPaid: number;
  /** This month's known/savings transactions with status != SKIPPED (paise). */
  knownPlanned: number;
  /** This month's DISCRETIONARY-kind transactions (paise). */
  discretionary: number;
  /** This month's non-pending PersonLedgerEntry RECEIVED (paise). */
  received: number;
  /** This month's non-pending PersonLedgerEntry GIVEN (paise). */
  given: number;
  /** Sum of Budget.income + Budget.additional for every month before this one. */
  priorIncomeAdd: number;
  /** Known/savings PAID transactions strictly before this month (paise). */
  priorKnownPaid: number;
  /** DISCRETIONARY transactions strictly before this month (paise). */
  priorDiscretionary: number;
  /** Non-pending RECEIVED ledger entries strictly before this month (paise). */
  priorReceived: number;
  /** Non-pending GIVEN ledger entries strictly before this month (paise). */
  priorGiven: number;
};

export type MonthSummary = {
  income: number;
  additional: number;
  carryIn: number;
  received: number;
  moneyIn: number;
  knownPaid: number;
  knownPlanned: number;
  discretionary: number;
  given: number;
  moneyOut: number;
  remaining: number;
  stillToPay: number;
  cap: number;
};

/**
 * The integrated monthly cash calculation, as pure arithmetic. computeMonthSummary
 * (lib/cash.ts) fetches `MonthCashInputs` from the DB and hands them here — this
 * function has no other job, which is what makes it safe to unit-test in isolation.
 */
export function summarizeMonthCash(inputs: MonthCashInputs): MonthSummary {
  const {
    openingBalance,
    income,
    additional,
    cap,
    knownPaid,
    knownPlanned,
    discretionary,
    received,
    given,
    priorIncomeAdd,
    priorKnownPaid,
    priorDiscretionary,
    priorReceived,
    priorGiven,
  } = inputs;

  const carryIn =
    openingBalance +
    priorIncomeAdd +
    priorReceived -
    priorKnownPaid -
    priorDiscretionary -
    priorGiven;

  const moneyIn = income + additional + carryIn + received;
  const moneyOut = knownPaid + discretionary + given;

  return {
    income,
    additional,
    carryIn,
    received,
    moneyIn,
    knownPaid,
    knownPlanned,
    discretionary,
    given,
    moneyOut,
    remaining: moneyIn - moneyOut,
    stillToPay: knownPlanned - knownPaid,
    cap,
  };
}
