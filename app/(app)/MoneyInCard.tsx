"use client";

import { useActionState } from "react";
import { formatINR } from "@/lib/money";
import type { YearMonth } from "@/lib/month";
import { setMonthIncome, type ActionState } from "./actions";

function RupeeInput({ name, defaultValue }: { name: string; defaultValue: number }) {
  return (
    <div className="flex items-center rounded-[8px] border border-line bg-inputbg px-2">
      <span className="text-[12px] text-faint2">₹</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        defaultValue={defaultValue || ""}
        placeholder="0"
        // Desktop convenience: save when you click away. Mobile has the Save button.
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        className="num w-[90px] border-none bg-transparent px-1 py-[6px] text-right text-[12.5px] font-semibold outline-none"
      />
    </div>
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

  return (
    <div className="rounded-card bg-card p-[18px_20px] shadow-card">
      <div className="mb-3 flex items-center gap-[9px]">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-mint-tint text-teal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">Income</span>
          <RupeeInput name="income" defaultValue={Math.round(incomePaise / 100)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">Additional</span>
          <RupeeInput name="additional" defaultValue={Math.round(additionalPaise / 100)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">Carry-in + received</span>
          <span className="num text-[12.5px] font-semibold text-strong">
            {formatINR(carryInPlusReceivedPaise)}
          </span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 self-end rounded-[9px] bg-teal px-4 py-[7px] text-[12.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
