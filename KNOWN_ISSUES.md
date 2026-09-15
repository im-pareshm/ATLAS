# Known Issues

Verified engineering problems that have a workaround in place, or fixes that were
deliberately deferred. Each entry should let someone pick the problem up cold
without redoing the investigation.

This is **not a backlog**. Feature scope and v2 deferrals live in [PRD.md](PRD.md);
design gaps live in the mockup handoff README under `Mockup designs/`. If
something is cheaper to fix than to write up here, fix it.

## Rules

- **Park a fix → add the entry in the same commit.** An exclusion, a `.skip`, an
  `it.todo`, a workaround: whatever carries the debt, the entry lands with it.
- **Fix it → delete the entry in the same commit.** Git history is the archive.
  There is no "Resolved" section.
- **Link both ways.** Every entry names the code carrying its workaround, and that
  code comments `See KNOWN_ISSUES.md "<entry title>"` rather than re-explaining
  inline, so `grep -r KNOWN_ISSUES` finds every hook.
- **A review that ends with unfixed findings ends with entries here**, not with
  findings left in a chat transcript.

Entry format: **Symptom** (what you observe) · **Cause** (verified, with
`file:line` pointers — not a hypothesis) · **Workaround in place** (what carries
the debt, and why it must not be "cleaned up") · **Fix plan** (concrete steps and
rough size) · **Since** (commit/date, when known).

---

## Playwright suite: 7 of 12 spec files don't compile or run

**Symptom.** `tsc` over `tests/` reports 238 errors across 9 files. With `tests/`
included in the build typecheck, `next build` fails at the first one
(`tests/fixtures/db.ts:15`). Running the suite, the broken specs fail at runtime
with `page.setCap is not a function` and similar.

**Cause.** The whole suite landed in one commit (`3123a3d`, 2026-08-05) with
three layers that were never reconciled:

1. *Specs call page-object methods that don't exist* — roughly 200 of the errors.
   `tests/expenses.spec.ts` calls twelve methods (`setCap`, `addSpend`,
   `expectBudgetPill`, `expectBudgetBar`, `expectTotalSpent`, `capEditor`,
   `clearCap`, `removeTransaction`, `addRow`, …); `tests/pages/ExpensesPage.ts`
   defines six, and only `goto`, `getTransaction` and `expectTransactionCount`
   overlap. Same pattern for people, funds, known-expenses and history. The
   remaining ~40 are ordinary bugs: missing `await` on async row getters
   (`tests/categories.spec.ts:144` — `Property 'expectName' does not exist on
   type 'Promise<CategoryRow>'`), selector-map keys that don't exist
   (`Sel.expenses.addRowCategory` where `tests/helpers/selectors.ts` has
   `addCategory`), and a fixture typing error at `tests/fixtures/db.ts:15`.
2. *Page-object selectors don't exist in the DOM.* Six screens — expenses, known,
   people, funds, history, categories — have **zero** `data-testid` attributes,
   so even an internally consistent page object like `HistoryPage.ts` targets
   nothing. Only recurring (24), the dashboard (13), login (5) and the shared
   nav/month switcher (9) have test IDs.
3. *The features are real.* The specs describe the product accurately — the
   `CapEditor` the expenses spec wants exists at
   `app/(app)/expenses/OtherSpending.tsx:44`. The hooks and page-object methods
   were never built underneath them.

Per file:

| Status | Spec files |
|---|---|
| Type-clean, screens have test IDs | `accessibility`, `dashboard`, `dashboard-attention`, `navigation`, `recurring` |
| Fixable in place (errors are on screens *with* test IDs) | `auth` (4 errors: `LoginPage.expectLoaded`, `Sel.dashboard.moneyInCard`, `Sel.nav.signOut`) |
| Broken at all three layers | `categories` (11), `expenses` (58), `funds` (32), `history` (12), `known-expenses` (44), `people` (42) |
| Support files with errors | `tests/pages/CategoriesPage.ts` (34), `tests/fixtures/db.ts` (1) |

**Workaround in place.** `tsconfig.json` excludes `tests/` so that `next build`
(the project's typecheck) passes. Playwright transpiles the specs itself and
never consults `include`/`exclude`, so the suite still runs. Consequences:

- The CI `e2e` job in `.github/workflows/ci.yml` (master pushes only) fails at
  runtime until this is fixed. The required `build-lint-unit` job is unaffected.
- `lib/__tests__/` (Vitest) is deliberately *not* excluded; it typechecks clean
  and should stay in the build.
- Do not remove `tests` from `exclude` as a tidy-up: the build will go red on
  `master` again.

**Fix plan.** A rewrite of six screens' test layer, not a patch. Suggested order,
each step leaving the suite runnable:

1. Fix `tests/fixtures/db.ts:15` (one typing error; every spec imports it) and
   the four `auth.spec.ts` errors in place.
2. Delete the six broken spec files and `tests/pages/CategoriesPage.ts` (only
   `categories.spec.ts` imports it). Get the remaining suites green in the CI
   `e2e` job.
3. Re-add coverage one screen at a time, in this order for each: add
   `data-testid`s to the screen → extend its page object → write the spec
   against it. `tests/recurring.spec.ts` + `tests/pages/RecurringPage.ts` is the
   template for what a wired-up screen looks like.
4. Remove `tests` from `tsconfig.json`'s `exclude`, confirm `next build` passes
   with the specs typechecked, and delete this entry.

**Since.** `3123a3d` (2026-08-05). The six screens' specs and page objects have
not been touched since. Verified 2026-09-15 that `next build` fails with `tests/`
included and that nothing in `tests/` or the dependency set differs from
`master`, so `master`'s build has the same failure.

---

## `PersonLedgerEntry.linkedTxnId` is a dead column

**Symptom.** `prisma/schema.prisma` has `linkedTxnId String?` on `PersonLedgerEntry`
(comment: "this entry is also a cash movement"), but no action or form ever sets it.
Every row is null.

**Cause.** DESIGN.md originally let a ledger entry *optionally* double as a cash
transaction. The integrated cash math (received = money in, given = money out —
`lib/cash-math.ts`) made that redundant, the UI was never built, and the column
shipped in the initial migration (`prisma/migrations/20260712145425_init`) and
`prisma/turso-schema.sql`.

**Workaround in place.** None needed — the column is nullable and ignored. Listed
so the decision isn’t lost: DESIGN.md marks it `UNUSED` and points here.

**Fix plan.** Decide one of:

1. Drop it — a Prisma migration removing the column, the matching edit to
   `prisma/turso-schema.sql`, and delete the line from DESIGN.md’s snippet.
2. Build it — a "also a cash transaction" option on the entry form that creates a
   linked `Transaction`. Only worth it if there is a real case the integrated math
   doesn’t already cover.

**Since.** Initial schema (2026-07-12).
