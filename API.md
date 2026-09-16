# ATLAS — Data access reference (Server Actions & reads)

ATLAS has **no REST API**. It is a Next.js App Router app:

- **Reads** are Server Components. Each `page.tsx` queries Prisma directly for the
  signed-in user and the month being viewed. There is no data-access layer beyond
  the shared helpers in `lib/` listed under [Reads](#reads).
- **Writes** are Server Actions — 30 functions across eight `actions.ts` files,
  called straight from `<form action={…}>`. They are the app's mutation API and are
  catalogued below.
- The only HTTP route handler is Auth.js's `/api/auth/[...nextauth]`.

The schema itself is documented in [DESIGN.md](DESIGN.md) "Data model" (rationale,
ER diagram) and [prisma/schema.prisma](prisma/schema.prisma) (the live source).

## Conventions every action follows

**Location and shape.** `app/(app)/<screen>/actions.ts` (dashboard-level ones in
`app/(app)/actions.ts`, login in `app/login/actions.ts`), each file starting with
`"use server"`. Two signatures:

| Kind | Signature | Used with | On bad input |
|---|---|---|---|
| Form-state | `(prev: ActionState, formData: FormData) => Promise<ActionState>` | `useActionState` in the form component | returns `{ error }` |
| Fire-and-forget | `(formData: FormData) => Promise<void>` — toggles, deletes, reorders | a plain `<form action>` | silently no-ops |

`ActionState` is `{ error?: string; ok?: boolean }`, declared identically in each
file. A validation failure returns the **first** Zod issue's message as `error`;
success returns `{ ok: true }`.

**Auth and ownership.** Every action starts with `requireUserId()`
([lib/session.ts](lib/session.ts)), which throws if there is no session (routes are
already gated by [proxy.ts](proxy.ts), so this is defence in depth). Every query is
scoped by `userId`, and every mutation by id re-checks ownership first
(`findFirst({ where: { id, userId } })`): an id belonging to another user reads as
"not found" / no-op and never touches the row.

**Validation.** Zod schemas in [lib/validations.ts](lib/validations.ts); the
enum-like values they accept (`CATEGORY_KINDS`, `TXN_STATUSES`,
`LEDGER_DIRECTIONS`, `RECURRING_INTERVAL_MONTHS`) live in
[lib/constants.ts](lib/constants.ts) because SQLite has no enums. Category kind
is checked in the action, not the schema (e.g. a discretionary spend must use a
category whose group kind is `DISCRETIONARY`).

**Money.** Forms post **rupees** (decimals allowed). Actions convert with
`rupeesToPaise` and store **integer paise**; reads return paise and the UI formats
with `formatINR` ([lib/money.ts](lib/money.ts)). Nothing stores a float.

**Month.** Month-scoped forms post hidden `year` + `month` (1–12) fields. Pages
resolve the month they show with `resolveActiveMonth(param)`
([lib/active-month.ts](lib/active-month.ts)): `?month=YYYY-MM` wins, else the
`atlas-month` cookie (written by `MonthCookieSync` on every month-scoped page),
else the current UTC month. Month boundaries are UTC (`monthRange` in
[lib/month.ts](lib/month.ts)).

**Date stamping.** A transaction logged into the *current* month gets `new Date()`;
one logged into any other month gets the **1st of that month** (UTC). Ledger
entries are stamped `new Date()` on creation and again on "Mark received".

**Cache.** Each action ends with `revalidatePath(...)` for the screens it affects
(listed per action below). The dashboard (`/`) is revalidated by almost everything
because it aggregates the lot.

**Errors.** Unique-constraint violations (Prisma `P2002`) are mapped to friendly
messages ("You already have a fund with that name."). Anything else throws and
surfaces through Next's error boundary.

## Actions by screen

### Dashboard — `app/(app)/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `setMonthIncome` | form-state | `year`, `month`, `income`?, `additional`? (rupees) | month in range; each amount → paise, non-positive → 0 | Upserts the month's `Budget` row, touching only the fields present in the form | `/` |
| `signOutAction` | fire-and-forget | — | — | `signOut({ redirectTo: "/login" })` | — |

### Expenses (discretionary) — `app/(app)/expenses/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `addDiscretionaryTxn` | form-state | `categoryId`, `description`?, `amount`, `year`, `month` | `discretionaryTxnSchema`; category must be the user's and of kind `DISCRETIONARY` | Creates a `Transaction` with `status: "PAID"` (discretionary spend is always already paid) | `/expenses`, `/` |
| `setCap` | form-state | `year`, `month`, `cap` (rupees) | month in range; cap ≤ 0 → 0 | Upserts `Budget.cap`. **0 means "no cap"** and is written as 0, never by deleting the row — the row also holds income/additional | `/expenses`, `/` |
| `deleteTxn` | form-state | `id` | ownership | Deletes the transaction | `/expenses`, `/` |

### Known expenses (planned checklist) — `app/(app)/known/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `addKnownItem` | form-state | `categoryId`, `description`?, `amount`, `year`, `month` | `knownTxnSchema` (same shape as discretionary); category kind `KNOWN_EXPENSE` or `SAVINGS` | Creates a `Transaction` with `status: "PENDING"` | `/known`, `/` |
| `setKnownStatus` | fire-and-forget | `id`, `status` (`PENDING` \| `PAID` \| `SKIPPED`) | status in `TXN_STATUSES`; ownership + kind | Sets the status. Only `PAID` items count as money-out; `SKIPPED` drops out of "planned" | `/known`, `/` |
| `deleteKnownItem` | fire-and-forget | `id` | ownership | Deletes the item | `/known`, `/` |

### People (IOU ledger) — `app/(app)/people/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `addPerson` | form-state | `name` | `personSchema`; unique per user (`P2002` → friendly error) | Creates a `Person` | `/people`, `/` |
| `deletePerson` | fire-and-forget | `id` | ownership | Deletes the person **and all their entries** (cascade) | `/people`, `/` |
| `addEntry` | form-state | `personId`, `direction` (`GIVEN` \| `RECEIVED`), `description`?, `amount`, `pending` (checkbox, `"on"`) | `ledgerEntrySchema`; person must be the user's | Creates a `PersonLedgerEntry` dated now. A **pending** entry is excluded from the cash math and the balance until settled | `/people`, `/` |
| `markReceived` | fire-and-forget | `id` | ownership | Clears `pending` and re-stamps `date` to now | `/people`, `/` |
| `deleteEntry` | fire-and-forget | `id` | ownership | Deletes the entry | `/people`, `/` |

### Funds (savings snapshot) — `app/(app)/funds/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `addFund` | form-state | `name`, `amount`? (rupees) | `fundSchema`; unique name per user | Creates a `Fund` appended to the sort order | `/funds`, `/` |
| `updateFundBalance` | fire-and-forget | `id`, `balance` (rupees) | ownership; non-positive → 0 | Sets the balance (fired on blur) | `/funds`, `/` |
| `deleteFund` | fire-and-forget | `id` | ownership | Deletes the fund | `/funds`, `/` |

### Recurring templates — `app/(app)/recurring/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `createRecurring` | form-state | `categoryId`, `description`?, `amount`, `intervalMonths`, `startAt` (`YYYY-MM`) | `recurringSchema` (interval 1–12, start year/month parsed from `startAt`); category kind `KNOWN_EXPENSE`, `SAVINGS` or `DISCRETIONARY` (never `INCOME`) | Creates the template, then immediately runs `ensureRecurringTransactionsGenerated` so due items appear at once | `/recurring`, `/known`, `/expenses`, `/` |
| `updateRecurring` | form-state | `id` + the same fields | `recurringUpdateSchema`; ownership; category kind | Updates every field. Does **not** regenerate or touch already-generated items | same four |
| `toggleRecurring` | fire-and-forget | `id` | ownership | Flips `isActive`. Re-activating runs generation so missed months are backfilled | same four |
| `deleteRecurring` | fire-and-forget | `id` | ownership | Deletes the template. Generated transactions **keep their rows** (`recurringSourceId` is set null by the schema) | same four |

### Categories & groups — `app/(app)/categories/actions.ts`

| Action | Kind | Form fields | Validates | Effect | Revalidates |
|---|---|---|---|---|---|
| `createGroup` | form-state | `name`, `kind` | `groupCreateSchema` (kind in `CATEGORY_KINDS`); unique name | Creates a `CategoryGroup` appended to the sort order | `/categories` |
| `updateGroup` | form-state | `id`, `name`, `kind` | `groupUpdateSchema`; ownership; unique name | Renames / re-kinds the group | `/categories` |
| `deleteGroup` | form-state | `id` | ownership; **refused if it still has categories** | Deletes the group | `/categories` |
| `moveGroup` | fire-and-forget | `id`, `dir` (`up` \| `down`) | ownership | Swaps `sortOrder` with the adjacent group (in one DB transaction) | `/categories` |
| `createCategory` | form-state | `groupId`, `name` | `categoryCreateSchema`; group must be the user's; unique name | Creates a `Category` appended to its group's sort order | `/categories` |
| `updateCategory` | form-state | `id`, `name` | `categoryUpdateSchema`; ownership; unique name | Renames the category | `/categories` |
| `deleteCategory` | form-state | `id` | ownership; **refused if any transaction or template references it** (the error names the count) | Deletes the category | `/categories` |
| `moveCategory` | fire-and-forget | `id`, `dir` | ownership | Swaps `sortOrder` with the adjacent category in the same group | `/categories` |

### Login — `app/login/actions.ts`

| Action | Kind | Form fields | Effect |
|---|---|---|---|
| `loginAction` | form-state (`LoginState = { error?: string }`) | `email`, `password` | `signIn("credentials", { redirectTo: "/" })`. Any `AuthError` becomes `{ error: "Invalid email or password." }` (the same message for unknown email and wrong password, deliberately). Success throws Next's redirect, which is rethrown. |

## Reads

Pages are Server Components. The shared read helpers, all `userId`-scoped:

| Helper | File | What it returns |
|---|---|---|
| `computeMonthSummary(userId, ym)` | [lib/cash.ts](lib/cash.ts) | The month's `MonthSummary` (income, additional, carryIn, received, moneyIn, knownPaid, knownPlanned, discretionary, given, moneyOut, remaining, stillToPay, cap — all paise). Fetches the aggregates, then hands them to the pure `summarizeMonthCash` in [lib/cash-math.ts](lib/cash-math.ts), which is unit-tested. Carry-in is derived from `User.openingBalance` plus the net of every prior month, computed with range aggregates — there is no stored monthly closing balance. |
| `getDiscretionaryCap(userId, ym)` | [lib/budget.ts](lib/budget.ts) | The month's cap in paise, or `null` if no `Budget` row. Both `null` and `0` mean "no cap". |
| `getDiscretionarySpent(userId, ym)` | lib/budget.ts | Sum of the month's discretionary transactions |
| `getLastMonthDiscretionaryActual(userId, ym)` | lib/budget.ts | Last month's discretionary spend — the cap suggestion |
| `ensureRecurringTransactionsGenerated(userId)` | [lib/recurring.ts](lib/recurring.ts) | Not a read, but runs on every authenticated render (`app/(app)/layout.tsx`) and from the recurring actions. For each active template, creates one `Transaction` per due month from `lastGenerated` (or `start`) up to the current month — `PENDING` for known/savings, `PAID` for discretionary — dated the 1st, with `recurringSourceId` set. `@@unique([recurringSourceId, date])` makes re-runs idempotent, and `lastGeneratedYear/Month` is the fast "already caught up" check. |
| `resolveActiveMonth(param)` | [lib/active-month.ts](lib/active-month.ts) | The `YearMonth` a screen should show (see Conventions → Month) |

Each screen's page also runs its own small Prisma queries for its lists (e.g.
Expenses: discretionary categories + the month's discretionary transactions ordered
by `createdAt`). Those are colocated with the page and not repeated here.

## HTTP routes

There is exactly one: **`/api/auth/[...nextauth]`** (GET/POST), Auth.js v5.

- Provider: Credentials only ([lib/auth.ts](lib/auth.ts)) — looks the user up by
  email and `bcrypt.compare`s the password. Sessions are JWTs; the user id is
  copied onto the token and session (`lib/auth.config.ts`).
- Gate: [proxy.ts](proxy.ts) (Next 16's name for middleware) runs the `authorized`
  callback on every path except `api/auth`, `_next/static`, `_next/image` and
  files with an extension. No session → redirect to `/login?callbackUrl=…`. A
  signed-in user hitting `/login` → redirect to `/`.
- Per [IMPLEMENTATION_PLAN.md §5](IMPLEMENTATION_PLAN.md), add a route handler
  only for something a form genuinely can't do (a webhook, a file download).
  Everything else is a Server Action.

## Adding an action

1. Put it in the screen's `actions.ts`, `"use server"`, starting with
   `const userId = await requireUserId();`.
2. Pick the shape: form-state if the UI needs an error message back, otherwise
   fire-and-forget.
3. Validate with a Zod schema in `lib/validations.ts`; put any new enum-like value
   in `lib/constants.ts` (and mirror it as a comment in `schema.prisma`).
4. Re-check ownership by id before any update/delete. Check category **kind** in
   the action when it matters.
5. Store paise, never rupees.
6. `revalidatePath` every screen that shows the affected data — remember `/`.
7. Add a row to the table above, and, if it changes money math, a case in
   `lib/__tests__/` first (see AGENTS.md "Testing").
