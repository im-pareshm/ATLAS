"use client";

import { useEffect } from "react";

// Persists the currently-viewed month to a cookie so it stays selected when you
// navigate to another section (even one without a month switcher and back).
export default function MonthCookieSync({ month }: { month: string }) {
  useEffect(() => {
    document.cookie = `atlas-month=${month}; path=/; max-age=31536000; samesite=lax`;
  }, [month]);
  return null;
}
