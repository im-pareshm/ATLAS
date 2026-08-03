# ATLAS — Model & UI/UX Design

> Reconciles ATLAS with the user's real-world Notion expense-tracking workflow (a **plan-then-reconcile** system, not simple after-the-fact logging). This design supersedes the flat-model assumptions in the original [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) §2 and §9. Savings/investment snapshot remains a v2 non-goal.

## Confirmed workflow features (v1)
Grouped categories (2-level), planned-expense checklist (paid/pending/skipped), carry-forward cash balance, and a person ledger (e.g. Mummy/Papa).

## Money model (interpretation)
- **"Monthly Budget" is a *manual discretionary cap*** for free/day-to-day spend ("Other Expenses"), pre-filled from last month's discretionary actual, editable. It is a self-imposed target and does **not** enter the cash math.
- **"Remaining cash" is *computed*.**
- **Known expenses are *planned line items*** you tick off as paid, grouped (Savings / EMI / Subscriptions / Misc), committed regardless of the discretionary cap.
- **Carry-forward** = last month's remaining cash becomes this month's opening, seeded once by a starting balance at setup.
- **Person ledger** is a running IOU balance; an entry can *optionally* also be a cash movement.

### Per-month math (integrated model — matches the UI mockup, see [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md) §7)
The person ledger **is part of the cash math** (money received from people counts as money-in; money given counts as money-out), not an optional side-tracker:
```
Received      = Σ people entries, dir=RECEIVED, not pending
Given         = Σ people entries, dir=GIVEN,   not pending
MoneyIn       = Income + Additional + CarryIn + Received
KnownPaid     = Σ known/savings line items with status = PAID
Discretionary = Σ discretionary transactions (always logged as PAID)
MoneyOut      = KnownPaid + Discretionary + Given
RemainingCash = MoneyIn − MoneyOut            // the hero figure; clay-tinted if negative
StillToPay    = KnownPlanned − KnownPaid      // KnownPlanned excludes SKIPPED/cancelled
Closing       = RemainingCash → becomes next month's CarryIn
```
UI shows `Discretionary spent / budget` (e.g. 4,085/4,000, over-budget flagged) as a separate manual target, and `StillToPay` as the "still to pay" pill on the hero card.

## Data model (changes vs the original flat schema)
New enums:
```prisma
enum CategoryKind    { INCOME KNOWN_EXPENSE SAVINGS DISCRETIONARY }
enum TxnStatus       { PENDING PAID SKIPPED }
enum LedgerDirection { GIVEN RECEIVED }   // GIVEN = money out to person, RECEIVED = money in
```

**New `CategoryGroup`** (the 2nd level; carries `kind`):
```prisma
model CategoryGroup {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String       // "EMI", "Subscriptions", "Savings", "Other Expenses", "Income"
  kind      CategoryKind
  sortOrder Int          @default(0)
  categories Category[]
  @@unique([userId, name])
}
```

**`Category`:** drop `type`; add `groupId` (kind comes from the group) + `sortOrder`.

**`Transaction`:** drop `type` (derived from `category.group.kind`); add `status TxnStatus @default(PAID)` + `@@index([userId, status])`. Recurring generation creates known/savings items as `PENDING` (appear on the checklist); discretionary entries are `PAID` on creation.

**`Budget`:** a single **overall discretionary cap per month** (`{ userId, year, month, cap }`, unique on `[userId, year, month]`) — matches the mockup's one "Monthly cap" number, not a per-category budget. Absent row = no cap (the UI then suggests last month's actual).

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
  direction   LedgerDirection
  description String?
  linkedTxnId String?         // optional: this entry is also a cash movement
  createdAt   DateTime        @default(now())
  @@index([userId, personId])
}
```
Person balance = Σ(RECEIVED) − Σ(GIVEN); outstanding balance = "pending".

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

## Screens
> The high-fidelity **visual** spec for the Dashboard (colors, type, components, exact layout) is [UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md), derived from the approved mockup. The Dashboard **is the worksheet mockup**; other screens reuse the same design language.

1. **Dashboard (worksheet / month command-center)** — the mockup worksheet: month switcher; summary strip (Money in · Money out · **Remaining cash** hero with "still to pay" pill); Known Expenses bucket cards with paid checkboxes, cancel/restore, progress + subtotals; Other Spending card (inline cap, add-row); People ledger (given/received, mark-received); **Savings & funds** snapshot (editable balances + total).
2. **Other Expenses / Transactions** — table (date · description · category · amount), running total vs budget, inline/modal add, month/category filters, edit/delete.
3. **Known Expenses (planned checklist)** — grouped planned items; mark Paid/Pending/Skipped; add ad-hoc planned expense; group subtotals + planned→paid reconciliation.
4. **Recurring Templates** — define recurring known expenses → auto-generate **PENDING** items each month (lazy generation); CRUD + activate/deactivate.
5. **Categories & Groups** — manage the 2-level structure; reorder; seeded defaults; delete blocked if referenced.
6. **Budget Planning** — set discretionary cap per category for the month, pre-filled from last month's actual.
7. **People / Ledger** — people with running balances + entry history; add entry (person, amount, Given/Received, date, optional "also a cash transaction").
8. **Savings & funds** — lightweight snapshot: list of funds with editable ₹ balances + total (also embedded on the Dashboard). Backed by the `Fund` model.
9. **History / Reports** — month switcher for any past month; carry-forward chain; category-trend bars over last N months.

## Navigation & theme
- **Adaptive nav:** left sidebar on desktop, bottom tab bar on phone. Tabs: Dashboard · Expenses · Known · People · More (Recurring / Categories / Budget / Funds / History).
- **Theme:** follow system light/dark. INR ₹ formatting throughout via `lib/money.ts`.
- **Quick-add (FAB)** for discretionary expenses from any screen — the most frequent action.

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
