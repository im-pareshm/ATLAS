"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rupeesToPaise } from "@/lib/money";
import {
  ensureRecurringTransactionsGenerated,
  invalidateRecurringMemo,
} from "@/lib/recurring";
import { requireUserId } from "@/lib/session";
import { recurringSchema, recurringUpdateSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

// Recurring templates are for outflows/savings, not the manual income figure.
const RECURRING_KINDS = ["KNOWN_EXPENSE", "SAVINGS", "DISCRETIONARY"];

function revalidateAll() {
  revalidatePath("/recurring");
  revalidatePath("/known");
  revalidatePath("/expenses");
  revalidatePath("/");
}

function parseStartMonthInput(value: FormDataEntryValue | null): {
  startYear?: number;
  startMonth?: number;
} {
  const raw = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return {};

  return {
    startYear: Number(match[1]),
    startMonth: Number(match[2]),
  };
}

async function assertCategory(userId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId, group: { kind: { in: RECURRING_KINDS } } },
    select: { id: true },
  });
}

export async function createRecurring(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const start = parseStartMonthInput(formData.get("startAt"));
  const parsed = recurringSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    intervalMonths: formData.get("intervalMonths"),
    startYear: start.startYear,
    startMonth: start.startMonth,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await assertCategory(userId, parsed.data.categoryId))) {
    return {
      error: "Pick a valid category (known expense, savings, or discretionary).",
    };
  }

  await prisma.recurringTransaction.create({
    data: {
      userId,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description ?? null,
      amount: rupeesToPaise(parsed.data.amount),
      intervalMonths: parsed.data.intervalMonths,
      startYear: parsed.data.startYear,
      startMonth: parsed.data.startMonth,
      isActive: true,
    },
  });

  // force: the per-process memo must not hide a template created just now.
  await ensureRecurringTransactionsGenerated(userId, { force: true });
  revalidateAll();
  return { ok: true };
}

export async function updateRecurring(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const start = parseStartMonthInput(formData.get("startAt"));
  const parsed = recurringUpdateSchema.safeParse({
    id: formData.get("id"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    intervalMonths: formData.get("intervalMonths"),
    startYear: start.startYear,
    startMonth: start.startMonth,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const owned = await prisma.recurringTransaction.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true },
  });
  if (!owned) return { error: "Template not found." };
  if (!(await assertCategory(userId, parsed.data.categoryId))) {
    return { error: "Pick a valid category." };
  }

  await prisma.recurringTransaction.update({
    where: { id: parsed.data.id },
    data: {
      categoryId: parsed.data.categoryId,
      description: parsed.data.description ?? null,
      amount: rupeesToPaise(parsed.data.amount),
      intervalMonths: parsed.data.intervalMonths,
      startYear: parsed.data.startYear,
      startMonth: parsed.data.startMonth,
    },
  });

  // Start month / interval may now imply different due months, so let the next
  // render re-check instead of trusting the memo.
  invalidateRecurringMemo(userId);
  revalidateAll();
  return { ok: true };
}

export async function toggleRecurring(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const t = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true, isActive: true },
  });
  if (!t) return;

  await prisma.recurringTransaction.update({
    where: { id },
    data: { isActive: !t.isActive },
  });

  if (!t.isActive) {
    await ensureRecurringTransactionsGenerated(userId, { force: true });
  }
  revalidateAll();
}

export async function deleteRecurring(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  // Generated transactions keep their rows (recurringSourceId set null via schema).
  await prisma.recurringTransaction.delete({ where: { id } });
  revalidateAll();
}
