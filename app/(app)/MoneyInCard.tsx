"use client";

import { useActionState, useId } from "react";
import { formatINR } from "@/lib/money";
import type { YearMonth } from "@/lib/month";
import { setMonthIncome, type ActionState } from "./actions";

function RupeeInput({
  name,
  defaultValue,
  id,
  label,
}: {
  name: string;
  defaultValue: number;
  id: string;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-2">
      <span className="text-[12.5px] text-muted">{label}</span>
      <div className="flex min-h-[44px] items-center rounded-[8px] border border-line bg-inputbg px-2">
        <span className="text-[12px] text-faint2">₹</span>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          defaultValue={defaultValue || ""}
          placeholder="0"
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          className="num w-full min-w-[88px] border-none bg-transparent px-1 py-[6px] text-right text-[12.5px] font-semibold outline-none"
        />
      </div>
    </label>
  );
}

export default function MoneyInCard({
  month,
  moneyInPaise,
  incomePaise,
  additionalPaise,
  carryInPlusReceivedPaise,
}: {
  month: YearMonth;
  moneyInPaise: number;
  incomePaise: number;
  additionalPaise: number;
  carryInPlusReceivedPaise: number;
}) {
  const [, action, pending] = useActionState<ActionState, FormData>(
    setMonthIncome,
    {},
  );
  const incomeId = useId();
  const additionalId = useId();

  return (
    <div className="rounded-card bg-card p-[18px_20px] shadow-card">
      <div className="mb-3 flex items-center gap-[9px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-mint-tint text-teal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-secondary">Money in</span>
      </div>

      <div className="num mb-[14px] text-[28px] font-extrabold tracking-[-.02em] text-teal">
        {formatINR(moneyInPaise)}
      </div>

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="year" value={month.year} />
        <input type="hidden" name="month" value={month.month} />
        <RupeeInput
          id={incomeId}
          name="income"
          label="Income"
          defaultValue={Math.round(incomePaise / 100)}
        />
        <RupeeInput
          id={additionalId}
          name="additional"
          label="Additional"
          defaultValue={Math.round(additionalPaise / 100)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">Carry-in + received</span>
          <span className="num text-[12.5px] font-semibold text-strong">
            {formatINR(carryInPlusReceivedPaise)}
          </span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="atlas-focus-ring atlas-touch mt-1 self-end rounded-[9px] bg-teal px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
