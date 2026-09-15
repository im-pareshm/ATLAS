import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  compareYM,
  currentYearMonth,
  firstOfMonth,
  isDueMonth,
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
    const start = { year: t.startYear, month: t.startMonth };
    if (compareYM(start, current) > 0) continue;

    let cursor: YearMonth =
      t.lastGeneratedYear != null && t.lastGeneratedMonth != null
        ? addMonths({ year: t.lastGeneratedYear, month: t.lastGeneratedMonth }, 1)
        : start;

    const kind = t.category.group.kind;
    const status =
      kind === "KNOWN_EXPENSE" || kind === "SAVINGS" ? "PENDING" : "PAID";

    while (compareYM(cursor, current) <= 0) {
      if (isDueMonth(start, cursor, t.intervalMonths)) {
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
              data: {
                lastGeneratedYear: cursor.year,
                lastGeneratedMonth: cursor.month,
              },
            }),
          ]);
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            await prisma.recurringTransaction.update({
              where: { id: t.id },
              data: {
                lastGeneratedYear: cursor.year,
                lastGeneratedMonth: cursor.month,
              },
            });
          } else {
            throw e;
          }
        }
      }

      cursor = addMonths(cursor, 1);
    }
  }
}
