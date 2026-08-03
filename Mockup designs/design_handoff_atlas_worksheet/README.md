# Handoff: ATLAS — Monthly Money Worksheet

## Overview
ATLAS is a single-user personal-finance app. Unlike a generic "log transactions and categorize" tracker, it models a **forward-planning monthly worksheet**: the user lists what's due this month grouped into buckets, ticks each item off as it's paid, keeps discretionary spending under a cap, tracks money lent to / received from people, and records savings-fund balances. The single hero number is **Remaining cash** = money in − everything paid out.

This design was derived directly from the user's real Notion tracker, which is the authoritative spec for behavior. A separate, earlier prototype (`ATLAS.dc.html`) follows the original generic PRD and is **not** the design to build — see "Files" below.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the intended look, layout, and behavior. They are **not** production code to copy directly. The `.dc.html` format is a self-contained prototype format (a lightweight component runtime); do not port that runtime.

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, etc.) using its established component library, styling system, and state patterns. If no codebase exists yet, choose an appropriate stack — the original PRD proposed **Next.js on Vercel + Prisma + Turso (serverless SQLite) + Auth.js**, which remains a reasonable target.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below and should be recreated faithfully. Exact hex values, font, and pixel measurements are given in Design Tokens.

## Screens / Views

### 1. Login
- **Purpose**: Gate the single-user app. In the prototype it's a demo — any click on "Sign in" enters. Real build should wire Auth.js with a seeded single user (no open self-signup).
- **Layout**: Centered column, max-width 400px, on a subtle radial-gradient background (mint → ground). Logo lockup (icon tile + "ATLAS" wordmark), an H1 "Your month, in one view", a one-line subtitle, then a white rounded card (radius 18px) containing Email + Password fields and a full-width primary button.
- **Components**:
  - **Logo tile**: 34×34, radius 10, background primary teal `#4f7c6b`, white line-icon (trending-up/chart glyph), soft shadow.
  - **Inputs**: full width, padding 12×13px, 1px border `#dde5e1`, radius 11px, background `#f6f9f7`, font-size 15px.
  - **Primary button**: full width, padding 13px, background `#4f7c6b`, white text, radius 11px, weight 700; hover `#3f5f52`.
  - Copy: title "Your month, in one view"; subtitle "Plan what's due, tick off what's paid, and always know the cash left."; footer "Single user · demo — just click sign in".

### 2. Worksheet (main screen)
Single scrolling page with a sticky header and four stacked regions.

#### Header (sticky)
- Translucent ground `rgba(238,242,240,.85)` with `backdrop-filter: blur(10px)`, 1px bottom border `#e2e8e5`, padding 14×30px, wraps on narrow widths.
- **Left**: logo tile (30×30, radius 9, primary teal) + "ATLAS" wordmark (19px, weight 800).
- **Right**: month switcher (white pill, `‹ January 2026 ›`, chevrons are buttons stepping through months) + circular avatar (32px, mint bg `#e4efe9`, teal initial).

#### Region A — Summary strip
- Grid: `repeat(auto-fit, minmax(250px, 1fr))`, gap 16px → 3 cards on desktop, collapses to 1 column on mobile.
- **Card "Money in"** (white, radius 16, shadow): mint icon chip (up-arrow, teal), label "Money in", big teal figure (`#4f7c6b`, 28px/800), then three editable rows — Income (₹ input), Additional (₹ input), and read-only "Carry-in + received". Money in = income + additional + carryIn + received (received = non-pending "received" people entries).
- **Card "Money out · paid"**: clay icon chip (down-arrow, `#b07a68`), big clay figure, breakdown rows — Known expenses (paid), Discretionary, Given to people (all read-only).
- **Card "Remaining cash"** (hero): teal gradient `linear-gradient(150deg,#4f7c6b,#6f9686)`, white text. Wallet icon + label, huge figure (44px/800) that reads `#c9eddc` (frozen-water) normally and `#e6b9ab` (clay-tint) when negative, plus a translucent pill "₹X still to pay" (= unpaid known expenses).

#### Region B — Known expenses
- Section header: "Known expenses" (19px/800) + right caption "₹X paid of ₹Y".
- Grid of bucket cards: `repeat(auto-fit, minmax(326px, 1fr))`, gap 16px.
- **Bucket card** (white, radius 16, shadow): header row = colored icon chip (34×34, radius 10, tinted bg + colored icon) + bucket name + "N of M paid" caption + right-aligned "₹paid / of ₹planned". Then a progress bar (height 6, radius 99, fill = bucket color, width = paid/planned %). Then a list of line items.
- **Line item**: a checkbox button (20×20, radius 7; unchecked = 1.5px border `#c3ccc7` on white; checked = filled bucket color with white ✓), label (+ optional mono sub-note), amount, and a ✕/↺ cancel/restore button.
  - **Paid** toggles the checkbox and adds/removes the amount from "paid".
  - **Cancelled** items render struck-through and dimmed, are excluded from planned & paid totals, and show a ↺ to restore. (In the Notion source these are the crossed-out lines.)
- **Buckets & seed data** (January 2026):
  - **Savings** (teal `#4f7c6b`, tint `#e4efe9`): SIP ₹1,500 *(paid)*; Savings ₹4,000 *(cancelled, note "−1,573 · −150 · −112")*; Internet recharge ₹500 *(cancelled, note "−500")*; Home rent ₹1,000 *(cancelled, note "−500 · −470")*.
  - **EMI & loans** (clay `#b07a68`, tint `#f3e7e1`): 2L loan EMI ₹3,900 *(paid)*; 86K loan EMI ₹1,100 *(paid)*; 86K loan EMI ₹1,100 *(paid)*; 2.5L + 90K loan ₹5,634 *(paid)*; Home loan top-up ₹2,500 *(cancelled)*.
  - **Subscriptions** (grey-teal `#82968c`, tint `#e8ecea`): YouTube Premium ₹299; Google Drive ₹650; Crunchyroll ₹79; Netflix ₹199 *(all paid)*.
  - **Miscellaneous** (dim grey `#6a706e`, tint `#e9ebea`): ICICI credit card bill ₹4,603 *(paid)*.

#### Region C — Other spending + side column
- Grid: `repeat(auto-fit, minmax(320px, 1fr))`, gap 16px → 2 columns desktop (discretionary wider originally, now equal), 1 column mobile.
- **Other spending** (left, white card): header "Other spending" + inline editable "Monthly cap ₹4000". Big total figure `/ cap`, plus a pill badge "₹X left" (mint/teal) or "₹X over" (clay) when over. Progress bar (fill teal `#4f7c6b`, or clay `#b07a68` when over cap). Numbered list of expense rows each with a ✕ to remove. Footer add-row: description input + ₹ amount input + teal "Add" button (validates non-empty desc and amount > 0).
  - **Seed rows**: Chinese ₹190, Bike wash ₹100, Chicken 65 ₹50, LIC premium ₹2,698, Train ticket ₹480, Tyre air ₹10, Snacks ₹140, Vada pav ₹72, Chinese ₹300. (Cap ₹4,000; total exceeds cap → over state.)
- **People ledger** (right, white card): per person, a name + net-balance pill ("owes you ₹X" mint / "you owe ₹X" clay / "settled" / "no entries"). Each entry: a small tinted direction chip (↑ given = clay, ↓ received = teal), label, amount; a pending entry shows a "Mark received" pill button (amber-ish `#4f7c6b` on light bg) that, when clicked, converts it to a settled received amount (counts toward received income).
  - **Seed — Mummy**: Ration ₹4,340 *(given)*; LIC ₹2,000 *(given)*; Received ₹3,000; Received (Nov) ₹1,500; Pending settle-up ₹1,500 *(received, pending)*.
  - **Seed — Papa**: no entries.
- **Savings & funds** (right, white card): title + total (teal). List of named funds each with an editable ₹ balance input.
  - **Seed**: Bike fund ₹0; Mutual funds / stocks (invested) ₹26,598; Home rent reserve ₹0; Internet recharge reserve ₹0; Personal savings ₹0; Papa ₹0.

## Interactions & Behavior
- **Tick to pay**: clicking a known-expense checkbox toggles `paid`; totals (bucket paid, Money out, Remaining, "still to pay") recompute live.
- **Cancel / restore**: ✕ marks an item cancelled (struck-through, removed from planned & paid); ↺ restores it.
- **Add discretionary**: fill description + amount, click Add → appended to list, inputs cleared. Validation: description non-empty AND amount > 0.
- **Remove discretionary**: ✕ removes the row.
- **Over-cap state**: when discretionary total > cap, the total figure, progress-bar fill, and badge all switch to clay; badge text shows "₹X over" vs "₹X left".
- **Mark received**: pending people entry → clears pending, amount then counts as received income.
- **Editable numbers**: Income, Additional, Cap, and each fund balance are inline `<input type=number>`; empty/invalid parses to 0.
- **Month switcher**: ‹ / › step through months (prototype seeds January 2026 only; February is empty). **Month carry-forward is NOT implemented** — see Known Gaps.
- **Animations**: cards/regions fade-up in on mount (~.4–.5s ease); progress bars scale-in from left (`barGrow`, .5s ease). Hover states on buttons darken teal `#4f7c6b → #3f5f52`; icon/ghost buttons get a light `#eef2f0` bg on hover.
- **Responsive**: all three grids use `auto-fit`/`minmax` and collapse to a single column on narrow screens; header wraps. This is graceful reflow, **not** a bespoke mobile layout (hero padding/type not restyled for phone).

## State Management
Single component holds all state (lift to store/DB as appropriate):
- `income`, `additional`, `carryIn`, `cap` — numbers.
- `buckets[]` — `{ id, name, color, tint, target, items[] }`; item `{ id, label, amount, paid, cancelled, note? }`.
- `other[]` — `{ id, desc, amount }`.
- `people[]` — `{ id, name, entries[] }`; entry `{ id, label, amount, dir: 'given'|'received', pending? }`.
- `funds[]` — `{ id, name, amount }`.
- `monthIdx`, plus transient `addDesc` / `addAmount` / auth fields.
- **Derived (compute, don't store)**: bucket planned/paid/%, knownPlanned/knownPaid/unpaid, otherTotal & over-cap, per-person net, given/received sums, moneyIn, moneyOut, remaining, fundsTotal.
- **Data model note**: currency is INR; store amounts as integers (paise or whole rupees) to avoid float drift. Numbers are grouped in the **Indian system** (e.g. 26,598 / 1,20,000) — replicate that grouping, not thousands-commas.

## Design Tokens
**Palette (user-supplied muted-teal scheme + harmonized clay):**
- Ink / near-black: `#050505`
- Primary teal (money-in, primary actions, positive): `#4f7c6b`; hover `#3f5f52`; light hero-stop `#6f9686`
- Frozen-water / mint tint: `#c9eddc` (hero figure), `#e4efe9` (chips/tints)
- Grey-teal neutral: `#82968c`; dim grey `#6a706e`
- Clay (money-out, debt, over-cap, negative): `#b07a68`; tint `#f3e7e1`; negative-figure tint `#e6b9ab`
- Grounds: page `#eef2f0`; card `#fff`; input `#f6f9f7`
- Text: primary `#050505`, secondary `#4a504e`, muted `#6a706e`, faint `#99a29e`/`#a7b0ac`
- Borders / hairlines: `#e2e8e5`, `#dde5e1`, `#eef2f0` (row dividers `#eef2f0`)

**Typography**: Plus Jakarta Sans (400–800). Numbers use tabular figures (`font-variant-numeric: tabular-nums`). Scale: hero figure 44/800; card figures 28/800; section H2 17–19/800; body 13–15; captions 11–12.5. Negative letter-spacing (~−.02em) on large figures.

**Radii**: cards 16 (login card 18); chips/tiles 9–10; inputs 8–11; checkboxes 7; pills/bars 99.
**Shadows**: cards `0 1px 3px rgba(26,28,40,.05)`; login card adds `0 24px 48px -28px rgba(26,28,40,.32)`; hero `0 12px 30px -14px` teal.
**Spacing**: page max-width 1160px, padding 26–30px; grid gap 16px; card padding 18–22px.

## Assets
No external image assets. All icons are inline SVG line icons (Lucide-style: trending-up, arrow-up, arrow-down, credit-card, piggy/rupee, refresh, info-circle, wallet). Use the target codebase's icon library (e.g. lucide-react) — no need to copy SVGs verbatim. The ₹ symbol is text.

## Known Gaps / Backlog (not yet designed)
- **Month-to-month carry-forward** of remaining cash (switcher exists; only Jan seeded).
- **Custom/editable buckets** (add, rename, reorder — currently fixed four).
- **Dedicated mobile layout** (current is graceful reflow only).
- **Real auth & persistence** (prototype is in-memory demo).
- Category-delete / orphan rules, timezone/month-boundary definition, recurring-generation trigger — open questions from the PRD review.

## Files
- **`ATLAS Worksheet.dc.html`** — ✅ THE design to build. Current high-fi prototype (muted-teal palette, all interactions).
- `ATLAS.dc.html` — ⚠️ earlier/alternate prototype following the original generic PRD (dashboard/transactions/budgets/history). Reference only; **not** the intended build.
- `support.js` — prototype runtime; **do not port**.
