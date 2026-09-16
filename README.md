# ATLAS — Adaptive Tracking & Ledger Analysis System

[![CI](https://github.com/im-pareshm/ATLAS/actions/workflows/ci.yml/badge.svg)](https://github.com/im-pareshm/ATLAS/actions/workflows/ci.yml)

A personal monthly money worksheet. Most finance apps log transactions after the
fact; ATLAS is built around how a month is actually run: **plan what's due, tick
it off as you pay, keep casual spending under a cap, and always know the one number
that matters — the cash you can still spend.**

Single-user, Indian Rupees, works on a laptop and a phone browser. Built to replace
a hand-maintained Notion worksheet.

## The idea

Money going out of a month comes in three kinds, and ATLAS treats each differently:

| Kind | Examples | How you handle it |
|---|---|---|
| **Known expenses** | Rent, EMIs, subscriptions, SIP/savings | Planned up front, then **ticked off as paid** — an unpaid bill shows as "still to pay", not as money already gone |
| **Discretionary** | Food, transport, shopping | Logged as you spend, against a self-imposed **monthly cap** (pre-filled from last month's actual — the "adaptive" part) |
| **People** | Money lent to / borrowed from family and friends | A running IOU balance per person, folded into the cash math |

Income and one-off extras are money in; whatever is left rolls into next month as
carry-in. The dashboard's hero number is **Safe to spend after planned bills**:

```
Money in        = Income + Additional + Carry-in + Received from people
Money out       = Known expenses PAID + Discretionary + Given to people
Remaining cash  = Money in − Money out            → next month's carry-in
Safe to spend   = Remaining cash − still to pay   → the hero figure
```

The cap never enters that math; it's a target, not a deduction. Savings and
investment balances are tracked as a separate snapshot ("Funds") and never touch
monthly cash flow.

## Screens

- **Dashboard** — money in / money out / cash position cards, then "this month
  needs attention": pending bills with one-click *Mark paid*, cap status, people
  and funds summaries.
- **Known** — the plan-then-pay checklist, grouped into buckets (Savings, EMI &
  loans, Subscriptions, …) with paid-of-planned progress per bucket.
- **Expenses** — discretionary spend for the month, the cap editor, and a
  spent-vs-cap bar that turns clay when you're over.
- **People** — per-person ledger with pending entries and *Mark received*.
- **Funds** — editable savings/investment balances with a total.
- **Recurring** — templates that generate their bill every 1/2/3/4/6/12 months;
  generation is lazy (on page load), backfills missed months, and is idempotent.
- **History** — six months of in/out/remaining with the carry-forward chain, and
  the selected month's spend by group.
- **Categories** — the two-level group → category structure the rest hangs off.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack), TypeScript, React 19 |
| Styling | Tailwind CSS v4, Plus Jakarta Sans, tabular numerals, Indian digit grouping |
| Data | [Prisma 7](https://www.prisma.io) over libSQL — a local SQLite file in development, [Turso](https://turso.tech) in production |
| Auth | [Auth.js v5](https://authjs.dev) credentials provider, bcrypt, JWT sessions |
| Validation | Zod |
| Tests | Vitest (pure logic), Playwright (end-to-end) |
| Hosting | Vercel + Turso — see [DEPLOYMENT.md](DEPLOYMENT.md) |

## Architecture notes

A few decisions worth knowing before reading the code:

- **No REST API.** Server Components read Prisma directly; all mutations are Server
  Actions colocated with their screen (30 of them, catalogued in [API.md](API.md)).
  The only HTTP route is Auth.js's.
- **Money is integer paise**, end to end. Forms post rupees; actions convert once;
  nothing stores a float.
- **The cash formula is pure and unit-tested.** `lib/cash.ts` fetches aggregates
  and hands them to `lib/cash-math.ts`, which has no I/O. Carry-in is computed from
  an opening balance plus the net of every prior month — there is no stored monthly
  closing balance to drift.
- **Recurring generation is lazy and idempotent.** It runs on every authenticated
  render; a unique index on `(template, date)` makes re-runs safe, and a per-template
  cursor makes the no-op case one cheap read.
- **Every table carries `userId`**, and every mutation re-checks ownership by id,
  even though v1 has one user — so multi-user is a feature, not a rewrite.
- SQLite has no enums, so kinds/statuses are `String` columns validated in the app
  layer (`lib/constants.ts`, `lib/validations.ts`).

## Running it locally

Prerequisites: Node.js (CI runs 24; Next 16 needs ≥ 20.9) and npm.

```bash
git clone https://github.com/im-pareshm/ATLAS.git
cd ATLAS
npm install                 # also runs `prisma generate`

cp .env.example .env        # then edit: set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
                            # (the DB defaults point at a local SQLite file — no account needed)

npm run db:migrate          # creates prisma/dev.db and applies migrations
npm run db:seed             # creates your login + the starter category groups
npm run dev                 # http://localhost:3000
```

Generate `AUTH_SECRET` with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Re-running `npm run db:seed` with a new `ADMIN_PASSWORD` rotates the password;
there is no change-password screen.

## Tests

```bash
npm run test:unit           # Vitest — the cash formula, month arithmetic, INR formatting; milliseconds, no DB
npm test                    # Playwright — 58 tests across auth, dashboard, navigation, recurring, accessibility
```

The end-to-end suite **resets and re-seeds whatever database the environment points
at**. Never run it against your `dev.db`; point `DATABASE_URL` and
`TURSO_DATABASE_URL` at a throwaway file first. AGENTS.md "Testing" has the exact
incantation. CI runs the unit suite on every PR and the e2e suite on every push to
`main`.

## Documentation

| Doc | What it's for |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | How to use the app, screen by screen |
| [PRD.md](PRD.md) | Requirements and scope (what's v1, what's deferred) |
| [DESIGN.md](DESIGN.md) | The money model, the data model with an ER diagram, and the screens as built |
| [API.md](API.md) | Every Server Action, the read helpers, and the conventions they share |
| [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md) | Visual spec: palette, type, components, the dashboard layout |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step Vercel + Turso deployment |
| [AGENTS.md](AGENTS.md) | Working conventions for contributors and coding agents: commands, architecture decisions to preserve, testing, which doc owns what |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Verified problems that are parked, with a fix plan each |

## Status

v1 is feature-complete. Open items:

- End-to-end coverage exists for auth, dashboard, navigation, recurring and
  accessibility. The expenses, known, people, funds, history and categories
  screens have none yet (their money math is unit-tested; the screens themselves
  are not).
- Deferred to v2 (see PRD.md): full investment tracking (returns, cost basis,
  price history) and CSV import. Multi-currency is out of scope by decision.
