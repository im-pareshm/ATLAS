"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { currentYearMonth, firstOfMonth } from "@/lib/month";
import { knownTxnSchema } from "@/lib/validations";
import { TXN_STATUSES } from "@/lib/constants";

export type ActionState = { error?: string; ok?: boolean };

const KNOWN_KINDS = ["KNOWN_EXPENSE", "SAVINGS"];

export async function addKnownItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = knownTxnSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { categoryId, description, amount, year, month } = parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, group: { kind: { in: KNOWN_KINDS } } },
    select: { id: true },
  });
  if (!category) return { error: "Pick a valid known-expense category." };

  const now = currentYearMonth();
  const date =
    now.year === year && now.month === month
      ? new Date()
      : firstOfMonth({ year, month });

  // Planned items start PENDING (to be ticked off as paid).
  await prisma.transaction.create({
    data: {
      userId,
      categoryId,
      description: description ?? null,
      amount: rupeesToPaise(amount),
      status: "PENDING",
      date,
    },
  });

  revalidatePath("/known");
  return { ok: true };
}

export async function setKnownStatus(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(TXN_STATUSES as readonly string[]).includes(status)) return;

  const owned = await prisma.transaction.findFirst({
    where: { id, userId, category: { group: { kind: { in: KNOWN_KINDS } } } },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.transaction.update({ where: { id }, data: { status } });
  revalidatePath("/known");
}

export async function deleteKnownItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/known");
}
