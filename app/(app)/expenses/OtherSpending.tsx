"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
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
  "atlas-focus-ring atlas-input rounded-[10px] border border-inputborder bg-inputbg px-3 py-[10px] text-[13.5px] outline-none";

function RemoveButton({ id }: { id: string }) {
  const [, action, pending] = useActionState<ActionState, FormData>(deleteTxn, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Remove transaction"
        title="Remove"
        className="atlas-focus-ring atlas-icon-button text-[13px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay disabled:opacity-50"
      >
        ×
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
  // 0 (or no row) = no cap: show the field empty so the suggestion placeholder reads.
  const capRupees = capPaise != null && capPaise > 0 ? Math.round(capPaise / 100) : "";
  const suggestion = Math.round(suggestedCapPaise / 100);
  const inputId = useId();

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[auto_120px_auto] sm:items-center">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <label htmlFor={inputId} className="text-[12.5px] font-medium text-muted">
        Monthly cap
      </label>
      <div className="flex min-h-[44px] items-center rounded-[8px] border border-inputborder bg-inputbg px-[7px]">
        <span className="text-[12px] text-faint2">₹</span>
        <input
          id={inputId}
          name="cap"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          defaultValue={capRupees}
          placeholder={suggestion > 0 ? String(suggestion) : "0"}
          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          className="num w-full border-none bg-transparent px-1 py-[6px] text-right text-[12.5px] font-semibold outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="atlas-focus-ring atlas-touch rounded-[7px] bg-teal px-3 text-[11px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        {pending ? "Saving" : "Set"}
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
  const categoryId = useId();
  const descriptionId = useId();
  const amountId = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-4">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_auto] md:items-end">
        <div className="min-w-0">
          <label htmlFor={categoryId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Category
          </label>
          <select id={categoryId} name="categoryId" className={`${inputCls} w-full`} defaultValue={categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={descriptionId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Description
          </label>
          <input
            id={descriptionId}
            name="description"
            placeholder="What did you spend on?"
            className={`${inputCls} w-full`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={amountId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Amount
          </label>
          <div className="flex min-h-[44px] items-center rounded-[10px] border border-inputborder bg-inputbg px-[10px]">
            <span className="text-[13px] text-faint2">₹</span>
            <input
              id={amountId}
              name="amount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="num w-full border-none bg-transparent px-1 py-[10px] text-right text-[13.5px] font-semibold outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="atlas-focus-ring atlas-touch rounded-[10px] bg-teal px-[17px] text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
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
  const accent = over ? "var(--color-clay)" : "var(--color-teal)";
  const accentBg = over ? "var(--color-clay-tint)" : "var(--color-mint-tint)";

  return (
    <section className="rounded-card bg-card p-[20px_22px] shadow-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
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
          style={{ color: over ? "var(--color-clay)" : "var(--color-ink)" }}
        >
          {formatINR(totalPaise)}
        </span>
        {hasCap ? (
          <span className="text-[13px] text-faint">
            / <span className="num">{formatINR(capPaise)}</span>
          </span>
        ) : (
          <span className="text-[13px] text-faint">
            spent · {rows.length} item{rows.length === 1 ? "" : "s"}
          </span>
        )}
        {hasCap ? (
          <span
            className="num ml-auto rounded-full px-[9px] py-[3px] text-[12px] font-bold"
            style={{ color: accent, background: accentBg }}
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
          <Link href="/categories" className="atlas-focus-ring font-semibold text-teal">
            Categories
          </Link>{" "}
          (a group with kind &quot;Discretionary&quot;).
        </p>
      ) : (
        <>
          <div data-testid="expenses-list" className="flex flex-col">
            {rows.length === 0 ? (
              <p className="py-3 text-[12.5px] text-faint">
                Nothing logged yet this month.
              </p>
            ) : (
              rows.map((r, i) => (
                <div
                  key={r.id}
                  data-testid={`expenses-txn-${i}`}
                  className="flex flex-wrap items-center gap-2 border-t border-divider py-3 sm:flex-nowrap sm:gap-3"
                >
                  <span className="num w-[24px] text-[11px] text-icondim">
                    {r.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div data-testid="txn-description" className="truncate text-[13.5px] font-medium">
                      {r.description || (
                        <span className="text-faint">(no description)</span>
                      )}
                    </div>
                    <div data-testid="txn-category" className="text-[11.5px] text-faint">
                      {r.categoryName}
                    </div>
                  </div>
                  <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
                    <span data-testid="txn-amount" className="num text-[13px] font-semibold">
                      {formatINR(r.amountPaise)}
                    </span>
                    <RemoveButton id={r.id} />
                  </div>
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
