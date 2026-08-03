"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { currentYearMonth, firstOfMonth } from "@/lib/month";
import { discretionaryTxnSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

export async function addDiscretionaryTxn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = discretionaryTxnSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { categoryId, description, amount, year, month } = parsed.data;

  // Category must belong to the user and be discretionary.
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, group: { kind: "DISCRETIONARY" } },
    select: { id: true },
  });
  if (!category) return { error: "Pick a valid discretionary category." };

  // Date: today if logging into the current month, else the 1st of that month.
  const now = currentYearMonth();
  const date =
    now.year === year && now.month === month
      ? new Date()
      : firstOfMonth({ year, month });

  await prisma.transaction.create({
    data: {
      userId,
      categoryId,
      description: description ?? null,
      amount: rupeesToPaise(amount),
      status: "PAID",
      date,
    },
  });

  revalidatePath("/expenses");
  return { ok: true };
}

export async function setCap(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const capRupees = Number(formData.get("cap"));
  if (!Number.isFinite(year) || !(month >= 1 && month <= 12)) {
    return { error: "Invalid month." };
  }

  const cap = Number.isFinite(capRupees) && capRupees > 0 ? rupeesToPaise(capRupees) : 0;

  if (cap > 0) {
    await prisma.budget.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: { cap },
      create: { userId, year, month, cap },
    });
  } else {
    // Clearing the cap removes the row (falls back to the last-month suggestion).
    await prisma.budget
      .delete({ where: { userId_year_month: { userId, year, month } } })
      .catch(() => undefined);
  }

  revalidatePath("/expenses");
  return { ok: true };
}

export async function deleteTxn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return { error: "Transaction not found." };

  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/expenses");
  return { ok: true };
}
