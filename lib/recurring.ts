import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  compareYM,
  currentYearMonth,
  firstOfMonth,
  isDueMonth,
  toMonthParam,
  type YearMonth,
} from "@/lib/month";

/**
 * Lazy recurring generation. For each active template, generate the month's real
 * Transaction (and backfill any missed due months) up to the current month.
 * Known and savings items are generated as PENDING; anything else as PAID.
 *
 * Idempotent: the DB-level @@unique([recurringSourceId, date]) is the hard guard,
 * and lastGeneratedYear/Month is the fast check so no writes happen once caught up.
 * Called from the authenticated layout (covers month rollover) and from the
 * recurring actions (so a newly created/activated template appears immediately).
 *
 * The due-month test itself (`isDueMonth`) is pure and lives in lib/month.ts —
 * this function is the thin, DB-touching shell around it.
 *
 * COST: this runs on every authenticated page render, and against Turso every
 * query is a serialised HTTPS round trip (see the note in lib/cash.ts). So the
 * caught-up path — which is essentially always — must be cheap:
 *   - warm instance, already generated this month  -> 0 queries (memo below)
 *   - cold instance, nothing to generate           -> 1 query
 *   - month rollover / backfill                    -> a handful, batched
 * The old shape opened a separate write transaction per template per month,
 * which made a 12-month backfill hundreds of round trips.
 *
 * That budget is why the template read selects scalars only: adding
 * `category.group.kind` to it makes Prisma split the read into three queries,
 * and the kind is only needed once we know there is something to write.
 */

/**
 * Per-process record of "this user is already generated through this month".
 * Keyed by userId, value is the "YYYY-MM" it was completed for, so a month
 * rollover naturally invalidates it. Bounded by the number of distinct users a
 * single warm instance serves.
 *
 * Safe against staleness: the mutating actions call this with `force: true` in
 * their own process *before* revalidating, so the rows already exist in the DB
 * by the time any other instance renders. A stale memo elsewhere therefore has
 * nothing left to do.
 */
const generatedThrough = new Map<string, string>();

/** Drop the memo for a user, so the next call re-checks the DB. */
export function invalidateRecurringMemo(userId: string): void {
  generatedThrough.delete(userId);
}

type PlannedRow = Prisma.TransactionCreateManyInput;

export async function ensureRecurringTransactionsGenerated(
  userId: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  const current = currentYearMonth();
  const currentKey = toMonthParam(current);

  if (!opts.force && generatedThrough.get(userId) === currentKey) return;

  const templates = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      categoryId: true,
      description: true,
      amount: true,
      intervalMonths: true,
      startYear: true,
      startMonth: true,
      lastGeneratedYear: true,
      lastGeneratedMonth: true,
    },
  });

  // --- plan everything in memory first; no I/O in this loop ---
  const due: { template: (typeof templates)[number]; months: YearMonth[] }[] = [];
  const lastDueByTemplate = new Map<string, YearMonth>();

  for (const t of templates) {
    const start = { year: t.startYear, month: t.startMonth };
    if (compareYM(start, current) > 0) continue;

    let cursor: YearMonth =
      t.lastGeneratedYear != null && t.lastGeneratedMonth != null
        ? addMonths({ year: t.lastGeneratedYear, month: t.lastGeneratedMonth }, 1)
        : start;

    const months: YearMonth[] = [];
    while (compareYM(cursor, current) <= 0) {
      if (isDueMonth(start, cursor, t.intervalMonths)) {
        months.push(cursor);
        // Matches the original semantics: lastGenerated tracks the last *due*
        // month, not merely the last month examined.
        lastDueByTemplate.set(t.id, cursor);
      }
      cursor = addMonths(cursor, 1);
    }
    if (months.length > 0) due.push({ template: t, months });
  }

  if (due.length === 0) {
    generatedThrough.set(userId, currentKey);
    return;
  }

  // Only now is the category kind worth a round trip: it decides PENDING vs PAID.
  const kindByCategoryId = await loadCategoryKinds(
    due.map((d) => d.template.categoryId),
  );

  const rows: PlannedRow[] = [];
  for (const { template: t, months } of due) {
    const kind = kindByCategoryId.get(t.categoryId);
    const status =
      kind === "KNOWN_EXPENSE" || kind === "SAVINGS" ? "PENDING" : "PAID";
    for (const ym of months) {
      rows.push({
        userId,
        categoryId: t.categoryId,
        description: t.description,
        amount: t.amount,
        status,
        date: firstOfMonth(ym),
        recurringSourceId: t.id,
      });
    }
  }

  // One batched multi-row INSERT instead of a transaction per row. SQLite has no
  // `skipDuplicates`, so a collision fails the whole batch — fall back to the
  // row-at-a-time path, which tolerates P2002 the way the original did.
  try {
    await prisma.transaction.createMany({ data: rows });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    await createRowsTolerantly(rows);
  }

  for (const [templateId, ym] of lastDueByTemplate) {
    await prisma.recurringTransaction.update({
      where: { id: templateId },
      data: { lastGeneratedYear: ym.year, lastGeneratedMonth: ym.month },
    });
  }

  generatedThrough.set(userId, currentKey);
}

/**
 * categoryId -> owning group's kind, in a single query. Done as raw SQL because
 * the equivalent nested Prisma select (`category.group.kind`) is split into
 * three round trips by the driver adapter.
 */
async function loadCategoryKinds(
  categoryIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(categoryIds)];
  if (ids.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ id: string; kind: string }[]>`
    SELECT c."id" AS "id", g."kind" AS "kind"
    FROM "Category" c
    JOIN "CategoryGroup" g ON g."id" = c."groupId"
    WHERE c."id" IN (${Prisma.join(ids)})
  `;
  return new Map(rows.map((r) => [r.id, r.kind]));
}

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

/**
 * Slow path: insert one row at a time, treating "already exists" as success.
 * Only reached when a batch collides with rows a concurrent render already
 * wrote, which the unique index is there to make harmless.
 */
async function createRowsTolerantly(rows: PlannedRow[]): Promise<void> {
  for (const data of rows) {
    try {
      await prisma.transaction.create({ data });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
}
