# AGENTS.md

Guidance for any AI coding tool (Claude Code, Cursor, Copilot, Codex, etc.) working
in this repository. This is the single source of truth — `CLAUDE.md` just points
here so Claude Code finds it too. If you're an agent editing this repo, read this
file first.

## Project Status

**v1 is built** (Next.js App Router + Prisma 7 + libSQL/Turso + Auth.js v5). All 10
feature phases are implemented and verified locally; deployment to Vercel + Turso
is the remaining step (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### Commands
- `npm run dev` — dev server on http://localhost:3000 (Node 24, the version CI runs; ≥ 20.9 works).
- `npm run build` — production build + full typecheck (use this as the check).
- `npm run lint` — ESLint.
- `npm run test:unit` — Vitest, the pure-logic unit suite (see "Testing" below).
- `npm run test:unit:watch` — same, in watch mode.
- `npm test` — Playwright end-to-end suite (`tests/`). `npm run test:ui` /
  `test:headed` / `test:debug` / `test:report` are the usual Playwright variants.
- `npm run db:migrate` — `prisma migrate dev` (local `file:` DB). **After a
  migration, restart `npm run dev`** — the running server caches the old generated
  client and will throw validation errors on new fields until bounced.
- `npm run db:seed` — seed user + default groups/categories (reads
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- `npm run db:copy-to-turso` — one-off copy of one account's rows (`ADMIN_EMAIL`)
  from `prisma/dev.db` into the DB that `DATABASE_URL`/`TURSO_DATABASE_URL` names,
  for going live with existing data; plain SQL, target must be empty, `--dry-run`
  and `--replace` flags. Steps in DEPLOYMENT.md Part 5a.
- `npm run db:studio` — Prisma Studio.

### Key implementation facts
- **Prisma 7 specifics**: no `url` in `schema.prisma` (connection is in
  `prisma.config.ts` via `datasource.url`); runtime uses the **libSQL driver
  adapter** (`lib/prisma.ts`), Rust-engine-free. Compound-unique where-keys are
  named like `userId_year_month`.
- **SQLite has no enums** — `kind`/`status`/`frequency`/`direction` are `String`
  columns backed by `lib/constants.ts` + zod (`lib/validations.ts`).
- **Money math**: the pure arithmetic (`summarizeMonthCash`) lives in
  `lib/cash-math.ts` — zero imports, zero I/O, and the thing to change first (and
  cover with a `lib/__tests__` case) if a cash-total looks wrong. `lib/cash.ts`
  (`computeMonthSummary`) is just the DB-fetching shell around it.
- **Recurring generation**: the due-month test (`isDueMonth`) is pure and lives in
  `lib/month.ts`; `lib/recurring.ts`'s `ensureRecurringTransactionsGenerated` is
  the DB-touching shell around it, called from `app/(app)/layout.tsx`.
- **Auth** is split: `lib/auth.config.ts` (edge-safe, used by `proxy.ts`) +
  `lib/auth.ts` (Node, Credentials+bcrypt).
- **Routes** (all under `app/(app)/`): `/` dashboard, `/known`, `/expenses`,
  `/people`, `/funds`, `/history`, `/recurring`, `/categories`; `/login` is
  public. Middleware is `proxy.ts` (Next 16 renamed `middleware`→`proxy`).
- The recurring-templates screen is split under
  `app/(app)/recurring/components/` (shared types/styles in `shared.ts`, icons,
  form fields, `StatusBadge`, `CreateForm`, `TemplateRow`) — `RecurringManager.tsx`
  is just the composition root. If a screen file is approaching ~500 lines,
  prefer this pattern (a `components/` subfolder colocated with the route) over
  letting it keep growing.
- Credentials never live in the repo. Local dev: `ADMIN_EMAIL`/`ADMIN_PASSWORD` in
  the gitignored `.env`, consumed by `npm run db:seed`. E2E/CI: the fixed,
  obviously-fake account in `tests/helpers/test-data.ts`, mirrored in `ci.yml`.
  Production: set at seed time, must differ from both. The repo is public.
  Re-running the seed with a new `ADMIN_PASSWORD` rotates the password — the only
  way to, since there is no change-password screen.
- **Line endings**: the repository is LF throughout (`git ls-files --eol` shows
  `i/lf` for every text file). On Windows `core.autocrlf=true` checks some files
  out as CRLF and normalizes them back on commit, so git's "LF will be replaced
  by CRLF" warnings are harmless. Write LF; don't add CRLF deliberately.

## What This Project Is

**ATLAS** (**A**daptive **T**racking & **L**edger **A**nalysis **S**ystem) is a
personal finance tracker (single user for v1) for logging expense/income
transactions and planning a monthly budget, accessed from multiple devices via a
hosted web app. "Adaptive" refers to the budget pre-fill feature, which bases next
month's plan on last month's actuals.

## Source-of-truth docs (read before implementation)
- **[PRD.md](PRD.md)** — requirements, feature scope, rationale.
- **[DESIGN.md](DESIGN.md)** — **authoritative** data model (Prisma schema), money
  model, and screen designs. Reflects the user's real plan-then-reconcile
  workflow.
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** — scaffolding, Turso, Auth,
  folder structure, recurring-generation, deployment. **Its §2 (schema) and §9
  (build order) are superseded by DESIGN.md** — use DESIGN.md for those.
- **[API.md](API.md)** — the mutation surface (every Server Action: fields,
  validation, effect, what it revalidates), the shared read helpers, the one HTTP
  route, and the conventions all of them follow. Read it before adding or
  changing an action.
- **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)** — verified problems with a workaround in
  place, and deliberately deferred fixes. **Skim it before starting work.** If
  your task touches a listed item, fix it or update the entry in the same
  commit; if you park a fix (an exclusion, a `.skip`, a workaround), add an
  entry in the same commit as the workaround. Its rules are in the file itself.

Don't duplicate the content of those docs here.

## Docs are part of the change

If your change makes any statement in a doc untrue, fix that doc **in the same
commit**. Never leave a note saying a doc is outdated — fix the doc. Cheap
self-check before you finish: grep the `*.md` files for the names you touched
(function, route, npm script, env var, screen, category kind); if one appears,
re-read that passage and decide whether it still holds.

Which doc owns what:

| If you change… | Update |
|---|---|
| Prisma schema, data model, money model | DESIGN.md (authoritative — snippets **and** the ER diagram); the "Data Model" summary here |
| A Server Action, a validation schema, a `lib/` read helper, or an auth/route change | API.md (the action tables, Reads, HTTP routes) |
| The cash formula (`lib/cash-math.ts`) or recurring generation | "Key Architectural Decisions" here; UI_DESIGN_GUIDE.md §7; DESIGN.md "Per-month math"; the header comment in `lib/cash-math.ts`; a case in `lib/__tests__/` |
| A screen's behaviour, the app shell (nav, header, theme), or a user-facing workflow | DESIGN.md "Screens" / "Navigation & theme"; USER_GUIDE.md |
| Visual tokens, typography, number formatting | UI_DESIGN_GUIDE.md; the "UI / visual spec" summary here |
| npm scripts, file layout, routes, auth wiring | "Commands" and "Key implementation facts" here |
| Env vars or deploy steps | DEPLOYMENT.md; the `env:` block of the `e2e` job in `.github/workflows/ci.yml` |
| Test setup or which suites exist | "Testing" and "CI" here; KNOWN_ISSUES.md if coverage is parked |
| Feature scope (what's in v1, what's deferred) | PRD.md |
| A fix you're parking (an exclusion, a `.skip`, a workaround) | KNOWN_ISSUES.md — its rules are in the file |

README.md is the public front door: what the app is, the money model in brief, the
stack, a fresh-clone quick-start, and the doc map. Update it when the stack, the
local setup steps, the test suites, or the set of docs changes — but keep detail
in the owning doc (DEPLOYMENT.md for deploying, AGENTS.md for conventions) and
link to it rather than duplicating.

## Confirmed Tech Stack (from PRD.md §8)

- **Next.js + TypeScript** — single app. Server Components read, Server Actions
  mutate; the only HTTP route is Auth.js's (see API.md).
- **Tailwind CSS** for styling.
- **Prisma + Turso** (hosted SQLite-compatible DB) for persistence.
- **Auth.js (NextAuth)** with a Credentials provider, backed by a `User` table
  (email + bcrypt password hash) and session cookies.
- **Hosting: Vercel free tier.**

Currency is fixed to INR (₹); no multi-currency support. Cost constraint: keep the
stack on free tiers wherever possible — avoid introducing paid infra (this is also
why the unit suite is Vitest with zero extra runtime services, not something that
needs a database).

## Key Architectural Decisions to Preserve

- **Single-user now, multi-user-ready later:** a real `User` table with hashed
  passwords and session-based auth is used even though v1 has exactly one user
  row. Don't replace this with a shared-password/env-var shortcut — the whole
  point is that v2 multi-user support should only require adding rows + ownership
  columns, not a rewrite of auth.
- **Plan-then-reconcile workflow:** known expenses are *planned* line items with a
  `status` (pending/paid/skipped) that the user ticks off — not just after-the-fact
  logging. Discretionary spends are logged as `paid` directly. Don't collapse this
  back into a flat "all transactions already happened" model.
- **Recurring transactions are templates, not cron-copied rows:** a
  `RecurringTransaction` template generates `Transaction` rows each month (as
  `pending` for known/savings items), linked back via `recurringSourceId`.
  Generated transactions are then independently editable. Generation is **lazy
  (on page load), not a cron job.**
- **Discretionary budget is a manual cap, not the cash math:** the monthly budget
  is a self-imposed discretionary spending target (pre-filled from last month's
  discretionary actual), shown as spent/cap. It does not feed the cash
  calculation.
- **Person ledger is part of the cash math:** money received from people
  (non-pending) is money-in, money given is money-out.
  `RemainingCash = (income + additional + carryIn + received) − (knownPaid +
  discretionary + given)`, and carries forward to next month. See
  [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md) §7 and `lib/cash-math.ts`'s header
  comment, which states this formula next to the code that implements it.
- **Savings & funds are a snapshot, not cash flow:** the `Fund` list (editable
  balances) is a net-position view only and must not be mixed into the monthly
  remaining-cash math.
- **Money as integer paise:** amounts are `Int` (paise), never `Float`/`Decimal` —
  SQLite has no Prisma `Decimal` support and `Float` risks rounding errors.
- **No raw SQLite file:** the DB is Turso (hosted), not a local `.db` file,
  because Vercel's filesystem is ephemeral and a local SQLite file would not
  survive redeploys.

## Data Model (see DESIGN.md for the authoritative Prisma schema)

`User` (with openingBalance), `CategoryGroup` (2-level, carries kind), `Category`,
`Transaction` (with status), `RecurringTransaction`, `Budget` (discretionary cap),
`Person` + `PersonLedgerEntry`, `Fund` (lightweight savings snapshot). No
multi-currency field, no multi-account/wallet entity in v1; full investment
tracking (returns/history) is v2.

## UI / visual spec

The Dashboard is a single-page **worksheet** (see
[UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md), derived from the approved mockup in
`Mockup designs/`). Muted-teal palette + clay accent, Plus Jakarta Sans, tabular
numerals, **Indian digit grouping** (`1,20,000` not `120,000`), minus sign U+2212
for negatives. Other screens reuse the same tokens/components. The `.dc.html` files are references — do not
port their `support.js` runtime.

## Testing

Two independent suites, deliberately kept from colliding:

- **Unit (`lib/__tests__/*.test.ts`, run via `npm run test:unit`)** — Vitest,
  Node environment, zero external services. These cover pure, DB-free logic only:
  `lib/cash-math.ts` (the cash formula), `lib/month.ts` (date arithmetic,
  `isDueMonth`), `lib/money.ts` (INR formatting). `vitest.config.ts` scopes
  `include` to `lib/**/*.test.ts` so it never touches `tests/`.
- **End-to-end (`tests/*.spec.ts`, run via `npm test`)** — Playwright, page-object
  pattern (`tests/pages/`), against a real dev server + seeded local DB.
  `playwright.config.ts`'s `testDir` is scoped to `tests/` so it never touches
  `lib/__tests__`. `tests/` is part of the build typecheck. Six suites:
  `auth`, `dashboard`, `dashboard-attention`, `navigation`, `recurring`,
  `accessibility`. **No e2e coverage yet** for the expenses, known, people, funds,
  history and categories screens — they have only the few `data-testid`s the
  recurring suite needs. To add a screen: add `data-testid`s (the intended names
  are already in `tests/helpers/selectors.ts`) → write or extend its page object →
  write the spec. `recurring.spec.ts` + `pages/RecurringPage.ts` is the template.
  Conventions the suite relies on: specs that count rows call
  `resetTestUserData()` (`tests/helpers/db.ts`) in `beforeEach`; money strings
  come from `lib/money.ts` via `tests/helpers/test-data.ts`, never reimplemented;
  nav selectors are scoped `:visible` because the shell mounts a desktop and a
  phone nav (`NavComponent.openMore()` handles the phone "More" menu).
  **Run it against a throwaway DB**: the suite resets and seeds whatever
  `DATABASE_URL`/`TURSO_DATABASE_URL` point at, so set both to e.g.
  `file:./prisma/e2e.db` (plus `CI=1`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` = the values
  in `tests/helpers/test-data.ts`) — never run it pointed at your `dev.db`.

When you change money math or recurring-generation logic, add or update a case in
`lib/__tests__/cash-math.test.ts` or `lib/__tests__/month.test.ts` first — they run
in milliseconds with no DB, so there's no excuse to skip them, and a passing build
alone does not catch an arithmetic mistake.

## CI

`.github/workflows/ci.yml` runs install → lint → build → `test:unit` on every PR
and every push to `main`. The Playwright suite runs separately on pushes to
`main` (browser install + a full run is slower and needs a seeded DB, so it's
not on the fast path for every commit).
