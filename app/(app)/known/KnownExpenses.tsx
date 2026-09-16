"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { formatINR } from "@/lib/money";
import type { YearMonth } from "@/lib/month";
import type { TxnStatus } from "@/lib/constants";
import {
  addKnownItem,
  setKnownStatus,
  deleteKnownItem,
  type ActionState,
} from "./actions";

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
  "atlas-focus-ring atlas-input rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13px] outline-none";

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
      aria-hidden="true"
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
        aria-label={paid ? "Mark unpaid" : "Mark paid"}
        title={paid ? "Mark unpaid" : "Mark paid"}
        className="atlas-focus-ring flex h-8 w-8 items-center justify-center rounded-[9px] border text-[11px] font-semibold text-white transition-all disabled:opacity-40"
        style={{
          borderColor: paid ? color : "var(--color-inputborder)",
          background: paid ? color : "transparent",
          color: paid ? "white" : "transparent",
        }}
      >
        {paid ? "✓" : ""}
      </button>
    </form>
  );
}

function SkipButton({ id, status }: { id: string; status: TxnStatus }) {
  const skipped = status === "SKIPPED";
  const target: TxnStatus = skipped ? "PENDING" : "SKIPPED";

  return (
    <form action={setKnownStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={target} />
      <button
        type="submit"
        aria-label={skipped ? "Restore item" : "Skip item"}
        title={skipped ? "Restore" : "Skip"}
        className="atlas-focus-ring flex h-8 w-8 items-center justify-center rounded-[8px] text-[12px] text-icondim transition-colors hover:bg-divider hover:text-secondary"
      >
        {skipped ? "↺" : "×"}
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
        aria-label="Delete item"
        title="Delete"
        className="atlas-focus-ring flex h-8 w-8 items-center justify-center rounded-[8px] text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
      >
        ×
      </button>
    </form>
  );
}

function ItemRow({ item, color }: { item: ItemDTO; color: string }) {
  const skipped = item.status === "SKIPPED";

  return (
    <div
      data-testid={`known-item-${item.id}`}
      className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-divider py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center"
    >
      <StatusButton id={item.id} status={item.status} color={color} />

      <div className="min-w-0">
        {/* Status is otherwise conveyed only visually (tick / strikethrough). */}
        <span data-testid="item-status" className="sr-only">
          {item.status}
        </span>
        <div
          data-testid="item-description"
          className="text-[14px] font-semibold leading-[1.25]"
          style={
            skipped
              ? { textDecoration: "line-through", color: "var(--color-struck)" }
              : undefined
          }
        >
          {item.label}
        </div>
        <div data-testid="item-category" className="mt-1 text-[11.5px] text-faint">
          {item.categoryName}
        </div>
      </div>

      <div className="col-start-2 flex items-center justify-between gap-2 sm:col-start-3 sm:justify-end sm:gap-1">
        <span
          data-testid="item-amount"
          className="num text-[13.5px] font-bold text-strong"
          style={
            skipped
              ? { textDecoration: "line-through", color: "var(--color-icondim)" }
              : undefined
          }
        >
          {formatINR(item.amountPaise)}
        </span>
        <div className="flex items-center gap-1">
          <SkipButton id={item.id} status={item.status} />
          <DeleteButton id={item.id} />
        </div>
      </div>
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
  const descriptionId = useId();
  const categoryId = useId();
  const amountId = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-5 border-t border-divider pt-4">
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label
              htmlFor={descriptionId}
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
            >
              Description
            </label>
            <input
              id={descriptionId}
              name="description"
              placeholder="Add planned item..."
              className={`${inputCls} w-full`}
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor={categoryId}
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
            >
              Category
            </label>
            <select
              id={categoryId}
              name="categoryId"
              defaultValue={categories[0]?.id}
              className={`${inputCls} w-full`}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,140px)_auto] sm:items-end">
          <div className="min-w-0">
            <label
              htmlFor={amountId}
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
            >
              Amount
            </label>
            <div className="flex min-h-[44px] items-center rounded-[10px] border border-inputborder bg-inputbg px-[10px]">
              <span className="text-[12px] text-faint2">₹</span>
              <input
                id={amountId}
                name="amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="num w-full border-none bg-transparent px-1 py-2 text-right text-[13px] font-semibold outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="atlas-focus-ring atlas-touch rounded-[10px] bg-mint-tint px-4 text-[12.5px] font-bold text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-60"
          >
            Add item
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="mt-2 text-[12px] text-clay">{state.error}</p>
      ) : null}
    </form>
  );
}

// Stable hook for tests: "EMI & loans" -> known-bucket-emi-loans (see tests/helpers/selectors.ts).
function bucketTestId(name: string): string {
  return `known-bucket-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function BucketHeader({ bucket }: { bucket: BucketDTO }) {
  const remainingCount = Math.max(0, bucket.activeCount - bucket.doneCount);
  const accentColor = bucket.color;

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]"
            style={{ background: bucket.tint }}
          >
            <BucketIcon color={bucket.color} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold leading-[1.2]">
              {bucket.name}
            </h3>
            <p className="mt-1 text-[12px] text-faint">
              {bucket.doneCount} of {bucket.activeCount} paid
            </p>
          </div>
        </div>

        <div className="min-w-fit text-right">
          <div className="num text-[18px] font-extrabold tracking-[-0.02em] text-strong">
            {formatINR(bucket.paidPaise)}
          </div>
          <p className="mt-1 text-[11.5px] text-faint2">
            of {formatINR(bucket.plannedPaise)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold"
          style={{ background: bucket.tint, color: accentColor }}
        >
          {remainingCount === 0
            ? "All cleared"
            : `${remainingCount} left to clear`}
        </span>
        <span className="text-[11.5px] font-medium text-faint2">
          {bucket.pct}% complete
        </span>
      </div>
    </div>
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
        No known-expense buckets yet. Create a group with kind &quot;Known
        expense&quot; or &quot;Savings&quot; under{" "}
        <Link
          href="/categories"
          className="atlas-focus-ring font-semibold text-teal"
        >
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
          <span className="num font-bold text-ink">
            {formatINR(knownPaidPaise)}
          </span>{" "}
          paid of <span className="num">{formatINR(knownPlannedPaise)}</span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,326px),1fr))] gap-4">
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            data-testid={bucketTestId(bucket.name)}
            className="rounded-card bg-card p-[20px_20px_18px] shadow-card"
          >
            <BucketHeader bucket={bucket} />

            <div className="mb-4 h-[6px] overflow-hidden rounded-full bg-track">
              <div
                className="animate-bar-grow h-full rounded-full"
                style={{ width: `${bucket.pct}%`, background: bucket.color }}
              />
            </div>

            <div className="flex flex-col">
              {bucket.items.length === 0 ? (
                <p className="py-2 text-[12.5px] text-faint">
                  No items this month.
                </p>
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
