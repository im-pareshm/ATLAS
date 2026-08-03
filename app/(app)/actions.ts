"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ActionState = { error?: string; ok?: boolean };

// Save the Money-in figures for a month (income and/or additional). Fields absent
// from the form are left unchanged.
export async function setMonthIncome(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isFinite(year) || !(month >= 1 && month <= 12)) {
    return { error: "Invalid month." };
  }

  const data: { income?: number; additional?: number } = {};
  const incomeRaw = formData.get("income");
  const additionalRaw = formData.get("additional");
  if (incomeRaw !== null) {
    const v = Number(incomeRaw);
    data.income = Number.isFinite(v) && v > 0 ? rupeesToPaise(v) : 0;
  }
  if (additionalRaw !== null) {
    const v = Number(additionalRaw);
    data.additional = Number.isFinite(v) && v > 0 ? rupeesToPaise(v) : 0;
  }

  await prisma.budget.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: data,
    create: { userId, year, month, ...data },
  });

  revalidatePath("/");
  return { ok: true };
}
