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
  deleteRecurring,
  toggleRecurring,
  updateRecurring,
  type ActionState,
} from "./actions";

export type CategoryOption = { id: string; label: string };
export type TemplateDTO = {
  id: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  amountPaise: number;
  intervalMonths: number;
  startYear: number;
  startMonth: number;
  nextDueLabel: string;
  isActive: boolean;
};

const inputCls =
  "atlas-focus-ring atlas-input rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13.5px] outline-none transition-colors placeholder:text-faint2 focus:border-teal/45 focus-visible:outline-none";
const actionBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-semibold text-secondary transition-all hover:bg-divider hover:text-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";
const primaryBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] bg-teal px-4 text-[13px] font-bold text-white transition-colors hover:bg-teal-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const subtleBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] border border-inputborder bg-card px-4 text-[13px] font-semibold text-secondary transition-colors hover:bg-divider hover:text-strong active:scale-[0.98]";
const dangerBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] bg-[color:var(--color-clay-tint)] px-4 text-[13px] font-semibold text-clay transition-colors hover:bg-clay hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const INTERVAL_OPTIONS = [
  { value: "1", label: "Every month" },
  { value: "2", label: "Every 2 months" },
  { value: "3", label: "Every 3 months" },
  { value: "4", label: "Every 4 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every 12 months" },
] as const;

function toMonthInputValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getCurrentMonthValue(): string {
  const today = new Date();
  return toMonthInputValue(today.getUTCFullYear(), today.getUTCMonth() + 1);
}

function intervalLabel(intervalMonths: number): string {
  return intervalMonths === 1
    ? "Every month"
    : `Every ${intervalMonths} months`;
}

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
      stroke="var(--color-warning)"
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

function AmountInput({
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

function CategorySelect({
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

function IntervalSelect({
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

function StartMonthInput({
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
      defaultValue={defaultValue ?? getCurrentMonthValue()}
      className={`${inputCls} w-full min-w-0`}
    />
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const dotColor = isActive ? "var(--color-teal)" : "var(--color-warning)";
  const bgColor = isActive
    ? "color-mix(in srgb, var(--color-teal) 14%, transparent)"
    : "var(--color-warning-tint)";
  const textColor = isActive ? "var(--color-teal)" : "var(--color-warning)";

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
    if (!state.ok) return;
    formRef.current?.reset();
    const monthInput = formRef.current?.elements.namedItem(
      "startAt",
    ) as HTMLInputElement | null;
    if (monthInput) monthInput.value = getCurrentMonthValue();
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

function TemplateRow({
  template,
  categories,
}: {
  template: TemplateDTO;
  categories: CategoryOption[];
}) {
  const slug = template.id;
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
    <div
      data-testid={`recurring-template-${slug}`}
      className="border-t border-divider py-4 first:border-t-0"
    >
      <div className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_auto] lg:items-start">
          <div className="min-w-0">
            <div
              data-testid="template-description"
              className="truncate text-[14px] font-medium text-strong"
            >
              {description}
            </div>
            <div
              data-testid="template-category"
              className="truncate text-[11.5px] text-faint"
            >
              {template.categoryLabel}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_140px_120px]">
            <div className="min-w-0 text-[12.5px] text-secondary">
              <div data-testid="template-cadence" className="font-medium text-strong">
                {intervalLabel(template.intervalMonths)}
              </div>
              <div data-testid="template-next-due" className="truncate text-faint">
                Next due {template.nextDueLabel}
              </div>
            </div>
            <div
              data-testid="template-amount"
              className="num text-[13.5px] font-semibold text-strong sm:text-right"
            >
              {formatINR(template.amountPaise)}
            </div>
            <div data-testid="template-status" className="sm:justify-self-end">
              <StatusBadge isActive={optimisticActive} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-2 lg:justify-end" ref={menuRef}>
            {isEditing ? (
              <>
                <button
                  data-testid="template-edit-submit"
                  type="button"
                  form={formId}
                  disabled={pending}
                  className={primaryBtn}
                >
                  Save
                </button>
                <button
                  data-testid="template-edit-cancel"
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
                  <button
                    data-testid="template-delete-confirm"
                    type="submit"
                    className={dangerBtn}
                  >
                    Delete
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  data-testid="template-status-btn"
                  type="button"
                  onClick={handleToggle}
                  disabled={togglePending}
                  className={actionBtn}
                >
                  {optimisticActive ? <PauseIcon /> : <ResumeIcon />}
                  {optimisticActive ? "Pause" : "Resume"}
                </button>
                <button
                  data-testid="template-edit"
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
                  className="atlas-focus-ring atlas-icon-button inline-flex items-center justify-center text-muted transition-all hover:bg-divider hover:text-strong active:scale-[0.98]"
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
                      data-testid="template-delete"
                      type="button"
                      role="menuitem"
                      onClick={handleStartDelete}
                      className="atlas-focus-ring atlas-touch flex w-full items-center gap-2 rounded-[10px] px-3 text-left text-[12.5px] font-medium text-clay transition-colors hover:bg-clay-tint focus-visible:bg-clay-tint"
                    >
                      <DeleteIcon />
                      Delete
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <form
            id={formId}
            action={action}
            data-testid={`recurring-edit-form-${slug}`}
            className="rounded-[14px] border border-line bg-inputbg/55 p-4"
          >
            <input type="hidden" name="id" value={template.id} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_160px_180px_180px]">
              <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                <label
                  htmlFor={`template-edit-description-${slug}`}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
                >
                  Name
                </label>
                <input
                  id={`template-edit-description-${slug}`}
                  data-testid={`template-edit-description-${slug}`}
                  name="description"
                  defaultValue={template.description}
                  placeholder="Description"
                  className={`${inputCls} w-full`}
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor={`template-edit-category-${slug}`}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
                >
                  Category
                </label>
                <CategorySelect
                  categories={categories}
                  defaultValue={template.categoryId}
                  id={`template-edit-category-${slug}`}
                  testId={`template-edit-category-${slug}`}
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor={`template-edit-amount-${slug}`}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
                >
                  Amount
                </label>
                <AmountInput
                  defaultValue={Math.round(template.amountPaise / 100)}
                  id={`template-edit-amount-${slug}`}
                  testId={`template-edit-amount-${slug}`}
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor={`template-edit-interval-${slug}`}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
                >
                  Repeats
                </label>
                <IntervalSelect
                  defaultValue={template.intervalMonths}
                  id={`template-edit-interval-${slug}`}
                  testId={`template-edit-interval-${slug}`}
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor={`template-edit-start-${slug}`}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2"
                >
                  First due month
                </label>
                <StartMonthInput
                  defaultValue={toMonthInputValue(
                    template.startYear,
                    template.startMonth,
                  )}
                  id={`template-edit-start-${slug}`}
                  testId={`template-edit-start-${slug}`}
                />
              </div>
            </div>
            {state.error ? (
              <p className="mt-3 text-[12px] text-clay">{state.error}</p>
            ) : null}
          </form>
        ) : null}

        {isDeleteConfirming ? (
          <div className="rounded-[14px] border border-line bg-inputbg/45 p-4">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: "var(--color-warning-tint)" }}
              >
                <WarningIcon />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-strong">
                  Delete &apos;{description}&apos;?
                </p>
                <p className="mt-1 text-[12.5px] text-secondary">
                  This recurring expense will stop from its next due cycle.
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
        <Link href="/categories" className="atlas-focus-ring font-semibold text-teal">
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
            No recurring templates yet. Add one above and it will generate an item
            in each due month automatically.
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
