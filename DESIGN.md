# ATLAS — Model & UI/UX Design

> Reconciles ATLAS with the user's real-world Notion expense-tracking workflow (a **plan-then-reconcile** system, not simple after-the-fact logging). This design supersedes the flat-model assumptions in the original [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §2 and §9. Savings/investment snapshot remains a v2 non-goal.

## Confirmed workflow features (v1)
Grouped categories (2-level), planned-expense checklist (paid/pending/skipped), carry-forward cash balance, and a person ledger (e.g. Mummy/Papa).

## Money model (interpretation)
- **"Monthly Budget" is a *manual discretionary cap*** for free/day-to-day spend ("Other Expenses"), pre-filled from last month's discretionary actual, editable. It is a self-imposed target and does **not** enter the cash math.
- **"Remaining cash" is *computed*.**
- **Known expenses are *planned line items*** you tick off as paid, grouped (Savings / EMI / Subscriptions / Misc), committed regardless of the discretionary cap.
- **Carry-forward** = last month's remaining cash becomes this month's opening, seeded once by a starting balance at setup.
- **Person ledger** is a running IOU balance whose entries are part of the cash math (below). An entry can be flagged *pending* to keep it out of the math and the balance until it's settled.

### Per-month math (integrated model — matches the UI mockup, see [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md) §7)
The person ledger **is part of the cash math** (money received from people counts as money-in; money given counts as money-out), not an optional side-tracker:
```
Received      = Σ people entries, dir=RECEIVED, not pending
Given         = Σ people entries, dir=GIVEN,   not pending
MoneyIn       = Income + Additional + CarryIn + Received
KnownPaid     = Σ known/savings line items with status = PAID
Discretionary = Σ discretionary transactions (always logged as PAID)
MoneyOut      = KnownPaid + Discretionary + Given
RemainingCash = MoneyIn − MoneyOut            // "Available cash" on the dashboard; clay-tinted if negative
StillToPay    = KnownPlanned − KnownPaid      // KnownPlanned excludes SKIPPED
SafeToSpend   = RemainingCash − StillToPay    // the dashboard hero figure
Closing       = RemainingCash → becomes next month's CarryIn
```
UI shows `Discretionary spent / cap` (e.g. 4,085/4,000, over-cap flagged) as a separate manual target. The dashboard hero card shows `SafeToSpend` with `StillToPay` as its caption ("after ₹… in planned bills") and `RemainingCash` beneath it as "Available cash".

## Data model (changes vs the original flat schema)
The live schema is [prisma/schema.prisma](prisma/schema.prisma); the snippets below carry the rationale and omit `createdAt`/`updatedAt` and most indexes.

Kinds, statuses and directions. libSQL/SQLite has no enums, so these are `String` columns validated in the app layer (`lib/constants.ts` + `lib/validations.ts`):
```
CategoryKind    = INCOME | KNOWN_EXPENSE | SAVINGS | DISCRETIONARY
TxnStatus       = PENDING | PAID | SKIPPED
LedgerDirection = GIVEN | RECEIVED   // GIVEN = money out to person, RECEIVED = money in
```

**New `CategoryGroup`** (the 2nd level; carries `kind`):
```prisma
model CategoryGroup {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String       // "EMI", "Subscriptions", "Savings", "Other Expenses", "Income"
  kind      String       // CategoryKind
  sortOrder Int          @default(0)
  categories Category[]
  @@unique([userId, name])
}
```

**`Category`:** drop `type`; add `groupId` (kind comes from the group), `sortOrder`, and `isDefault` (set on the seeded starter categories).

**`Transaction`:** drop `type` (derived from `category.group.kind`); add `status String @default("PAID")` + `@@index([userId, status])`, and `recurringSourceId` (nullable link to the template that generated it) with `@@unique([recurringSourceId, date])` so generation is idempotent. Recurring generation creates known/savings items as `PENDING` (appear on the checklist); discretionary entries are `PAID` on creation.

**`Budget`:** one row per user per month (`{ userId, year, month, cap, income, additional }`, unique on `[userId, year, month]`) holding the single **overall discretionary cap** — the mockup's one "Monthly cap" number, not a per-category budget — **plus the editable Money-in figures** (Income and Additional, saved from the dashboard's Money-in card). Absent row or `cap = 0` = no cap (the UI then suggests last month's actual as a placeholder).

**New `Person` + `PersonLedgerEntry`:**
```prisma
model Person {
  id     String  @id @default(cuid())
  userId String
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name   String
  entries PersonLedgerEntry[]
  @@unique([userId, name])
}

model PersonLedgerEntry {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  personId    String
  person      Person          @relation(fields: [personId], references: [id], onDelete: Cascade)
  date        DateTime
  amount      Int             // paise
  direction   String          // LedgerDirection
  description String?
  pending     Boolean         @default(false) // excluded from cash math + balance until settled
  linkedTxnId String?         // UNUSED — nothing sets it; see KNOWN_ISSUES.md
  createdAt   DateTime        @default(now())
  @@index([userId, personId])
}
```
Person balance = Σ(GIVEN) − Σ(RECEIVED) over non-pending entries: positive = they owe you, negative = you owe them, zero = settled. "Mark received" clears `pending` and stamps `date` with the settle time.

**`User`:** add opening balance to seed carry-forward:
```prisma
  openingBalance      Int  @default(0)
  openingBalanceYear  Int?
  openingBalanceMonth Int?
```
Carry-in for a month chains from this seed (compute-on-read is fine at personal scale; cache per month later if needed).

**New `Fund`** (lightweight savings/funds snapshot — v1 per decision D2; full investment tracking with returns/history stays v2):
```prisma
model Fund {
  id        String @id @default(cuid())
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String // "Bike fund", "Mutual funds / stocks (invested)", ...
  balance   Int    @default(0)  // paise; user-editable snapshot value
  sortOrder Int    @default(0)
  @@unique([userId, name])
}
```
Funds are a manually-maintained balance list (name + editable ₹), shown with a total. They are **not** part of the monthly cash math above — they're a net-position snapshot.

**`RecurringTransaction`** (the template behind the Recurring screen):
```prisma
model RecurringTransaction {
  id                 String  @id @default(cuid())
  userId             String
  amount             Int     // paise
  categoryId         String
  description        String?
  intervalMonths     Int     // 1, 2, 3, 4, 6 or 12
  startYear          Int
  startMonth         Int     // 1-12 — first due month
  isActive           Boolean @default(true)
  lastGeneratedYear  Int?
  lastGeneratedMonth Int?    // both null until first generation; the "already caught up" fast check
  @@index([userId, isActive])
}
```
Generation is lazy (`lib/recurring.ts`, called from the authenticated layout and from the recurring actions): for each active template, every due month from `start` — every `intervalMonths` months, `isDueMonth` in `lib/month.ts` — up to the current month gets one `Transaction` with `status = PENDING` and `recurringSourceId` set. The `@@unique([recurringSourceId, date])` on `Transaction` makes re-runs idempotent.

## Screens
> The high-fidelity **visual** spec for the Dashboard (colors, type, components, exact layout) is [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md), derived from the approved mockup. The Dashboard **is the worksheet mockup**; other screens reuse the same design language.

1. **Dashboard (month command-center)** — month switcher; three summary cards: **Money in** (editable Income + Additional with a Save button; carry-in + received shown), **Money out · paid** (known / discretionary / given breakdown), and the **Monthly cash position** hero (**Safe to spend after planned bills**, with **Available cash** = RemainingCash beneath it). Below that, **"This month needs attention"**: pending known bills with inline **Mark paid**, spending-cap status, People and Savings & funds summary tiles, and an **Add expense** shortcut; then next-step links. The full worksheet sections (bucket cards, add-rows, editable funds) live on their own screens, not here.
2. **Expenses (Other spending)** — numbered list for the month (description · category · amount) with an add form and remove; inline **Monthly cap** editor (saves on blur, suggests last month's actual) with a spent/cap bar and a "₹… left" / "₹… over" pill. No date column, filters or edit in v1 — the month switcher is the only filter.
3. **Known Expenses (planned checklist)** — grouped planned items; mark Paid/Pending/Skipped; add ad-hoc planned expense; group subtotals + planned→paid reconciliation.
4. **Recurring Templates** — define recurring known expenses with an interval (1/2/3/4/6/12 months) and a first due month → auto-generate **PENDING** items in each due month (lazy generation); CRUD + pause/resume.
5. **Categories & Groups** — manage the 2-level structure; reorder; seeded defaults; delete blocked if referenced.
6. **People / Ledger** — people with running balances + entry history; add entry (person, amount, Given/Received, description, pending flag) and **Mark received** to settle. **Not yet built:** a date input on entries — today the entry date is stamped server-side at creation (and again on settle), so a payment logged late carries the wrong date.
7. **Savings & funds** — lightweight snapshot: list of funds with editable ₹ balances + total (the Dashboard shows the total only). Backed by the `Fund` model.
8. **History / Reports** — month switcher for any anchor month; **Cash by month** for the last 6 months (in / out / remaining — the carry-forward chain made visible); the anchor month's spend broken down by group.

## Navigation & theme
- **Adaptive nav (`components/Nav.tsx`):** a horizontal link row under the header on desktop; a fixed bottom tab bar on phone with Home · Expenses · Known · People · More (Funds / History / Recurring / Categories).
- **Theme:** follows system light/dark by default, with a manual toggle in the header (`components/ThemeToggle.tsx`). INR ₹ formatting throughout via `lib/money.ts`.
- **Adding a discretionary expense** — the most frequent action — is one tap from the dashboard's **Add expense** button or the Expenses tab; there is no floating quick-add button.

## Revised build order (supersedes IMPLEMENTATION_PLAN.md §9)
1. Scaffold + DB + Auth + login.
2. Groups + Categories (2-level) + seed.
3. Transactions with `status` + discretionary quick-add / Other Expenses screen.
4. Known-expenses checklist (paid/pending/skipped) + group subtotals.
5. Recurring templates → generate PENDING known items.
6. Budget cap (discretionary) + pre-fill.
7. Carry-forward math + Dashboard worksheet (per [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md)).
8. People / ledger (integrated into cash math).
9. Savings & funds snapshot (`Fund` model).
10. History/Reports.
11. Deploy.

## Verification
- Rebuild a real month in the UI (e.g. the Jan 2026 sample): income + additional, known-expense groups with paid/pending/skipped, discretionary spends, a person ledger entry; confirm Remaining cash, discretionary spent/budget, and person balance match hand-calculated values.
- Roll to next month: carry-in equals prior month's remaining cash; active recurring templates appear as PENDING known items.
