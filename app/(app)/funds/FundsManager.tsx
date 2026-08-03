"use client";

import { useActionState, useEffect, useRef } from "react";
import { formatINR } from "@/lib/money";
import { addFund, updateFundBalance, deleteFund, type ActionState } from "./actions";

export type FundDTO = { id: string; name: string; balancePaise: number };

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13px] outline-none";

function BalanceInput({ id, balancePaise }: { id: string; balancePaise: number }) {
  return (
    <form action={updateFundBalance} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center rounded-[8px] border border-line bg-inputbg px-2">
        <span className="text-[12px] text-faint2">₹</span>
        <input
          name="balance"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          defaultValue={balancePaise ? Math.round(balancePaise / 100) : ""}
          placeholder="0"
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          className="num w-[96px] border-none bg-transparent px-1 py-[6px] text-right text-[12.5px] font-semibold outline-none"
        />
      </div>
      <button
        type="submit"
        title="Save balance"
        className="rounded-[7px] bg-mint-tint px-2 py-[5px] text-[12px] font-bold text-teal transition-colors hover:bg-teal hover:text-white"
      >
        ✓
      </button>
    </form>
  );
}

function AddFundForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addFund, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        placeholder="Fund name (e.g. Bike fund)"
        className={`${inputCls} min-w-[180px] flex-1`}
      />
      <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[8px]">
        <span className="text-[12px] text-faint2">₹</span>
        <input
          name="amount"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          className="num w-[96px] border-none bg-transparent px-1 py-2 text-right text-[13px] font-semibold outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-teal px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        Add fund
      </button>
      {state.error ? (
        <span className="text-[12.5px] text-clay">{state.error}</span>
      ) : null}
    </form>
  );
}

export default function FundsManager({
  funds,
  totalPaise,
}: {
  funds: FundDTO[];
  totalPaise: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <AddFundForm />
      </div>

      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[15.5px] font-bold">Savings &amp; funds</h2>
          <span className="num text-[13px] font-bold text-teal">
            {formatINR(totalPaise)}
          </span>
        </div>
        {funds.length === 0 ? (
          <p className="py-2 text-[12.5px] text-faint">
            No funds yet. Add one above to track a savings balance.
          </p>
        ) : (
          funds.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 border-t border-divider py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
              <BalanceInput id={f.id} balancePaise={f.balancePaise} />
              <form action={deleteFund}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  title="Delete fund"
                  className="rounded-[6px] px-1.5 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
                >
                  ✕
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <p className="text-[12px] text-faint">
        A net-position snapshot — these balances are informational and are{" "}
        <span className="font-semibold">not</span> part of the monthly cash math.
      </p>
    </div>
  );
}
