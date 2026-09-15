// Shared form fields used by both the create form and a row's inline edit form.
// Split out of the original monolithic RecurringManager.tsx — no behavior changed.

import { currentYearMonth, toMonthParam } from "@/lib/month";
import { inputCls, INTERVAL_OPTIONS, type CategoryOption } from "./shared";

export function AmountInput({
  defaultValue,
  testId,
  id,
}: {
  defaultValue?: number;
  testId?: string;
  id: string;
}) {
  return (
    <div className="flex min-h-[44px] items-center rounded-[10px] border border-inputborder bg-inputbg px-[10px] transition-colors focus-within:border-teal/45">
      <span className="text-[12px] text-faint2">Rs</span>
      <input
        id={id}
        data-testid={testId}
        name="amount"
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue}
        placeholder="0"
        className="num w-full min-w-[84px] border-none bg-transparent px-1 py-2 text-right text-[13.5px] font-semibold outline-none"
      />
    </div>
  );
}

export function CategorySelect({
  categories,
  defaultValue,
  testId,
  id,
}: {
  categories: CategoryOption[];
  defaultValue?: string;
  testId?: string;
  id: string;
}) {
  return (
    <select
      id={id}
      data-testid={testId}
      name="categoryId"
      defaultValue={defaultValue ?? categories[0]?.id}
      className={`${inputCls} w-full min-w-0`}
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

export function IntervalSelect({
  defaultValue,
  testId,
  id,
}: {
  defaultValue?: number;
  testId?: string;
  id: string;
}) {
  return (
    <select
      id={id}
      data-testid={testId}
      name="intervalMonths"
      defaultValue={String(defaultValue ?? 1)}
      className={`${inputCls} w-full min-w-0`}
    >
      {INTERVAL_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function StartMonthInput({
  defaultValue,
  testId,
  id,
}: {
  defaultValue?: string;
  testId?: string;
  id: string;
}) {
  return (
    <input
      id={id}
      data-testid={testId}
      name="startAt"
      type="month"
      defaultValue={defaultValue ?? toMonthParam(currentYearMonth())}
      className={`${inputCls} w-full min-w-0`}
    />
  );
}
