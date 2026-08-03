"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { formatINR } from "@/lib/money";
import type { YearMonth } from "@/lib/month";
import {
  addDiscretionaryTxn,
  deleteTxn,
  setCap,
  type ActionState,
} from "./actions";

export type Row = {
  id: string;
  n: string;
  description: string;
  categoryName: string;
  amountPaise: number;
};
export type CategoryOption = { id: string; name: string };

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-[10px] text-[13.5px] outline-none";

function RemoveButton({ id }: { id: string }) {
  const [, action, pending] = useActionState<ActionState, FormData>(deleteTxn, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        title="Remove"
        className="rounded-[6px] px-1.5 py-1 text-[13px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay disabled:opacity-50"
      >
        ✕
      </button>
    </form>
  );
}

function CapEditor({
  month,
  capPaise,
  suggestedCapPaise,
}: {
  month: YearMonth;
  capPaise: number | null;
  suggestedCapPaise: number;
}) {
  const [, action, pending] = useActionState<ActionState, FormData>(setCap, {});
  const capRupees = capPaise != null ? Math.round(capPaise / 100) : "";
  const suggestion = Math.round(suggestedCapPaise / 100);

  return (
    <form action={action} className="flex items-center gap-[6px] text-[12.5px] text-muted">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <span>Monthly cap</span>
      <div className="flex items-center rounded-[8px] border border-inputborder bg-inputbg px-[7px]">
        <span className="text-[12px] text-faint2">₹</span>
        <input
          name="cap"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          defaultValue={capRupees}
          placeholder={suggestion > 0 ? String(suggestion) : "0"}
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          className="num w-[64px] border-none bg-transparent px-1 py-[6px] text-right text-[12.5px] font-semibold outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[7px] bg-teal px-2 py-[5px] text-[11px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        {pending ? "…" : "Set"}
      </button>
    </form>
  );
}

function AddRow({
  month,
  categories,
}: {
  month: YearMonth;
  categories: CategoryOption[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addDiscretionaryTxn,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-4">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="categoryId" className={inputCls} defaultValue={categories[0]?.id}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="description"
          placeholder="What did you spend on?"
          className={`${inputCls} min-w-[160px] flex-1`}
        />
        <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[10px]">
          <span className="text-[13px] text-faint2">₹</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className="num w-[90px] border-none bg-transparent px-1 py-[10px] text-right text-[13.5px] font-semibold outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-teal px-[17px] py-[10px] text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-[12px] text-clay">{state.error}</p>
      ) : null}
    </form>
  );
}

export default function OtherSpending({
  month,
  categories,
  rows,
  totalPaise,
  capPaise,
  suggestedCapPaise,
}: {
  month: YearMonth;
  categories: CategoryOption[];
  rows: Row[];
  totalPaise: number;
  capPaise: number | null;
  suggestedCapPaise: number;
}) {
  const hasCap = capPaise != null && capPaise > 0;
  const over = hasCap && totalPaise > capPaise;
  const pct = hasCap ? Math.min(100, Math.round((totalPaise / capPaise) * 100)) : 0;
  const accent = over ? "#b07a68" : "#4f7c6b";

  return (
    <section className="rounded-card bg-card p-[20px_22px] shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-extrabold tracking-[-.01em]">
          Other spending
        </h2>
        <CapEditor
          month={month}
          capPaise={capPaise}
          suggestedCapPaise={suggestedCapPaise}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-baseline gap-[9px]">
        <span
          className="num text-[24px] font-extrabold tracking-[-.02em]"
          style={{ color: over ? "#b07a68" : "var(--color-ink)" }}
        >
          {formatINR(totalPaise)}
        </span>
        {hasCap ? (
          <span className="text-[13px] text-faint">
            / <span className="num">{formatINR(capPaise)}</span>
          </span>
        ) : (
          <span className="text-[13px] text-faint">spent · {rows.length} item{rows.length === 1 ? "" : "s"}</span>
        )}
        {hasCap ? (
          <span
            className="num ml-auto rounded-full px-[9px] py-[3px] text-[12px] font-bold"
            style={{
              color: accent,
              background: over ? "#f3e7e1" : "#e4efe9",
            }}
          >
            {over
              ? `${formatINR(totalPaise - capPaise)} over`
              : `${formatINR(capPaise - totalPaise)} left`}
          </span>
        ) : suggestedCapPaise > 0 ? (
          <span className="ml-auto text-[12px] text-faint">
            Suggested cap {formatINR(suggestedCapPaise)} (last month)
          </span>
        ) : null}
      </div>

      {hasCap ? (
        <div className="mb-4 h-[7px] overflow-hidden rounded-full bg-track">
          <div
            className="animate-bar-grow h-full rounded-full"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      ) : null}

      {categories.length === 0 ? (
        <p className="py-3 text-[13px] text-secondary">
          No discretionary categories yet. Add one under{" "}
          <Link href="/categories" className="font-semibold text-teal">
            Categories
          </Link>{" "}
          (a group with kind “Discretionary”).
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {rows.length === 0 ? (
              <p className="py-3 text-[12.5px] text-faint">
                Nothing logged yet this month.
              </p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border-t border-divider py-2"
                >
                  <span className="num w-[18px] text-[11px] text-icondim">
                    {r.n}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                    {r.description || (
                      <span className="text-faint">(no description)</span>
                    )}
                    <span className="ml-2 text-[11.5px] text-faint">
                      {r.categoryName}
                    </span>
                  </span>
                  <span className="num text-[13px] font-semibold">
                    {formatINR(r.amountPaise)}
                  </span>
                  <RemoveButton id={r.id} />
                </div>
              ))
            )}
          </div>
          <AddRow month={month} categories={categories} />
        </>
      )}
    </section>
  );
}
