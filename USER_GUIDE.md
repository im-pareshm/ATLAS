# ATLAS — User Guide

**ATLAS** (Adaptive Tracking & Ledger Analysis System) is your personal monthly money worksheet. Unlike apps that just log transactions after the fact, ATLAS is built around how you actually run a month: **plan what's due, tick it off as you pay, keep casual spending under a cap, and always know the one number that matters — the cash you have left.**

Everything is in Indian Rupees (₹), single-user, and works on your laptop and phone browser.

---

## Table of contents
1. [The big idea](#1-the-big-idea)
2. [How "Remaining cash" is calculated](#2-how-remaining-cash-is-calculated)
3. [Signing in](#3-signing-in)
4. [The screens](#4-the-screens)
   - [Dashboard](#dashboard)
   - [Known expenses](#known-expenses)
   - [Expenses (Other spending)](#expenses-other-spending)
   - [People](#people)
   - [Funds](#funds)
   - [History](#history)
   - [Recurring](#recurring)
   - [Categories](#categories)
5. [Typical monthly workflow](#5-typical-monthly-workflow)
6. [Good to know / FAQ](#6-good-to-know--faq)

---

## 1. The big idea

Your money in a month has three kinds of outflow, and ATLAS treats each differently:

| Type | What it is | Where you manage it | How you handle it |
|---|---|---|---|
| **Known expenses** | Bills you know are coming — rent, EMIs, subscriptions, SIP/savings | **Known** screen | Plan them, then **tick each off as paid** |
| **Discretionary** | Day-to-day casual spend — food, transport, shopping | **Expenses** screen | Log as you spend, kept under a **monthly cap** |
| **People** | Money given to / received from family & friends | **People** screen | Track a running IOU balance |

On top of that:
- **Income** (salary + anything extra) is money in.
- **Carry-forward**: whatever cash is left at the end of a month rolls into the next month automatically.
- **Funds** (savings/investment balances) are tracked as a separate snapshot — they don't affect your monthly cash.

The whole point is the dashboard's hero number: **Safe to spend** — the cash you have
left after the planned bills you haven't paid yet.

---

## 2. How "Remaining cash" is calculated

```
Money in   = Income + Additional + Carry-in (last month's leftover) + Received from people
Money out  = Known expenses PAID + Discretionary spent + Given to people
Remaining cash = Money in − Money out
```

Two things that are deliberately **not** in this formula:
- The **discretionary cap** (e.g. ₹4,000) is a *self-imposed target* for casual spending, shown as "spent / cap". It's there to keep you honest — it doesn't reduce your cash by itself.
- **Funds** (savings/investments) are a net-worth snapshot, separate from monthly cash flow.

Also useful: **"still to pay"** = known expenses you've planned but not yet ticked off as paid.

The dashboard's big number, **Safe to spend after planned bills**, is Remaining cash minus
"still to pay" — what you can spend without touching money already earmarked for bills.
**Available cash**, shown underneath it, is Remaining cash itself.

> Only expenses you mark **paid** reduce your cash. A planned-but-unpaid bill shows up as "still to pay", not as money already gone.

---

## 3. Signing in

ATLAS is single-user and private. Open the app and sign in with your email and password on the login screen. There's no public sign-up — your account is created once during setup.

Use **Sign out** (top-right) when you're done on a shared device. The theme button next to
it switches between light and dark; by default ATLAS follows your device's setting.

---

## 4. The screens

On a laptop, navigation is the row of links under the ATLAS logo. On a phone it's the bar
along the bottom of the screen — **Home · Expenses · Known · People**, plus **More** for
Funds, History, Recurring and Categories. Most screens have a **month switcher**
(‹ July 2026 ›) — use it to move between months; everything on that screen updates to
the month you're viewing.

### Dashboard
Your month at a glance — three cards, then what needs attention.

- **Money in** — type your **Income** and **Additional** (one-off/extra income) into the boxes and click **Save**. "Carry-in + received" (last month's leftover plus money received from people) is calculated for you and shown below.
- **Money out · paid** — total paid out, broken into Known expenses, Discretionary, and Given to people.
- **Monthly cash position** (the big teal card) — the hero number is **Safe to spend after planned bills**: money in minus money out, minus the planned bills you haven't paid yet. **Available cash** below it is plain money in minus money out (your Remaining cash). Either turns a warm clay colour if it goes negative.

**This month needs attention** sits underneath:

- **Planned bills** — your pending known expenses, each with a **Mark paid** button so you can tick them off without leaving the dashboard.
- **Spending cap** — how you're tracking against the discretionary cap (**"₹… left"** or **"₹… over"**), or a prompt to set one.
- **People** and **Savings & funds** tiles — the net balance across people ("owed to you" / "You owe" / "All settled") and your funds total, each linking to its screen.
- **Add expense** jumps straight to logging a discretionary spend.

Quick links at the bottom (pay planned bills, log an expense, set or check the cap) take you to the detailed screens.

### Known expenses
Your plan-then-pay checklist, grouped into buckets (Savings, EMI & loans, Subscriptions, Miscellaneous, etc.). For each bucket you see how much is **paid of planned**, a progress bar, and its line items.

- **Add a planned item**: type a description, pick a category, enter the amount, and **Add item**. It starts as *pending* (planned, not yet paid).
- **Mark it paid**: click the checkbox. The amount now counts toward "Money out" and your Remaining cash drops. Click again to mark it unpaid.
- **Skip / restore** (× / ↺): skipping strikes an item through and removes it from the totals (use it for bills that didn't happen this month). ↺ brings it back.
- **Delete** (the second ×, tooltip "Delete"): removes the item entirely.

Many of these items appear automatically each month from your **Recurring** templates.

### Expenses (Other spending)
Your day-to-day discretionary spending for the month.

- **Add a spend**: pick a category, describe it, enter the amount, **Add**. Each row is numbered; remove one with ✕.
- **Monthly cap**: set your casual-spending target in the "Monthly cap" box (top-right). The total shows as **spent / cap** with a bar and a pill — **"₹… left"** (green) or **"₹… over"** (clay) when you exceed it.
- **Smart suggestion**: if you haven't set a cap for the month, ATLAS suggests last month's actual discretionary spend as a starting point.

### People
Track money between you and individual people (e.g. Mummy, Papa).

- **Add a person**, then add **entries**: choose **Given** (money you gave them) or **Received** (money they gave you), a description, and the amount.
- Each person shows a running balance: **"owes you ₹…"** (they owe you), **"you owe ₹…"**, or **"settled"**.
- **Pending**: tick "pending" when an entry is expected but not settled yet — it's excluded from your cash and balance until you click **Mark received**.
- This feeds the dashboard: non-pending **Received** counts as money-in, **Given** counts as money-out.

### Funds
A simple snapshot of your savings and investment balances (Bike fund, Mutual funds/stocks invested, Personal savings, etc.).

- **Add a fund** with a name and balance; edit any balance inline (saves on blur); delete with ✕. The total is shown at the top.
- This is a **net-position view only** — it is *not* part of your monthly cash math.

### History
Look back and spot trends.

- **Cash by month** — the last 6 months, each showing money in (+), money out (−, as a bar), and the bold **remaining** (the carry-forward chain is visible here).
- **Where it went** — for the selected month, a breakdown of spending by group.
- Use the month switcher to change the anchor month.

### Recurring
Set up bills that repeat — monthly, or every 2, 3, 4, 6 or 12 months — so you don't re-enter them.

- **Add a template**: description, category, amount, how often it **Repeats**, and its **First due month** → **Add recurring**.
- Each new month (the first time you open ATLAS that month), active templates that are due create their item — **known/savings** ones land on the **Known** checklist as *pending* to tick off. Each template shows its interval and **Next due** month.
- **Pause / Resume**: pause a template without deleting it — the **Active / Paused** badge shows its state. **Edit** changes any of its details, including the interval and first due month.
- **Delete** is under the **⋯** menu on the row, with a confirmation step; already-generated items stay.
- It's safe to open the app repeatedly — items are never duplicated.

### Categories
The building blocks everything else uses.

- Categories live inside **groups**, and each group has a **kind** that controls its behaviour:
  - **Income** — money in.
  - **Known expense** — planned bills (checklist).
  - **Savings** — money you set aside (treated as a planned outflow).
  - **Discretionary** — casual spending (the "Other spending" cap applies here).
- Add / rename / reorder / delete groups and categories. A category that's still used by a transaction or recurring template can't be deleted until you remove or reassign those (you'll get a friendly message).
- A starter set is provided so you're not staring at a blank slate.

---

## 5. Typical monthly workflow

**At the start of the month**
1. On the **Dashboard**, enter your **Income** (and **Additional** if any) and click **Save**.
2. Open **Known** — your recurring bills are already there as pending. Add any one-off known bills for the month.
3. On **Expenses**, set (or accept the suggested) **monthly cap** for casual spending.

**During the month**
4. Pay a bill? Tick it off on **Known** (checkbox → paid).
5. Buy something casual? Log it on **Expenses**.
6. Gave money to / got money from someone? Record it on **People**.
7. Glance at the **Dashboard** anytime to see what's **safe to spend** and what's **still to pay** — pending bills can be marked paid right there.

**End of month / review**
8. Skip (×) any planned items that didn't happen this month.
9. Update **Funds** balances if your savings/investments changed.
10. Check **History** to see the trend. Whatever cash is left rolls into next month automatically as **Carry-in**.

---

## 6. Good to know / FAQ

- **Does a planned bill reduce my cash before I pay it?** No. Only items marked **paid** count against your cash; unpaid ones show as "still to pay".
- **Where does next month's carry-in come from?** It's this month's Remaining cash, carried forward automatically — no action needed.
- **Is the discretionary cap a hard limit?** No, it's a target. You can go over it; ATLAS just flags it in clay ("₹… over"). It never blocks spending or changes your cash.
- **Do Funds affect my Remaining cash?** No — they're an informational snapshot of savings/investments.
- **Numbers format** — amounts use the Indian system (e.g. `1,20,000`, not `120,000`), and negatives use a proper minus sign.
- **Recurring salary?** Income is entered as a simple monthly number on the dashboard rather than as a recurring template, to keep the money-in figure clear.
- **Multiple devices** — once hosted, sign in from your phone or laptop; it's the same account and data.
- **Currency** — INR only in this version.
