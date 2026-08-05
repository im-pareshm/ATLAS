import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toMonthParam, monthRange } from "@/lib/month";
import { resolveActiveMonth } from "@/lib/active-month";
import { BUCKET_PALETTE, type TxnStatus } from "@/lib/constants";
import MonthSwitcher from "@/components/MonthSwitcher";
import MonthCookieSync from "@/components/MonthCookieSync";
import KnownExpenses, { type BucketDTO, type ItemDTO } from "./KnownExpenses";

const KNOWN_KINDS = ["KNOWN_EXPENSE", "SAVINGS"];

export default async function KnownPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const ym = await resolveActiveMonth(monthParam);
  const { start, end } = monthRange(ym);

  const [groups, txns] = await Promise.all([
    prisma.categoryGroup.findMany({
      where: { userId, kind: { in: KNOWN_KINDS } },
      orderBy: { sortOrder: "asc" },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        category: { group: { kind: { in: KNOWN_KINDS } } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        description: true,
        amount: true,
        status: true,
        category: { select: { name: true, groupId: true } },
      },
    }),
  ]);

  const itemsByGroup = new Map<string, ItemDTO[]>();
  for (const t of txns) {
    const list = itemsByGroup.get(t.category.groupId) ?? [];
    list.push({
      id: t.id,
      label: t.description || t.category.name,
      categoryName: t.category.name,
      amountPaise: t.amount,
      status: t.status as TxnStatus,
    });
    itemsByGroup.set(t.category.groupId, list);
  }

  const bucketMetrics = groups.map((g, i) => {
    const items = itemsByGroup.get(g.id) ?? [];
    const active = items.filter((it) => it.status !== "SKIPPED");
    const planned = active.reduce((sum, item) => sum + item.amountPaise, 0);
    const paid = active
      .filter((it) => it.status === "PAID")
      .reduce((sum, item) => sum + item.amountPaise, 0);
    const palette = BUCKET_PALETTE[i % BUCKET_PALETTE.length];

    return {
      bucket: {
        id: g.id,
        name: g.name,
        color: palette.color,
        tint: palette.tint,
        categories: g.categories,
        items,
        plannedPaise: planned,
        paidPaise: paid,
        pct: planned > 0 ? Math.round((paid / planned) * 100) : 0,
        doneCount: active.filter((it) => it.status === "PAID").length,
        activeCount: active.length,
      } satisfies BucketDTO,
      planned,
      paid,
    };
  });

  const buckets = bucketMetrics.map(({ bucket }) => bucket);
  const knownPaidPaise = bucketMetrics.reduce((sum, entry) => sum + entry.paid, 0);
  const knownPlannedPaise = bucketMetrics.reduce(
    (sum, entry) => sum + entry.planned,
    0,
  );

  return (
    <div>
      <MonthCookieSync month={toMonthParam(ym)} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
            Known expenses
          </h1>
          <p className="mt-1 text-[13px] text-secondary">
            Plan what&apos;s due this month, then tick each item off as it&apos;s
            paid.
          </p>
        </div>
        <MonthSwitcher ym={ym} basePath="/known" />
      </div>

      <KnownExpenses
        month={ym}
        buckets={buckets}
        knownPaidPaise={knownPaidPaise}
        knownPlannedPaise={knownPlannedPaise}
      />
    </div>
  );
}
