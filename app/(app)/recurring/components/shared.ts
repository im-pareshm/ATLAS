// Shared types, style tokens, and small pure helpers used by both the create
// form and each template row. Split out of the original monolithic
// RecurringManager.tsx (see ../RecurringManager.tsx) purely to keep each piece
// small enough to read and edit in isolation — no behavior here changed.

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

export const inputCls =
  "atlas-focus-ring atlas-input rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13.5px] outline-none transition-colors placeholder:text-faint2 focus:border-teal/45 focus-visible:outline-none";
export const actionBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-semibold text-secondary transition-all hover:bg-divider hover:text-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45";
export const primaryBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] bg-teal px-4 text-[13px] font-bold text-white transition-colors hover:bg-teal-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const subtleBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] border border-inputborder bg-card px-4 text-[13px] font-semibold text-secondary transition-colors hover:bg-divider hover:text-strong active:scale-[0.98]";
export const dangerBtn =
  "atlas-focus-ring atlas-touch inline-flex items-center justify-center rounded-[10px] bg-[color:var(--color-clay-tint)] px-4 text-[13px] font-semibold text-clay transition-colors hover:bg-clay hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const INTERVAL_OPTIONS = [
  { value: "1", label: "Every month" },
  { value: "2", label: "Every 2 months" },
  { value: "3", label: "Every 3 months" },
  { value: "4", label: "Every 4 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every 12 months" },
] as const;

export function intervalLabel(intervalMonths: number): string {
  return intervalMonths === 1
    ? "Every month"
    : `Every ${intervalMonths} months`;
}
