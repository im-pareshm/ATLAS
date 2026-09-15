// Split out of the original monolithic RecurringManager.tsx — no behavior changed.

export function StatusBadge({ isActive }: { isActive: boolean }) {
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
