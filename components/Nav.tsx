"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Screens are added as phases land. The active month persists via a cookie
// (see MonthCookieSync + lib/active-month.ts), so nav links stay clean.
const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/known", label: "Known" },
  { href: "/expenses", label: "Expenses" },
  { href: "/people", label: "People" },
  { href: "/funds", label: "Funds" },
  { href: "/history", label: "History" },
  { href: "/recurring", label: "Recurring" },
  { href: "/categories", label: "Categories" },
];

function navTestId(label: string): string {
  return `nav-${label.toLowerCase()}`;
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav data-testid="nav" className="flex w-max items-center gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            data-testid={navTestId(link.label)}
            aria-current={active ? "page" : undefined}
            className={
              "shrink-0 rounded-[9px] px-3 py-[7px] text-[13px] font-semibold transition-colors " +
              (active
                ? "bg-mint-tint text-teal"
                : "text-secondary hover:bg-divider")
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
