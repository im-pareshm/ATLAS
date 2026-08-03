"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { personSchema, ledgerEntrySchema } from "@/lib/validations";

export type ActionState = { error?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/people");
  revalidatePath("/");
}

export async function addPerson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = personSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await prisma.person.create({ data: { userId, name: parsed.data.name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "You already have a person with that name." };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true };
}

export async function deletePerson(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.person.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.person.delete({ where: { id } }); // cascades entries
  revalidateAll();
}

export async function addEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = ledgerEntrySchema.safeParse({
    personId: formData.get("personId"),
    direction: formData.get("direction"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const person = await prisma.person.findFirst({
    where: { id: parsed.data.personId, userId },
    select: { id: true },
  });
  if (!person) return { error: "Person not found." };

  const pending = formData.get("pending") === "on";

  await prisma.personLedgerEntry.create({
    data: {
      userId,
      personId: parsed.data.personId,
      direction: parsed.data.direction,
      description: parsed.data.description ?? null,
      amount: rupeesToPaise(parsed.data.amount),
      pending,
      date: new Date(),
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function markReceived(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.personLedgerEntry.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.personLedgerEntry.update({
    where: { id },
    data: { pending: false, date: new Date() },
  });
  revalidateAll();
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const owned = await prisma.personLedgerEntry.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return;
  await prisma.personLedgerEntry.delete({ where: { id } });
  revalidateAll();
}
