"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import {
  groupCreateSchema,
  groupUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function dupError(e: unknown, label: string): ActionState | null {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  ) {
    return { error: `A ${label} with that name already exists.` };
  }
  return null;
}

// ---- Groups ----

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = groupCreateSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const max = await prisma.categoryGroup.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  try {
    await prisma.categoryGroup.create({
      data: {
        userId,
        name: parsed.data.name,
        kind: parsed.data.kind,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    const dup = dupError(e, "group");
    if (dup) return dup;
    throw e;
  }
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = groupUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owned = await prisma.categoryGroup.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true },
  });
  if (!owned) return { error: "Group not found." };

  try {
    await prisma.categoryGroup.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, kind: parsed.data.kind },
    });
  } catch (e) {
    const dup = dupError(e, "group");
    if (dup) return dup;
    throw e;
  }
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.categoryGroup.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return { error: "Group not found." };

  const childCount = await prisma.category.count({
    where: { userId, groupId: id },
  });
  if (childCount > 0) {
    return {
      error: `This group has ${childCount} categor${childCount === 1 ? "y" : "ies"} — delete or move them first.`,
    };
  }
  await prisma.categoryGroup.delete({ where: { id } });
  revalidatePath("/categories");
  return { ok: true };
}

export async function moveGroup(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  await swapSortOrder("categoryGroup", userId, id, dir === "up" ? -1 : 1);
  revalidatePath("/categories");
}

// ---- Categories ----

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = categoryCreateSchema.safeParse({
    groupId: formData.get("groupId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const group = await prisma.categoryGroup.findFirst({
    where: { id: parsed.data.groupId, userId },
    select: { id: true },
  });
  if (!group) return { error: "Group not found." };

  const max = await prisma.category.aggregate({
    where: { userId, groupId: parsed.data.groupId },
    _max: { sortOrder: true },
  });
  try {
    await prisma.category.create({
      data: {
        userId,
        groupId: parsed.data.groupId,
        name: parsed.data.name,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    const dup = dupError(e, "category");
    if (dup) return dup;
    throw e;
  }
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owned = await prisma.category.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true },
  });
  if (!owned) return { error: "Category not found." };

  try {
    await prisma.category.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name },
    });
  } catch (e) {
    const dup = dupError(e, "category");
    if (dup) return dup;
    throw e;
  }
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");

  const [owned, txn, rec] = await Promise.all([
    prisma.category.findFirst({ where: { id, userId }, select: { id: true } }),
    prisma.transaction.count({ where: { userId, categoryId: id } }),
    prisma.recurringTransaction.count({ where: { userId, categoryId: id } }),
  ]);
  if (!owned) return { error: "Category not found." };

  const refs = txn + rec;
  if (refs > 0) {
    return {
      error: `In use by ${refs} item${refs === 1 ? "" : "s"} (transactions/recurring) — remove or reassign those first.`,
    };
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
  return { ok: true };
}

export async function moveCategory(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  await swapSortOrder("category", userId, id, dir === "up" ? -1 : 1);
  revalidatePath("/categories");
}

// ---- helpers ----

/**
 * Swap the sortOrder of a row with its adjacent sibling. For categories, siblings
 * are scoped to the same group; for groups, to the user.
 */
async function swapSortOrder(
  model: "categoryGroup" | "category",
  userId: string,
  id: string,
  delta: -1 | 1,
): Promise<void> {
  if (model === "categoryGroup") {
    const current = await prisma.categoryGroup.findFirst({
      where: { id, userId },
      select: { id: true, sortOrder: true },
    });
    if (!current) return;
    const siblings = await prisma.categoryGroup.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const idx = siblings.findIndex((s) => s.id === id);
    const neighbor = siblings[idx + delta];
    if (!neighbor) return;
    await prisma.$transaction([
      prisma.categoryGroup.update({
        where: { id: current.id },
        data: { sortOrder: neighbor.sortOrder },
      }),
      prisma.categoryGroup.update({
        where: { id: neighbor.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
    return;
  }

  const current = await prisma.category.findFirst({
    where: { id, userId },
    select: { id: true, sortOrder: true, groupId: true },
  });
  if (!current) return;
  const siblings = await prisma.category.findMany({
    where: { userId, groupId: current.groupId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const neighbor = siblings[idx + delta];
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.category.update({
      where: { id: current.id },
      data: { sortOrder: neighbor.sortOrder },
    }),
    prisma.category.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);
}
