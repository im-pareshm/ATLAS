import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  compareYM,
  currentYearMonth,
  firstOfMonth,
  type YearMonth,
} from "@/lib/month";

/**
 * Lazy recurring generation. For each active template, generate the month's real
 * Transaction (and backfill any missed months) up to the current month. Known and
 * savings items are generated as PENDING (they land on the /known checklist to be
 * ticked off); anything else as PAID.
 *
 * Idempotent: the DB-level @@unique([recurringSourceId, date]) is the hard guard,
 * and lastGeneratedYear/Month is the fast check so no writes happen once caught up.
 * Called from the authenticated layout (covers month rollover) and from the
 * recurring actions (so a newly created/activated template appears immediately).
 */
export async function ensureRecurringTransactionsGenerated(
  userId: string,
): Promise<void> {
  const current = currentYearMonth();

  const templates = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { group: { select: { kind: true } } } } },
  });

  for (const t of templates) {
    let cursor: YearMonth =
      t.lastGeneratedYear != null && t.lastGeneratedMonth != null
        ? addMonths({ year: t.lastGeneratedYear, month: t.lastGeneratedMonth }, 1)
        : current; // never generated → start this month, don't backfill from creation

    const kind = t.category.group.kind;
    const status =
      kind === "KNOWN_EXPENSE" || kind === "SAVINGS" ? "PENDING" : "PAID";

    while (compareYM(cursor, current) <= 0) {
      const date = firstOfMonth(cursor);
      try {
        await prisma.$transaction([
          prisma.transaction.create({
            data: {
              userId,
              categoryId: t.categoryId,
              description: t.description,
              amount: t.amount,
              status,
              date,
              recurringSourceId: t.id,
            },
          }),
          prisma.recurringTransaction.update({
            where: { id: t.id },
            data: { lastGeneratedYear: cursor.year, lastGeneratedMonth: cursor.month },
          }),
        ]);
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          // Already generated for this month (race/dup) — just advance the marker.
          await prisma.recurringTransaction.update({
            where: { id: t.id },
            data: { lastGeneratedYear: cursor.year, lastGeneratedMonth: cursor.month },
          });
        } else {
          throw e;
        }
      }
      cursor = addMonths(cursor, 1);
    }
  }
}
