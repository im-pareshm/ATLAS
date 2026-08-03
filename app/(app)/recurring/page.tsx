import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import RecurringManager, {
  type CategoryOption,
  type TemplateDTO,
} from "./RecurringManager";

const RECURRING_KINDS = ["KNOWN_EXPENSE", "SAVINGS", "DISCRETIONARY"];

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
        categoryId: true,
        category: { select: { name: true, group: { select: { name: true } } } },
      },
    }),
  ]);

  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    label: `${c.group.name} — ${c.name}`,
  }));

  const templateDtos: TemplateDTO[] = templates.map((t) => ({
    id: t.id,
    description: t.description ?? "",
    categoryId: t.categoryId,
    categoryLabel: `${t.category.group.name} — ${t.category.name}`,
    amountPaise: t.amount,
    isActive: t.isActive,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
          Recurring
        </h1>
        <p className="mt-1 text-[13px] text-secondary">
          Monthly templates (rent, EMIs, subscriptions, SIP). Each month, active
          templates auto-add their item — known/savings land on the{" "}
          <span className="font-semibold">Known</span> checklist as pending.
        </p>
      </div>
      <RecurringManager categories={categoryOptions} templates={templateDtos} />
    </div>
  );
}
