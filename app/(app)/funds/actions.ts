"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { fundSchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

export async function addFund(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = fundSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const max = await prisma.fund.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  try {
    await prisma.fund.create({
      data: {
        userId,
        name: parsed.data.name,
        balance: rupeesToPaise(parsed.data.amount ?? 0),
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "You already have a fund with that name." };
    }
    throw e;
  }
  revalidatePath("/funds");
  return { ok: true };
}

export async function updateFundBalance(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const balanceRupees = Number(formData.get("balance"));
  const owned = await prisma.fund.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  const balance =
    Number.isFinite(balanceRupees) && balanceRupees > 0
      ? rupeesToPaise(balanceRupees)
      : 0;
  await prisma.fund.update({ where: { id }, data: { balance } });
  revalidatePath("/funds");
}

export async function deleteFund(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.fund.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.fund.delete({ where: { id } });
  revalidatePath("/funds");
}
