"use client";

// Split out of the original monolithic RecurringManager.tsx — no behavior changed.

import { useActionState, useEffect, useRef } from "react";
import { currentYearMonth, toMonthParam } from "@/lib/month";
import { createRecurring, type ActionState } from "../actions";
import { AmountInput, CategorySelect, IntervalSelect, StartMonthInput } from "./fields";
import { inputCls, primaryBtn, type CategoryOption } from "./shared";

export function CreateForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createRecurring,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    const monthInput = formRef.current?.elements.namedItem(
      "startAt",
    ) as HTMLInputElement | null;
    if (monthInput) monthInput.value = toMonthParam(currentYearMonth());
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      data-testid="recurring-create-form"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)_160px_180px_180px_auto]"
    >
      <div className="min-w-0 sm:col-span-2 xl:col-span-1">
        <label
          htmlFor="recurring-create-description"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
        >
          Name
        </label>
        <input
          id="recurring-create-description"
          data-testid="recurring-create-description"
          name="description"
          placeholder="e.g. Health insurance premium"
          className={`${inputCls} w-full`}
        />
      </div>
      <div className="min-w-0">
        <label
          htmlFor="recurring-create-category"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
        >
          Category
        </label>
        <CategorySelect
          categories={categories}
          id="recurring-create-category"
          testId="recurring-create-category"
        />
      </div>
      <div className="min-w-0">
        <label
          htmlFor="recurring-create-amount"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
        >
          Amount
        </label>
        <AmountInput id="recurring-create-amount" testId="recurring-create-amount" />
      </div>
      <div className="min-w-0">
        <label
          htmlFor="recurring-create-interval"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
        >
          Repeats
        </label>
        <IntervalSelect id="recurring-create-interval" testId="recurring-create-interval" />
      </div>
      <div className="min-w-0">
        <label
          htmlFor="recurring-create-start"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
        >
          First due month
        </label>
        <StartMonthInput id="recurring-create-start" testId="recurring-create-start" />
      </div>
      <div className="flex items-end">
        <button
          data-testid="recurring-create-submit"
          type="submit"
          disabled={pending}
          className={`${primaryBtn} w-full xl:w-auto`}
        >
          Add recurring
        </button>
      </div>
      {state.error ? (
        <span
          data-testid="recurring-create-error"
          className="sm:col-span-2 xl:col-span-full text-[12.5px] text-clay"
        >
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
