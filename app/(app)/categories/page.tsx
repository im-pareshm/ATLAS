import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { CategoryKind } from "@/lib/constants";
import CategoryManager, { type GroupDTO } from "./CategoryManager";

export default async function CategoriesPage() {
  const userId = await requireUserId();

  const groups = await prisma.categoryGroup.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, isDefault: true },
      },
    },
  });

  const dto: GroupDTO[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind as CategoryKind,
    categories: g.categories,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
          Categories &amp; groups
        </h1>
        <p className="mt-1 text-[13px] text-secondary">
          Organize spending into groups. Each group&apos;s <em>kind</em> decides
          how it behaves (income, known expense, savings, or discretionary).
        </p>
      </div>
      <CategoryManager groups={dto} />
    </div>
  );
}
