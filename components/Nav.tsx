"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  shortLabel?: string;
};

const PRIMARY_LINKS: NavLink[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home" },
  { href: "/expenses", label: "Expenses" },
  { href: "/known", label: "Known" },
  { href: "/people", label: "People" },
];

const MORE_LINKS: NavLink[] = [
  { href: "/funds", label: "Funds" },
  { href: "/history", label: "History" },
  { href: "/recurring", label: "Recurring" },
  { href: "/categories", label: "Categories" },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

function navTestId(label: string): string {
  return `nav-${label.toLowerCase()}`;
}

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function DesktopNavLink({
  href,
  label,
  pathname,
}: NavLink & { pathname: string }) {
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      data-testid={navTestId(label)}
      aria-current={active ? "page" : undefined}
      className={
        "atlas-focus-ring atlas-touch inline-flex shrink-0 items-center rounded-[10px] px-3 text-[13px] font-semibold transition-colors " +
        (active
          ? "bg-mint-tint text-teal"
          : "text-secondary hover:bg-divider hover:text-strong")
      }
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  shortLabel,
  pathname,
}: NavLink & { pathname: string }) {
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      data-testid={navTestId(label)}
      aria-current={active ? "page" : undefined}
      className={
        "atlas-focus-ring flex min-h-[56px] min-w-0 flex-1 items-center justify-center rounded-[14px] px-2 text-center text-[11.5px] font-semibold leading-tight transition-colors " +
        (active
          ? "bg-mint-tint text-teal"
          : "text-secondary hover:bg-card hover:text-strong")
      }
    >
      {shortLabel ?? label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const moreActive = MORE_LINKS.some((link) => isActivePath(pathname, link.href));

  return (
    <nav data-testid="nav" aria-label="Primary">
      <div className="hidden items-center gap-1 rounded-[16px] border border-line/90 bg-card/78 p-1.5 shadow-[0_12px_26px_-24px_rgba(26,28,40,0.38)] backdrop-blur-[8px] md:flex">
        {ALL_LINKS.map((link) => (
          <DesktopNavLink key={link.href} pathname={pathname} {...link} />
        ))}
      </div>

      <div className="md:hidden">
        <div className="rounded-[20px] border border-line bg-card/96 p-2 shadow-card backdrop-blur-[10px]">
          <div className="grid grid-cols-5 gap-1.5">
            {PRIMARY_LINKS.map((link) => (
              <MobileNavLink key={link.href} pathname={pathname} {...link} />
            ))}

            <details className="relative">
              <summary
                className={
                  "atlas-focus-ring flex min-h-[56px] cursor-pointer list-none items-center justify-center rounded-[14px] px-2 text-center text-[11.5px] font-semibold leading-tight transition-colors " +
                  (moreActive
                    ? "bg-mint-tint text-teal"
                    : "text-secondary hover:bg-card hover:text-strong")
                }
              >
                More
              </summary>
              <div className="absolute bottom-[calc(100%+10px)] right-0 z-30 w-[180px] rounded-[16px] border border-line bg-card p-1.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">
                {MORE_LINKS.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      data-testid={navTestId(link.label)}
                      aria-current={active ? "page" : undefined}
                      className={
                        "atlas-focus-ring atlas-touch flex w-full items-center rounded-[12px] px-3 text-[12.5px] font-medium transition-colors " +
                        (active
                          ? "bg-mint-tint text-teal"
                          : "text-secondary hover:bg-divider hover:text-strong")
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          </div>
        </div>
      </div>
    </nav>
  );
}
