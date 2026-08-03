# ATLAS v1 — Technical Implementation Plan

## Context
This plan turns the confirmed [PRD.md](PRD.md) into a concrete build: a hosted Next.js app named **ATLAS** for personal expense tracking and monthly budget planning, single-user for v1 but architected so v2 multi-user doesn't require a rewrite.

> **⚠️ Superseded sections:** the data model in §2 and the build order in §9 below are the *original flat-model* design. They have been **superseded by [DESIGN.md](DESIGN.md)**, which reconciles ATLAS with the user's real plan-then-reconcile workflow (grouped categories, planned-expense checklist with paid/pending/skipped status, carry-forward cash balance, person ledger). **Use DESIGN.md for the authoritative schema, money model, screens, and build order.** §1, §3–§8, and §10 here (scaffolding, Turso, Auth, folder structure, recurring-generation mechanism, seed approach, deployment) remain valid, with the schema/status adjustments noted in DESIGN.md.

## 1. Scaffolding
App Router (not Pages Router) — Server Components for reads, Server Actions for mutations, no API-route boilerplate needed except NextAuth's catch-all route.

```
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
npm install @prisma/client @libsql/client @prisma/adapter-libsql next-auth@beta bcryptjs zod
npm install -D prisma tsx @types/bcryptjs
```
(`next-auth@beta` is confirmed current/correct for Auth.js v5 as of this writing; `bcryptjs` chosen over native `bcrypt` to avoid serverless native-binding issues.)

## 2. Prisma Schema (`prisma/schema.prisma`)
Key decisions:
- **`userId` FK on every model now**, even with one `User` row — the PRD's "v2 multi-user shouldn't need a rewrite" requirement means every query gets scoped by `session.user.id` from day one.
- **Money stored as `Int` paise**, not `Float`/`Decimal` (SQLite has no `Decimal` support in Prisma; `Float` risks rounding errors).
- **`year`/`month` as separate `Int` columns** (on `Budget` and `RecurringTransaction.lastGeneratedYear/Month`), not a combined `"YYYY-MM"` string — cleaner to query/filter by year or month independently, and avoids string-parsing in every helper function.
- No cascade delete on `Category` relations (only `User`→children cascade) — deleting a category still referenced by transactions/budgets must fail with a friendly error, not silently orphan history.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum TransactionType { INCOME EXPENSE }
enum RecurrenceFrequency { MONTHLY }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  categories            Category[]
  transactions          Transaction[]
  recurringTransactions RecurringTransaction[]
  budgets               Budget[]
}

model Category {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  type      TransactionType
  isDefault Boolean         @default(false)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  transactions          Transaction[]
  recurringTransactions RecurringTransaction[]
  budgets               Budget[]
  @@unique([userId, name])
  @@index([userId, type])
}

model Transaction {
  id                String                @id @default(cuid())
  userId            String
  user              User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  date              DateTime
  amount            Int
  type              TransactionType
  categoryId        String
  category          Category              @relation(fields: [categoryId], references: [id])
  description       String?
  recurringSourceId String?
  recurringSource   RecurringTransaction? @relation(fields: [recurringSourceId], references: [id])
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  @@index([userId, date])
  @@index([userId, categoryId])
  @@unique([recurringSourceId, date])
}

model RecurringTransaction {
  id                 String              @id @default(cuid())
  userId             String
  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount             Int
  type               TransactionType
  categoryId         String
  category           Category            @relation(fields: [categoryId], references: [id])
  description        String?
  frequency          RecurrenceFrequency @default(MONTHLY)
  isActive           Boolean             @default(true)
  lastGeneratedYear  Int?
  lastGeneratedMonth Int?                // 1-12; both null until first generation
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  generatedTransactions Transaction[]
  @@index([userId, isActive])
}

model Budget {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  year          Int
  month         Int      // 1-12
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id])
  plannedAmount Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([userId, year, month, categoryId])
  @@index([userId, year, month])
}
```

The `@@unique([recurringSourceId, date])` on `Transaction` is the DB-level duplicate guard for recurring generation (§6) — SQLite treats each `NULL` as distinct, so manual transactions never collide with each other.

## 3. Turso + Prisma Connection
User creates the Turso account/database themselves (turso.tech dashboard). One database (`atlas`) used for both dev and prod — solo project, no need for environment split.

Env vars (`.env`, gitignored):
```
DATABASE_URL="libsql://atlas-<org>.turso.io?authToken=<token>"
TURSO_DATABASE_URL="libsql://atlas-<org>.turso.io"
TURSO_AUTH_TOKEN="<token>"
```

`lib/prisma.ts` — `@prisma/adapter-libsql` + `@libsql/client`, with the standard `globalThis` singleton pattern to survive Next.js dev-mode hot reload.

Migrations run locally against the real Turso DB (`npx prisma migrate dev`), deployed manually via `npx prisma migrate deploy` before pushing schema-dependent code — not wired into the Vercel build, to avoid every build mutating the one production DB. Vercel's `postinstall` only runs `prisma generate`.

## 4. Auth.js (Credentials + JWT sessions)
- **JWT session strategy** — no `@auth/prisma-adapter`, no DB round-trip per request; Credentials provider doesn't need database sessions.
- `lib/auth.ts`: Credentials provider `authorize()` looks up `User` by email, verifies with `bcrypt.compare`.
- `app/api/auth/[...nextauth]/route.ts`: re-exports handlers.
- `middleware.ts`: protects all routes except `/login`, `/api/auth/*`, static assets.
- **No public signup page** — single v1 user is created via `prisma/seed.ts` (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, upserts the one `User` row + seeds default categories). A public signup route on an internet-facing single-user app is unnecessary attack surface.

## 5. Folder Structure
```
app/
  login/page.tsx, actions.ts
  (app)/layout.tsx            # authenticated shell; calls ensureRecurringTransactionsGenerated(userId)
  (app)/page.tsx               # Dashboard
  (app)/transactions/page.tsx, actions.ts
  (app)/categories/page.tsx, actions.ts
  (app)/recurring/page.tsx, actions.ts
  (app)/budgets/page.tsx, plan/page.tsx, actions.ts
  (app)/history/page.tsx
  api/auth/[...nextauth]/route.ts
lib/
  prisma.ts, auth.ts, recurring.ts, budget.ts, money.ts, month.ts, validations.ts
components/
  ui/ (Button, Input, Select, Modal, ProgressBar)
  TransactionForm.tsx, TransactionList.tsx, CategoryForm.tsx, BudgetForm.tsx,
  BudgetProgressCard.tsx, DashboardSummary.tsx, MonthSwitcher.tsx, CategoryTrendChart.tsx
prisma/
  schema.prisma, seed.ts
middleware.ts
```
Server Actions for all mutations (colocated with the page, built-in origin-check CSRF protection); Route Handlers only where NextAuth requires one.

## 6. Recurring Transactions — Lazy Generation on Page Load
**No Vercel Cron.** For a low-traffic personal app, "generate this month's rent transaction next time I open the app" is functionally equivalent to a scheduled job, without the extra moving parts (secret-protected endpoint, schedule config, free-tier invocation caps).

`lib/recurring.ts`, called once per request from `(app)/layout.tsx`: for each active `RecurringTransaction`, walk a `{year, month}` cursor from one month after `{lastGeneratedYear, lastGeneratedMonth}` (or the current `{year, month}` if never generated — don't backfill retroactively from creation date) up through the current `{year, month}`, creating a `Transaction` + updating `lastGeneratedYear`/`lastGeneratedMonth` in one `prisma.$transaction`. Catches unique-constraint errors on `@@unique([recurringSourceId, date])` as a no-op (already generated — handles races between concurrent requests). This also correctly backfills months missed if the app wasn't opened for a while. `lib/month.ts` provides `addMonths({year, month}, n)` and `compareMonth(a, b)` helpers to keep this arithmetic (month rollover past 12) in one place.

## 7. Budget Pre-fill
`lib/budget.ts`: `getLastMonthActualsByCategory(userId, {year, month})` — `prisma.transaction.groupBy` on the prior `{year, month}`'s date range, summed by `categoryId`. `budgets/plan/page.tsx` renders one input per category pre-filled with that map's value (or 0), purely as an editable starting point — no forecasting. Save = `prisma.budget.upsert` per row on `@@unique([userId, year, month, categoryId])`.

## 8. Seed Data
`prisma/seed.ts` seeds default categories (Income/Salary, Groceries, Rent, Transport, Utilities, Entertainment) with `isDefault: true` for the one seeded user. `isDefault` is informational only — deletion is blocked by the FK restrict behavior in §2, not by an `isDefault` check.

## 9. Build Order
1. Scaffold + DB + seed + Auth.js + `/login` → protected empty dashboard shell.
2. Transactions CRUD (list/filter/add/edit/delete).
3. Categories CRUD + friendly FK-restrict error handling.
4. Budgets: current-month view + plan-next-month pre-fill.
5. Dashboard: totals + budget progress + quick-add.
6. Recurring transactions: template CRUD + lazy generation wired into layout.
7. History/Reports: month switcher + category trend.
8. Deploy: Vercel + Turso, verify from a second device.

## 10. Deployment
User-performed account/sign-up steps (require the user's own accounts — not something Claude does on their behalf):
1. Turso account + `atlas` database (already needed for §3).
2. Push repo to GitHub (user's account).
3. Vercel account, import the GitHub repo (auto-detects Next.js).
4. Set Vercel env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET` (`npx auth secret`), `AUTH_URL`. No `DATABASE_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` needed in Vercel (migrations + seed run locally against Turso).
5. `package.json` `"postinstall": "prisma generate"`.
6. Before pushing schema changes: run `npx prisma migrate deploy` locally first.
7. Verify from a phone browser post-deploy (multi-device requirement).

## Verification
- After Phase 1: log in with seeded credentials, land on empty dashboard; confirm `middleware.ts` redirects unauthenticated requests to `/login`.
- After each subsequent phase: exercise the new CRUD/flow end-to-end in the browser (add/edit/delete, filters, budget pre-fill values match last month's actual transaction sums, recurring template produces exactly one transaction per month with no duplicates across repeated page loads).
- After deploy: load the Vercel URL from a phone browser, confirm login + dashboard + adding a transaction all work against the live Turso DB.

## Critical Files
- `prisma/schema.prisma`, `prisma/seed.ts`
- `lib/prisma.ts`, `lib/auth.ts`, `lib/recurring.ts`, `lib/budget.ts`
- `middleware.ts`
