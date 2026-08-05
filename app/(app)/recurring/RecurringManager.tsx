"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
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
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13.5px] outline-none transition-colors placeholder:text-faint2 focus:border-teal/45 focus-visible:outline-none";
const actionBtn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12px] font-semibold text-secondary transition-all hover:bg-divider hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,107,0.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";
const primaryBtn =
  "inline-flex h-9 items-center justify-center rounded-[10px] bg-teal px-4 text-[13px] font-bold text-white transition-colors hover:bg-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,107,0.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const subtleBtn =
  "inline-flex h-9 items-center justify-center rounded-[10px] border border-inputborder bg-card px-4 text-[13px] font-semibold text-secondary transition-colors hover:bg-divider hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,107,0.2)] active:scale-[0.98]";
const dangerBtn =
  "inline-flex h-9 items-center justify-center rounded-[10px] bg-[rgba(176,122,104,0.14)] px-4 text-[13px] font-semibold text-clay transition-colors hover:bg-[rgba(176,122,104,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(176,122,104,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

function PauseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 4H6v16h4z" />
      <path d="M18 4h-4v16h4z" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8 5 11 7-11 7z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d78b14"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function AmountInput({ defaultValue }: { defaultValue?: number }) {
  return (
    <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[10px] transition-colors focus-within:border-teal/45">
      <span className="text-[12px] text-faint2">Rs</span>
      <input
        name="amount"
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue}
        placeholder="0"
        className="num w-[96px] border-none bg-transparent px-1 py-2 text-right text-[13.5px] font-semibold outline-none"
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
      className={`${inputCls} min-w-[220px]`}
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const dotColor = isActive ? "#4f7c6b" : "#d78b14";
  const bgColor = isActive ? "rgba(79,124,107,0.14)" : "rgba(245,158,11,0.14)";
  const textColor = isActive ? "#4f7c6b" : "#d78b14";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-[10px] py-[5px] text-[11.5px] font-semibold"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {isActive ? "Active" : "Paused"}
    </span>
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
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="description"
        placeholder="e.g. Netflix, 2L loan EMI, SIP"
        className={`${inputCls} min-w-[180px] flex-1`}
      />
      <CategorySelect categories={categories} />
      <AmountInput />
      <button type="submit" disabled={pending} className={primaryBtn}>
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
  const formId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [menuOpen, setMenuOpen] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const [optimisticActive, setOptimisticActive] = useOptimistic(template.isActive);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateRecurring(prev, formData);
      if (result.ok) setMode("view");
      return result;
    },
    {},
  );

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isEditing = mode === "edit";
  const isDeleteConfirming = mode === "delete";
  const description = template.description || "(no description)";

  function handleToggle() {
    const next = !template.isActive;
    startTransition(async () => {
      setTogglePending(true);
      setOptimisticActive(next);
      const formData = new FormData();
      formData.set("id", template.id);
      try {
        await toggleRecurring(formData);
      } finally {
        setTogglePending(false);
      }
    });
  }

  function handleStartEdit() {
    setMenuOpen(false);
    setMode("edit");
  }

  function handleStartDelete() {
    setMenuOpen(false);
    setMode("delete");
  }

  function handleCancelInlineState() {
    setMode("view");
  }

  return (
    <div className="border-t border-divider py-4 first:border-t-0">
      <div className="grid gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1.2fr)_120px_120px_220px] md:items-center">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-strong">
            {description}
          </div>
          <div className="truncate text-[11.5px] text-faint">
            {template.categoryLabel}
          </div>
        </div>

        <div className="hidden min-w-0 text-[13px] text-secondary md:block">
          <span className="truncate">{template.categoryLabel}</span>
        </div>

        <div className="num text-[13.5px] font-semibold text-strong">
          {formatINR(template.amountPaise)}
          <span className="ml-1 text-[11px] font-normal text-faint">/mo</span>
        </div>

        <div>
          <StatusBadge isActive={optimisticActive} />
        </div>

        <div
          className="relative flex min-h-9 items-center justify-start gap-2 md:justify-end"
          ref={menuRef}
        >
          {isEditing ? (
            <>
              <button
                type="button"
                form={formId}
                disabled={pending}
                className={primaryBtn}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelInlineState}
                className={subtleBtn}
              >
                Cancel
              </button>
            </>
          ) : isDeleteConfirming ? (
            <>
              <button
                type="button"
                onClick={handleCancelInlineState}
                className={subtleBtn}
              >
                Cancel
              </button>
              <form action={deleteRecurring}>
                <input type="hidden" name="id" value={template.id} />
                <button type="submit" className={dangerBtn}>
                  Delete
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleToggle}
                disabled={togglePending}
                className={actionBtn}
              >
                {optimisticActive ? <PauseIcon /> : <ResumeIcon />}
                {optimisticActive ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                className={actionBtn}
              >
                <EditIcon />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`More actions for ${description}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition-all hover:bg-divider hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(79,124,107,0.32)] active:scale-[0.98]"
              >
                <MoreIcon />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label={`More actions for ${description}`}
                  className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] rounded-[14px] border border-line bg-card p-1.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleStartDelete}
                    className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[12.5px] font-medium text-clay transition-colors hover:bg-clay-tint focus-visible:outline-none focus-visible:bg-clay-tint"
                  >
                    <DeleteIcon />
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {isEditing ? (
          <form
            id={formId}
            action={action}
            className="rounded-[14px] border border-line bg-inputbg/55 p-4 md:col-span-full"
          >
            <input type="hidden" name="id" value={template.id} />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.95fr)_120px]">
              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
                  Name
                </label>
                <input
                  name="description"
                  defaultValue={template.description}
                  placeholder="Description"
                  className={`${inputCls} w-full`}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
                  Category
                </label>
                <CategorySelect
                  categories={categories}
                  defaultValue={template.categoryId}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
                  Amount
                </label>
                <AmountInput defaultValue={Math.round(template.amountPaise / 100)} />
              </div>
            </div>
            {state.error ? (
              <p className="mt-3 text-[12px] text-clay">{state.error}</p>
            ) : null}
          </form>
        ) : null}

        {isDeleteConfirming ? (
          <div className="rounded-[14px] border border-line bg-inputbg/45 p-4 md:col-span-full">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(245,158,11,0.1)]">
                <WarningIcon />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-strong">
                  Delete &apos;{description}&apos;?
                </p>
                <p className="mt-1 text-[12.5px] text-secondary">
                  This recurring expense will stop from next month.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
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
            No recurring templates yet. Add one above - it&apos;ll generate this
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
