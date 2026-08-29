import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import {
  addMonths,
  compareYM,
  currentYearMonth,
  formatMonthShort,
  type YearMonth,
} from "@/lib/month";
import RecurringManager, {
  type CategoryOption,
  type TemplateDTO,
} from "./RecurringManager";

const RECURRING_KINDS = ["KNOWN_EXPENSE", "SAVINGS", "DISCRETIONARY"];

function getNextDueMonth(params: {
  intervalMonths: number;
  start: YearMonth;
  isActive: boolean;
  lastGeneratedYear: number | null;
  lastGeneratedMonth: number | null;
}): YearMonth {
  const { intervalMonths, start, isActive, lastGeneratedYear, lastGeneratedMonth } = params;
  const current = currentYearMonth();

  if (!isActive) {
    if (lastGeneratedYear != null && lastGeneratedMonth != null) {
      return addMonths(
        { year: lastGeneratedYear, month: lastGeneratedMonth },
        intervalMonths,
      );
    }
    return start;
  }

  if (compareYM(current, start) < 0) return start;

  if (lastGeneratedYear != null && lastGeneratedMonth != null) {
    return addMonths(
      { year: lastGeneratedYear, month: lastGeneratedMonth },
      intervalMonths,
    );
  }

  return start;
}

export default async function RecurringPage() {
  const userId = await requireUserId();

  const [categories, templates] = await Promise.all([
    prisma.category.findMany({
      where: { userId, group: { kind: { in: RECURRING_KINDS } } },
      orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, group: { select: { name: true } } },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        description: true,
        amount: true,
        isActive: true,
        intervalMonths: true,
        startYear: true,
        startMonth: true,
        lastGeneratedYear: true,
        lastGeneratedMonth: true,
        categoryId: true,
        category: { select: { name: true, group: { select: { name: true } } } },
      },
    }),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    label: `${c.group.name} - ${c.name}`,
  }));

  const templateDtos: TemplateDTO[] = templates.map((t) => {
    const nextDue = getNextDueMonth({
      intervalMonths: t.intervalMonths,
      start: { year: t.startYear, month: t.startMonth },
      isActive: t.isActive,
      lastGeneratedYear: t.lastGeneratedYear,
      lastGeneratedMonth: t.lastGeneratedMonth,
    });

    return {
      id: t.id,
      description: t.description ?? "",
      categoryId: t.categoryId,
      categoryLabel: `${t.category.group.name} - ${t.category.name}`,
      amountPaise: t.amount,
      intervalMonths: t.intervalMonths,
      startYear: t.startYear,
      startMonth: t.startMonth,
      isActive: t.isActive,
      nextDueLabel: formatMonthShort(nextDue),
    };
  });

  return (
    <div data-testid="recurring">
      <div className="mb-5">
        <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
          Recurring
        </h1>
        <p className="mt-1 text-[13px] text-secondary">
          Recurring templates for bills, insurance, EMIs, and investments. Active
          templates auto-add items in their due month, and known/savings items land
          on the <span className="font-semibold">Known</span> checklist as pending.
        </p>
      </div>
      <RecurringManager categories={categoryOptions} templates={templateDtos} />
    </div>
  );
}
