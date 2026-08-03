import { z } from "zod";
import { CATEGORY_KINDS, LEDGER_DIRECTIONS } from "./constants";

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
  kind: z.enum(CATEGORY_KINDS),
});

export const groupUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
  kind: z.enum(CATEGORY_KINDS),
});

export const categoryCreateSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
});

export const categoryUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
});

export const discretionaryTxnSchema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  description: z.string().trim().max(80).optional(),
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than 0"),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

// Known/savings planned item — same shape; category kind checked in the action.
export const knownTxnSchema = discretionaryTxnSchema;

export const recurringSchema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  description: z.string().trim().max(80).optional(),
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than 0"),
});

export const recurringUpdateSchema = recurringSchema.extend({
  id: z.string().min(1),
});

export const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
});

export const ledgerEntrySchema = z.object({
  personId: z.string().min(1),
  direction: z.enum(LEDGER_DIRECTIONS),
  description: z.string().trim().max(80).optional(),
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .positive("Amount must be greater than 0"),
});

export const fundSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name too long"),
  amount: z.coerce.number().min(0).optional(),
});
