# Known Issues

Verified engineering problems that have a workaround in place, or fixes that were
deliberately deferred. Each entry should let someone pick the problem up cold
without redoing the investigation.

This is **not a backlog**. Feature scope and v2 deferrals live in [PRD.md](PRD.md);
design gaps live in the mockup handoff README under `Mockup designs/`. If
something is cheaper to fix than to write up here, fix it.

## Rules

- **Park a fix → add the entry in the same commit.** An exclusion, a `.skip`, an
  `it.todo`, a workaround: whatever carries the debt, the entry lands with it.
- **Fix it → delete the entry in the same commit.** Git history is the archive.
  There is no "Resolved" section.
- **Link both ways.** Every entry names the code carrying its workaround, and that
  code comments `See KNOWN_ISSUES.md "<entry title>"` rather than re-explaining
  inline, so `grep -r KNOWN_ISSUES` finds every hook.
- **A review that ends with unfixed findings ends with entries here**, not with
  findings left in a chat transcript.

Entry format: **Symptom** (what you observe) · **Cause** (verified, with
`file:line` pointers — not a hypothesis) · **Workaround in place** (what carries
the debt, and why it must not be "cleaned up") · **Fix plan** (concrete steps and
rough size) · **Since** (commit/date, when known).

---


## `PersonLedgerEntry.linkedTxnId` is a dead column

**Symptom.** `prisma/schema.prisma` has `linkedTxnId String?` on `PersonLedgerEntry`
(comment: "this entry is also a cash movement"), but no action or form ever sets it.
Every row is null.

**Cause.** DESIGN.md originally let a ledger entry *optionally* double as a cash
transaction. The integrated cash math (received = money in, given = money out —
`lib/cash-math.ts`) made that redundant, the UI was never built, and the column
shipped in the initial migration (`prisma/migrations/20260712145425_init`) and
`prisma/turso-schema.sql`.

**Workaround in place.** None needed — the column is nullable and ignored. Listed
so the decision isn’t lost: DESIGN.md marks it `UNUSED` and points here.

**Fix plan.** Decide one of:

1. Drop it — a Prisma migration removing the column, the matching edit to
   `prisma/turso-schema.sql`, and delete the line from DESIGN.md’s snippet.
2. Build it — a "also a cash transaction" option on the entry form that creates a
   linked `Transaction`. Only worth it if there is a real case the integrated math
   doesn’t already cover.

**Since.** Initial schema (2026-07-12).
