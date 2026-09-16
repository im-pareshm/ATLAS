"use client";

// Split out of the original monolithic RecurringManager.tsx — no behavior changed.

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { toMonthParam } from "@/lib/month";
import { formatINR } from "@/lib/money";
import {
  deleteRecurring,
  toggleRecurring,
  updateRecurring,
  type ActionState,
} from "../actions";
import { AmountInput, CategorySelect, IntervalSelect, StartMonthInput } from "./fields";
import { DeleteIcon, EditIcon, MoreIcon, PauseIcon, ResumeIcon, WarningIcon } from "./icons";
import { StatusBadge } from "./StatusBadge";
import {
  actionBtn,
  dangerBtn,
  inputCls,
  intervalLabel,
  primaryBtn,
  subtleBtn,
  type CategoryOption,
  type TemplateDTO,
} from "./shared";

export function TemplateRow({
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

          <div className="relative flex flex-wrap gap-2 lg:col-span-2 lg:justify-end" ref={menuRef}>
            {isEditing ? (
              <>
                <button
                  data-testid="template-edit-submit"
                  type="submit"
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
                  data-testid="template-more"
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
                  defaultValue={toMonthParam({
                    year: template.startYear,
                    month: template.startMonth,
                  })}
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
