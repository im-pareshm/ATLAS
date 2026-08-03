# ATLAS — UI / Design Guide

Derived from the high-fidelity mockup at `Mockup designs/design_handoff_atlas_worksheet/ATLAS Worksheet.dc.html` (+ its handoff `README.md`). This is the authoritative **visual** spec: palette, typography, spacing, components, motion, and how to reproduce them in the target stack (Next.js + Tailwind + lucide-react). It complements [DESIGN.md](DESIGN.md) (money model + data model) and [PRD.md](PRD.md) (requirements).

> The `.dc.html` files are **design references, not production code** — do not port the `support.js` runtime. Recreate the look in real React/Tailwind components.

---

## 1. Review: mockup vs. our approved docs

**Strong alignment:** palette/typography are fully specified; the plan-then-reconcile workflow, grouped known expenses, paid/cancelled line items (= our paid/skipped status), discretionary cap, people ledger with given/received + "mark received", INR integer amounts, and Indian-digit grouping all match [DESIGN.md](DESIGN.md).

**Divergences to resolve (⚠️ decisions):**

| # | Mockup does… | Our docs said… | Recommendation |
|---|---|---|---|
| D1 | **Single scrolling worksheet**, top-bar only (logo · month switcher · avatar). No sidebar/bottom-tabs. | DESIGN.md §4: adaptive sidebar/bottom-tab nav across 8 screens. | **DECIDED: keep multi-screen app.** This worksheet **is the Dashboard screen**; retain the adaptive sidebar/bottom-tab nav and the separate Budget-planning, History/Reports, and Recurring screens from DESIGN.md. The mockup's sticky top bar (logo · month switcher · avatar) sits *above* the nav's content area. |
| D2 | **Includes "Savings & funds"** snapshot (editable fund balances, e.g. invested ₹26,598). | PRD §3: savings/investment snapshot deferred to **v2**. | **DECIDED: include the lightweight version in v1** — a list of `{name, editable ₹ balance}` rows + total (new `Fund` model). Full investment tracking (returns, history) stays v2. |
| D3 | **People ledger is part of the cash math**: `moneyIn += received (non-pending)`, `moneyOut += given`. | DESIGN.md §1: person ledger was an *optional* cash movement, not in the core formula. | **Adopt the mockup's integrated formula** (see §7). It's the correct, clearer model. |
| D4 | **Buckets are a fixed four** (Savings, EMI, Subscriptions, Miscellaneous). | DESIGN.md: flexible `CategoryGroup` model. | Keep the **flexible group model in the DB** (seed the four); UI ships fixed for v1, editable buckets are backlog. No data-model change. |
| D5 | Budget planning & recurring management have **no dedicated screen** — cap is edited inline; buckets are just there. | DESIGN.md had separate Budget-planning and Recurring screens. | For v1, edit the cap inline (as mocked). **Recurring templates still need a management screen** (backend generation populates the buckets) — reuse this design language; reach it from the avatar menu. |
| D6 | **Carry-forward not implemented** (only Jan seeded; month switcher present). | DESIGN.md §1: carry-in chains month to month. | Build carry-forward for real (backend). It's a known mockup gap, not a design decision. |

The rest of this guide documents the mockup as-is; apply the recommendations above during implementation.

---

## 2. Design Tokens

### 2.1 Palette
Semantic roles → hex. (Muted-teal scheme with a harmonized clay accent.)

**Brand / positive (teal)**
- `--teal` **#4f7c6b** — primary actions, money-in, positive, Savings bucket
- `--teal-hover` **#3f5f52** — button/link hover
- `--teal-hero-stop` **#6f9686** — hero gradient light stop
- `--mint` **#c9eddc** — hero figure text (positive)
- `--mint-tint` **#e4efe9** — chips, tints, avatar bg, positive pill bg

**Accent / negative (clay)** — money-out, debt, over-cap, negative
- `--clay` **#b07a68**
- `--clay-tint` **#f3e7e1**
- `--clay-neg-figure` **#e6b9ab** — hero figure text when negative

**Neutrals (grey-teal family)**
- `--greyteal` **#82968c** — Subscriptions bucket
- `--dim` **#6a706e** — Miscellaneous bucket, muted text

**Grounds**
- `--page` **#eef2f0** · `--card` **#ffffff** · `--input` **#f6f9f7**

**Text**
- primary `--ink` **#050505** · strong **#2e3230** · secondary **#4a504e** · muted **#6a706e** · faint **#99a29e** / **#a7b0ac** · struck **#b6b9c4** · icon-dim **#b9c0bc**

**Lines**
- border **#e2e8e5** · input border **#dde5e1** · divider **#eef2f0** · progress track **#e9efec**

**Bucket color/tint pairs**
| Bucket | color | tint |
|---|---|---|
| Savings | #4f7c6b | #e4efe9 |
| EMI & loans | #b07a68 | #f3e7e1 |
| Subscriptions | #82968c | #e8ecea |
| Miscellaneous | #6a706e | #e9ebea |

### 2.2 Typography
- **Family:** `Plus Jakarta Sans`, weights 400–800; fallback `system-ui, sans-serif`.
- **Numbers:** always tabular — `font-variant-numeric: tabular-nums; font-feature-settings:"tnum"`.
- **Scale:**
  | Role | size / weight | tracking |
  |---|---|---|
  | Hero figure (remaining) | 44 / 800 | −.03em |
  | Card figure (money in/out) | 28 / 800 | −.02em |
  | Discretionary total | 24 / 800 | −.02em |
  | Section H2 | 17–19 / 800 | −.01em |
  | Card/bucket H3 | 15.5 / 700 | — |
  | Body | 13–15 / 500–600 | — |
  | Caption | 11–12.5 | — |

### 2.3 Radius / Shadow / Spacing
- **Radius:** cards 16 (login card 18) · chips/tiles 9–10 · inputs 8–11 · checkbox 7 · pills & bars 99.
- **Shadow:** card `0 1px 3px rgba(26,28,40,.05)` · login card adds `0 24px 48px -28px rgba(26,28,40,.32)` · hero `0 12px 30px -14px rgba(79,124,107,.67)`.
- **Spacing:** page max-width **1160px**, padding 26–30px · grid gap **16px** · card padding 18–22px · region vertical gap 32px.

---

## 3. Layout & Responsive
This is the **Dashboard screen** of the multi-screen app (D1): it renders inside the app shell (adaptive sidebar/bottom-tab nav per DESIGN.md §4) with the mockup's sticky top bar above the content. The screen itself is a single scrolling column of four stacked regions:
1. **Summary strip** — grid `repeat(auto-fit, minmax(250px,1fr))` → 3 cards desktop, 1 col mobile.
2. **Known expenses** — grid `repeat(auto-fit, minmax(326px,1fr))`.
3. **Two-column** — grid `repeat(auto-fit, minmax(320px,1fr))`; left = Other spending, right = People ledger + Savings & funds stacked.

All grids use `auto-fit`/`minmax` → graceful reflow to one column; header wraps. **This is reflow, not a bespoke mobile layout** — a dedicated phone layout is backlog (see PRD/DESIGN responsive note).

Sticky header: translucent `rgba(238,242,240,.85)` + `backdrop-filter: blur(10px)`, 1px bottom border `#e2e8e5`, padding 14×30px.

---

## 4. Components

**Logo tile** — 30–34px square, radius 9–10, bg `--teal`, white 2.2-stroke line icon (trending-up glyph), soft teal shadow.

**Month switcher** — white pill, 1px border `#e2e8e5`, radius 11, 3px pad; `‹` / `›` ghost buttons (hover bg `#eef2f0`) flanking a centered `{Month YYYY}` (tabular, 14/700, min-width 124px).

**Avatar** — 32px circle, bg `--mint-tint`, teal initial 13/700.

**Summary cards** (3):
- *Money in* — white card; mint chip (30px, up-arrow, teal) + "Money in" label; big teal figure (28/800); rows: Income (₹ number input), Additional (₹ input), "Carry-in + received" (read-only).
- *Money out · paid* — clay chip (down-arrow); big clay figure; rows: Known expenses (paid), Discretionary, Given to people (read-only).
- *Remaining cash (hero)* — teal gradient `linear-gradient(150deg,#4f7c6b,#6f9686)`, white text; wallet icon; huge figure (44/800) colored `--mint` normally / `--clay-neg-figure` when negative; translucent pill `rgba(255,255,255,.16)` "₹X still to pay".

**Bucket card** — white card. Header: colored chip (34px, radius 10, bucket tint bg + bucket color icon) + name (15.5/700) + "N of M paid" caption + right "₹paid / of ₹planned". Then progress bar (h6, radius 99, track `#e9efec`, fill = bucket color, width = paid/planned %). Then line items.

**Line item** — row (pad 8×0, top divider `#eef2f0`): checkbox button (20px, radius 7; unchecked = 1.5px `#c3ccc7` on white; checked = bucket color fill + white ✓) · label (13.5/500) with optional mono note (11, faint) · amount (tabular) · cancel/restore ghost button (✕ active / ↺ when cancelled). Cancelled items: `line-through` + dimmed `#b6b9c4`, excluded from totals.

**Other spending card** — header "Other spending" + inline "Monthly cap ₹[input]". Total figure (24/800) `/ cap`, + pill badge "₹X left" (mint bg) or "₹X over" (clay bg, when over). Progress bar (h7; fill teal, or clay when over). Numbered rows (`01`, `02`… tabular, faint) each with ✕ remove (hover bg clay-tint). Footer add-row: description input + ₹ amount input (106px) + teal "Add" button. Validation: desc non-empty AND amount > 0.

**People ledger** — per person: name (14.5/700) + net pill ("owes you ₹X" mint / "you owe ₹X" clay / "settled" / "no entries"). Entries: direction chip (22px, radius 7; ↑ given = clay tint/color, ↓ received = teal tint/color) + label + amount (colored by direction); pending entry shows a "Mark received" pill (teal on `#e9ebea`) → clears pending, counts as received.

**Savings & funds** — title + teal total. Rows: fund name + editable ₹ number input (76px).

**Inputs** — bg `--input`, 1px `--dde5e1`/`#e2e8e5`, radius 8–11, pad ~12×13 (10×12 for add-row); number inputs right-aligned, tabular, 600; a faint `₹` prefix sits inside the field frame; no focus outline (rely on subtle frame). Placeholder `#a7b0ac`.

**Primary button** — bg `--teal`, white, 700, radius 10–11, pad 13 (10×17 compact); hover `--teal-hover`; teal drop shadow.

**Icon / ghost button** — transparent, `#b9c0bc` glyph; hover → light bg (`#eef2f0`, or `#f3e7e1` for destructive) + darker glyph.

---

## 5. Number & Currency Formatting
- Currency **INR ₹** only. Store as **integer** (paise recommended) — never float.
- **Indian digit grouping**: last 3 digits, then 2-digit groups → `26,598`, `1,20,000` (NOT `120,000`). Reference `grp()` in the mockup script.
- Negative uses the **minus sign U+2212 (−)**, not hyphen: `−₹1,234`.
- All figures render with tabular numerals.

---

## 6. Iconography & Motion
- **Icons:** Lucide-style line icons, 2–2.2 stroke — trending-up (logo), arrow-up/down (money in/out & ledger direction), rect+line/credit-card (EMI), refresh (subscriptions), info-circle (misc), piggy/rupee (savings), wallet (remaining). Use **lucide-react**; don't hand-copy SVGs.
- **Motion:** regions/cards `fadeUp` (opacity 0→1, translateY 8→0, ~.4–.5s ease) on mount; progress bars `barGrow` (scaleX 0→1 from left, .5s ease). Button hover darkens teal; ghost buttons gain a light bg. Keep subtle.

---

## 7. Money Model (as implemented in the mockup — adopt this)
```
received = Σ people entries where dir=received AND not pending
given    = Σ people entries where dir=given   AND not pending
moneyIn  = income + additional + carryIn + received
knownPaid= Σ non-cancelled known-expense items where paid
moneyOut = knownPaid + discretionaryTotal + given
remaining (hero) = moneyIn − moneyOut          // clay-tinted if negative
stillToPay = knownPlanned − knownPaid          // knownPlanned excludes cancelled
```
- Discretionary "cap" is a **manual target**, separate from `remaining`; over-cap flips total/bar/badge to clay.
- "Carry-in + received" is surfaced as a read-only line in the Money-in card.
- This **supersedes** DESIGN.md §1's optional-ledger treatment (see review D3) — reconcile DESIGN.md to match on approval.

---

## 8. Implementation Mapping (Next.js + Tailwind)
- Put tokens in `tailwind.config.ts` `theme.extend.colors` (teal/clay/mint/dim/ground/ink families) + `boxShadow` (card/hero/login) + `borderRadius`. Load Plus Jakarta Sans via `next/font/google`.
- Enable tabular numerals globally on numeric spans (`.num` utility → `tabular-nums`).
- Build a `formatINR(paise)` helper implementing Indian grouping + `−` sign; a shared `<Money/>` component for figures.
- Bucket color/tint from a lookup keyed on the seeded `CategoryGroup`.
- Icons via `lucide-react`. Animations via CSS keyframes (`fadeUp`, `barGrow`) or a light motion lib — keep durations from §6.
- Login screen: centered 400px card on radial mint→ground gradient; wire real Auth.js (no open signup) per IMPLEMENTATION_PLAN.md.

---

## 9. Open Gaps (from the handoff backlog)
Month-to-month carry-forward (D6), custom/editable buckets (D4), dedicated mobile layout, real auth & persistence, category-delete/orphan rules, month-boundary/timezone definition, recurring-generation trigger (D5). Track these alongside the build order in DESIGN.md.
