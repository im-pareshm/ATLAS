# ATLAS — Adaptive Tracking & Ledger Analysis System — PRD

## Context
This is a greenfield project. The goal is a personal-use app, named **ATLAS** (**A**daptive **T**racking & **L**edger **A**nalysis **S**ystem), to (1) track expenses/income and (2) plan next month's budget. "Adaptive" reflects the budget pre-fill feature (§5.3), which bases next month's plan on last month's actuals. This PRD captures the confirmed requirements before any implementation work begins.

## 1. Problem Statement
The user currently has no structured way to track personal expenses or plan a monthly budget. They want a lightweight, single-user tool to log transactions and compare actual spending against a planned budget, month to month.

## 2. Goals
- Make it fast to log day-to-day expenses/income.
- Support a **plan-then-reconcile** workflow: plan known monthly expenses (grouped) up front, then tick them off as paid — mirroring the user's existing Notion system.
- Give a clear picture of "where did my money go this month" by category and group.
- Track a self-imposed **discretionary budget** (free/day-to-day spend) against actual discretionary spend.
- Carry leftover cash forward month to month (running balance).
- Track money lent to / received from people (a simple per-person IOU ledger).
- Support looking back at prior months to inform future planning.

> The detailed money model, screen designs, and revised data model live in [DESIGN.md](DESIGN.md), which reconciles ATLAS with the user's real Notion tracker. §5–§6 below are the feature-level summary.

## 3. Non-Goals (v1)
- Multi-user support — v1 is single-user; **multi-user is planned for v2** (see §4 for how v1 is designed to make that transition easy).
- Bank/credit-card sync (e.g. Plaid) — no live integrations, confirmed not needed.
- Multi-currency support — confirmed not needed; **INR (₹) only**.
- Native mobile app — this is a web application; a responsive UI covers phone browser access.
- **Full investment tracking** (returns, cost basis, price history, performance) — deferred to **v2**. Note: a *lightweight* savings/funds **snapshot** (a manually-edited list of fund balances + total, per the Notion "Savings by end of month" section) **is in v1** — see §5.3b.

## 4. Target User & Hosting
Single user for v1, but accessed from multiple devices (laptop, phone) — so the app needs to be **hosted**, not just run on localhost. Multi-user support is planned for v2, so v1's auth approach should not require a rewrite to get there.
- **Auth approach (confirmed, forward-compatible):** a real **User** table (email + hashed password) with session-based login, rather than a throwaway env-var passphrase. For v1 there's just one user row (the account you create for yourself), but because a proper User table and login flow already exist, v2 multi-user support is mostly "allow more rows + add ownership columns" rather than a rearchitecture.

## 5. Core Features

### 5.1 Transactions
- Add / edit / delete a transaction: date, amount, category, optional description/note, and a **status** (paid / pending / skipped). Income vs. expense is derived from the category's group kind.
- **Discretionary** spends are logged as paid immediately; **known** expenses can be planned as pending and ticked off as paid (see §5.3).
- List/filter transactions by month, category, or status.
- Entry method: **manual entry only for v1** (confirmed) — CSV import deferred to a future version.

### 5.1a Recurring Transactions
- Define a recurring transaction template: amount, category, description, and frequency (v1 = monthly only, e.g. rent, subscriptions, salary, EMIs).
- Each new month, active recurring templates automatically generate that month's item. Known/savings recurring items are generated as **pending** so they land on the plan-and-pay checklist (§5.3).
- Recurring templates can be edited or deactivated; generated items remain independently editable afterward.

### 5.2 Categories & Groups (2-level)
- Categories are organized into **groups** (e.g. Income, Savings, EMI, Subscriptions, Miscellaneous, Other Expenses). Each group has a *kind*: Income, Known-Expense, Savings, or Discretionary.
- **Predefined starter set + ability to add/edit/delete/reorder your own** (confirmed) — avoids a blank-slate cold start.

### 5.3 Planning, Known Expenses & Discretionary Budget
- **Known-expense checklist:** plan grouped known expenses (rent, EMIs, subscriptions, savings) for the month, then mark each **paid / pending / skipped**. Groups show subtotals and planned→paid reconciliation.
- **Discretionary budget:** a manual monthly cap for free/day-to-day spend ("Other Expenses"), **pre-filled from last month's discretionary actual** and editable. The UI shows discretionary spent vs. this cap, flagging over-budget. This cap is a self-imposed target and is separate from the cash calculation.
- **Carry-forward cash:** leftover cash (remaining after income − paid known expenses − discretionary spend) carries into the next month as opening balance; seeded once by a starting balance at setup.

### 5.3a People / Ledger
- Track money **given to** / **received from** individual people (e.g. family), each with a running balance and history; outstanding balance = "pending".
- The ledger is **part of the monthly cash math**: non-pending *received* counts as money-in, *given* counts as money-out. "Mark received" settles a pending entry.

### 5.3b Savings & Funds (lightweight snapshot)
- A manually-maintained list of savings/funds (e.g. Bike fund, Mutual funds invested, Personal savings), each a **name + editable ₹ balance**, with a total.
- This is a net-position snapshot only — **not** part of the monthly cash flow, and **not** full investment tracking (returns/history are v2).

### 5.4 Dashboard (month command-center)
- Month switcher; summary of carry-in, income, available, known committed (paid/pending), **remaining cash**, and discretionary spent vs. budget.
- Known-expense groups with paid checkboxes and subtotals; recent discretionary spends with budget bar; people balances; quick "add expense" entry point.

### 5.5 History / Reports
- Switch between months to view any past month's full picture (transactions, known-expense reconciliation, budget-vs-actual, carry-forward chain).
- Simple trend view: spending per category/group over the last N months.

## 6. Data Model (high-level)
See [DESIGN.md](DESIGN.md) for the full Prisma schema. High-level entities:
- **User**: id, email, passwordHash, openingBalance (seeds carry-forward) — one row in v1; the table exists from day one so v2 multi-user just adds rows + ownership columns elsewhere.
- **CategoryGroup**: id, name, kind (Income/Known-Expense/Savings/Discretionary), sortOrder
- **Category**: id, groupId, name, isDefault, sortOrder (kind derived from its group)
- **Transaction**: id, date, amount, categoryId, description, status (pending/paid/skipped), recurringSourceId (nullable)
- **RecurringTransaction**: id, amount, categoryId, description, frequency, isActive, lastGenerated{Year,Month}
- **Budget**: id, year, month, cap (a single overall discretionary cap per month)
- **Person** + **PersonLedgerEntry**: person-to-person IOU tracking (amount, direction given/received, optional link to a cash transaction)
- **Fund**: lightweight savings/funds snapshot (name, editable balance, sortOrder)

(No Account/multi-wallet entity in v1 — single implicit account. Currency is fixed to INR — no currency field. Amounts stored as integer paise.)

## 7. Non-Functional Requirements
- **Hosted** on the public internet so it's reachable from any device (laptop, phone) — not just localhost.
- Protected by login (see §4) since it's internet-accessible — single user in v1, but built on a real User table so it's not a dead end for v2.
- Data persisted durably (survives redeploys/restarts) via a hosted database, not an ephemeral/in-memory store.
- Responsive UI — usable on both desktop and phone browsers.
- Cost: **$0 or as close to it as possible** — this is a personal project, avoid paid infra.

## 8. Tech Stack (confirmed)
- **Next.js + TypeScript** — frontend + API routes in one app, deploys straightforwardly to a free host.
- **Tailwind CSS** for styling.
- **Hosting: Vercel free tier** — native Next.js support, no server to manage.
- **Database: Prisma + Turso** (hosted SQLite-compatible DB, generous free tier, works well with serverless/edge hosts like Vercel — unlike raw SQLite files, which don't survive on Vercel's ephemeral filesystem).
- **Auth: Auth.js (NextAuth) with a Credentials provider**, backed by the `User` table (email + hashed password via bcrypt) and session cookies — a real login screen, but only one account for now. Chosen because it's a standard, well-supported library that already knows how to handle multiple users, so v2 doesn't require swapping auth systems.

## 9. Decisions Log
1. Manual entry only for v1 — CSV import deferred.
2. Discretionary budget is a manual monthly cap, pre-filled from last month's discretionary actual.
3. Categories: predefined starter set + user-extendable, organized into 2-level groups.
4. Access gate: real login via User table + Auth.js, single account for v1, multi-user-ready for v2.
5. Hosting/DB pairing: Vercel + Turso.
6. Reconciled with the user's real Notion workflow → added grouped categories, planned-expense checklist (paid/pending/skipped), carry-forward cash balance, and a person ledger to v1 (see [DESIGN.md](DESIGN.md)).
7. High-fidelity mockup adopted (see [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md)); the worksheet is the Dashboard screen within the multi-screen app (nav retained — decision D1).
8. Person ledger is integrated into the monthly cash math (received = money-in, given = money-out — decision D3).
9. Lightweight savings/funds snapshot is **in v1** (decision D2); full investment tracking (returns/history) remains v2.

## 10. Out of Scope for This PRD
Technical implementation details (file structure, API route design, component breakdown, DB migrations) are covered in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); the money model and screen designs are in [DESIGN.md](DESIGN.md).
