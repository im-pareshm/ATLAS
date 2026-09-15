// Money helpers. Amounts are stored as integer paise. Display uses the Indian
// digit-grouping system (1,20,000 not 120,000) and a leading currency sign.

/** Rupees (e.g. from a form field) to integer paise, rounded to the nearest paisa. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Integer paise to rupees (a float — for display math only, never storage). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Group a non-negative integer with Indian digit grouping. */
function groupIndian(n: number): string {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/**
 * Format paise as INR, rounded to whole rupees (matches the mockup). Negatives
 * use the typographic minus sign U+2212, not a hyphen (UI_DESIGN_GUIDE.md).
 */
export function formatINR(paise: number): string {
  const neg = paise < 0;
  const rupees = Math.round(Math.abs(paise) / 100);
  return `${neg ? "\u2212" : ""}₹${groupIndian(rupees)}`;
}

/** Signed variant that always shows the leading sign for negatives. */
export function formatINRSigned(paise: number): string {
  return formatINR(paise);
}
