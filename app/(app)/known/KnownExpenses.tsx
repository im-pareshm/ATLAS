"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { formatINR } from "@/lib/money";
import type { YearMonth } from "@/lib/month";
import type { TxnStatus } from "@/lib/constants";
import { addKnownItem, setKnownStatus, deleteKnownItem, type ActionState } from "./actions";

export type ItemDTO = {
  id: string;
  label: string;
  categoryName: string;
  amountPaise: number;
  status: TxnStatus;
};
export type BucketDTO = {
  id: string;
  name: string;
  color: string;
  tint: string;
  categories: { id: string; name: string }[];
  items: ItemDTO[];
  plannedPaise: number;
  paidPaise: number;
  pct: number;
  doneCount: number;
  activeCount: number;
};

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13px] outline-none";

function BucketIcon({ color }: { color: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
    </svg>
  );
}

function StatusButton({
  id,
  status,
  color,
}: {
  id: string;
  status: TxnStatus;
  color: string;
}) {
  const paid = status === "PAID";
  const skipped = status === "SKIPPED";
  const target: TxnStatus = paid ? "PENDING" : "PAID";
  return (
    <form action={setKnownStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={target} />
      <button
        type="submit"
        disabled={skipped}
        title={paid ? "Mark unpaid" : "Mark paid"}
        className="flex h-5 w-5 items-center justify-center rounded-[7px] border-[1.5px] text-[12px] text-white transition-all disabled:opacity-40"
        style={{
          borderColor: paid ? color : "var(--color-inputborder)",
          background: paid ? color : "var(--color-card)",
        }}
      >
        {paid ? "✓" : ""}
      </button>
    </form>
  );
}

function CancelButton({ id, status }: { id: string; status: TxnStatus }) {
  const skipped = status === "SKIPPED";
  const target: TxnStatus = skipped ? "PENDING" : "SKIPPED";
  return (
    <form action={setKnownStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={target} />
      <button
        type="submit"
        title={skipped ? "Restore" : "Cancel"}
        className="rounded-[6px] px-1.5 py-1 text-[12px] text-icondim transition-colors hover:bg-divider hover:text-secondary"
      >
        {skipped ? "↺" : "✕"}
      </button>
    </form>
  );
}

function DeleteButton({ id }: { id: string }) {
  return (
    <form action={deleteKnownItem}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Delete"
        className="rounded-[6px] px-1.5 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
      >
        🗑
      </button>
    </form>
  );
}

function ItemRow({ item, color }: { item: ItemDTO; color: string }) {
  const skipped = item.status === "SKIPPED";
  return (
    <div className="flex items-center gap-3 border-t border-divider py-2">
      <StatusButton id={item.id} status={item.status} color={color} />
      <div className="min-w-0 flex-1">
        <div
          className="text-[13.5px] font-medium"
          style={
            skipped
              ? { textDecoration: "line-through", color: "#b6b9c4" }
              : undefined
          }
        >
          {item.label}
        </div>
        {item.label !== item.categoryName ? (
          <div className="text-[11px] text-faint">{item.categoryName}</div>
        ) : null}
      </div>
      <span
        className="num text-[13px] font-semibold"
        style={
          skipped
            ? { textDecoration: "line-through", color: "#b9c0bc" }
            : undefined
        }
      >
        {formatINR(item.amountPaise)}
      </span>
      <CancelButton id={item.id} status={item.status} />
      <DeleteButton id={item.id} />
    </div>
  );
}

function AddItemForm({
  month,
  categories,
}: {
  month: YearMonth;
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addKnownItem,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-3 border-t border-divider pt-3">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="description"
          placeholder="Add planned item…"
          className={`${inputCls} w-full sm:w-auto sm:min-w-0 sm:flex-1`}
        />
        <select name="categoryId" defaultValue={categories[0]?.id} className={inputCls}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[8px]">
          <span className="text-[12px] text-faint2">₹</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className="num w-[72px] border-none bg-transparent px-1 py-2 text-right text-[13px] font-semibold outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[8px] px-2 py-2 text-[12px] font-semibold text-secondary transition-colors hover:bg-divider disabled:opacity-60"
        >
          + Add
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-[12px] text-clay">{state.error}</p>
      ) : null}
    </form>
  );
}

export default function KnownExpenses({
  month,
  buckets,
  knownPaidPaise,
  knownPlannedPaise,
}: {
  month: YearMonth;
  buckets: BucketDTO[];
  knownPaidPaise: number;
  knownPlannedPaise: number;
}) {
  if (buckets.length === 0) {
    return (
      <p className="rounded-card bg-card p-5 text-[13px] text-secondary shadow-card">
        No known-expense buckets yet. Create a group with kind “Known expense” or
        “Savings” under{" "}
        <Link href="/categories" className="font-semibold text-teal">
          Categories
        </Link>
        .
      </p>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-[-.01em]">
          Known expenses
        </h2>
        <div className="text-[13px] text-muted">
          <span className="num font-bold text-ink">{formatINR(knownPaidPaise)}</span>{" "}
          paid of <span className="num">{formatINR(knownPlannedPaise)}</span>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,326px),1fr))] gap-4">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="rounded-card bg-card p-[18px_20px] shadow-card">
            <BucketHeader bucket={bucket} />
            <div className="mb-3 h-[6px] overflow-hidden rounded-full bg-track">
              <div
                className="animate-bar-grow h-full rounded-full"
                style={{ width: `${bucket.pct}%`, background: bucket.color }}
              />
            </div>
            <div className="flex flex-col">
              {bucket.items.length === 0 ? (
                <p className="py-2 text-[12.5px] text-faint">No items this month.</p>
              ) : (
                bucket.items.map((item) => (
                  <ItemRow key={item.id} item={item} color={bucket.color} />
                ))
              )}
            </div>
            {bucket.categories.length > 0 ? (
              <AddItemForm month={month} categories={bucket.categories} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function BucketHeader({ bucket }: { bucket: BucketDTO }) {
  return (
    <div className="mb-3 flex items-center gap-[11px]">
      <div
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]"
        style={{ background: bucket.tint }}
      >
        <BucketIcon color={bucket.color} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15.5px] font-bold">{bucket.name}</h3>
        <div className="text-[12px] text-faint">
          {bucket.doneCount} of {bucket.activeCount} paid
        </div>
      </div>
      <div className="num text-right text-[13.5px] font-bold">
        {formatINR(bucket.paidPaise)}
        <div className="text-[11.5px] font-medium text-faint2">
          of {formatINR(bucket.plannedPaise)}
        </div>
      </div>
    </div>
  );
}
