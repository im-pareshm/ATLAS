"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/money";
import {
  createRecurring,
  updateRecurring,
  toggleRecurring,
  deleteRecurring,
  type ActionState,
} from "./actions";

export type CategoryOption = { id: string; label: string };
export type TemplateDTO = {
  id: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  amountPaise: number;
  isActive: boolean;
};

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13.5px] outline-none";
const ghostBtn =
  "rounded-[7px] px-2 py-1 text-[12px] text-secondary transition-colors hover:bg-divider";

function AmountInput({ defaultValue }: { defaultValue?: number }) {
  return (
    <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[8px]">
      <span className="text-[12px] text-faint2">₹</span>
      <input
        name="amount"
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue}
        placeholder="0"
        className="num w-[84px] border-none bg-transparent px-1 py-2 text-right text-[13.5px] font-semibold outline-none"
      />
    </div>
  );
}

function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: CategoryOption[];
  defaultValue?: string;
}) {
  return (
    <select
      name="categoryId"
      defaultValue={defaultValue ?? categories[0]?.id}
      className={inputCls}
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function CreateForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createRecurring,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="description"
        placeholder="e.g. Netflix, 2L loan EMI, SIP"
        className={`${inputCls} min-w-[180px] flex-1`}
      />
      <CategorySelect categories={categories} />
      <AmountInput />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-teal px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        Add monthly
      </button>
      {state.error ? (
        <span className="text-[12.5px] text-clay">{state.error}</span>
      ) : null}
    </form>
  );
}

function TemplateRow({
  template,
  categories,
}: {
  template: TemplateDTO;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateRecurring,
    {},
  );
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  if (editing) {
    return (
      <form
        action={action}
        className="flex flex-wrap items-center gap-2 border-t border-divider py-3"
      >
        <input type="hidden" name="id" value={template.id} />
        <input
          name="description"
          defaultValue={template.description}
          placeholder="Description"
          className={`${inputCls} min-w-[160px] flex-1`}
        />
        <CategorySelect categories={categories} defaultValue={template.categoryId} />
        <AmountInput defaultValue={Math.round(template.amountPaise / 100)} />
        <button type="submit" disabled={pending} className={ghostBtn}>
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className={ghostBtn}>
          Cancel
        </button>
        {state.error ? (
          <span className="text-[12px] text-clay">{state.error}</span>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-divider py-3">
      <div className="min-w-0 flex-1">
        <div className={"text-[14px] font-medium" + (template.isActive ? "" : " text-faint")}>
          {template.description || (
            <span className="text-faint">(no description)</span>
          )}
        </div>
        <div className="text-[11.5px] text-faint">{template.categoryLabel}</div>
      </div>
      <span className="num text-[13.5px] font-semibold">
        {formatINR(template.amountPaise)}
        <span className="text-[11px] font-normal text-faint">/mo</span>
      </span>
      <form action={toggleRecurring}>
        <input type="hidden" name="id" value={template.id} />
        <button
          type="submit"
          className={
            "rounded-full px-[9px] py-[3px] text-[11px] font-bold " +
            (template.isActive
              ? "bg-mint-tint text-teal"
              : "bg-divider text-muted")
          }
          title={template.isActive ? "Active — click to pause" : "Paused — click to activate"}
        >
          {template.isActive ? "Active" : "Paused"}
        </button>
      </form>
      <button type="button" onClick={() => setEditing(true)} className={ghostBtn}>
        Edit
      </button>
      <form action={deleteRecurring}>
        <input type="hidden" name="id" value={template.id} />
        <button
          type="submit"
          title="Delete template"
          className="rounded-[7px] px-2 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
        >
          ✕
        </button>
      </form>
    </div>
  );
}

export default function RecurringManager({
  categories,
  templates,
}: {
  categories: CategoryOption[];
  templates: TemplateDTO[];
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-card bg-card p-5 text-[13px] text-secondary shadow-card">
        Add a known-expense, savings, or discretionary category first under{" "}
        <Link href="/categories" className="font-semibold text-teal">
          Categories
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <CreateForm categories={categories} />
      </div>
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        {templates.length === 0 ? (
          <p className="py-2 text-[13px] text-faint">
            No recurring templates yet. Add one above — it&apos;ll generate this
            month&apos;s item automatically.
          </p>
        ) : (
          templates.map((t) => (
            <TemplateRow key={t.id} template={t} categories={categories} />
          ))
        )}
      </div>
    </div>
  );
}
