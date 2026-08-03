import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signOutAction } from "./actions";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import { ensureRecurringTransactionsGenerated } from "@/lib/recurring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Lazy recurring generation (covers month rollover on any authenticated load).
  try {
    await ensureRecurringTransactionsGenerated(session.user.id);
  } catch {
    // never block the page render on generation
  }

  const email = session.user.email ?? "";
  const initial = (email[0] ?? "A").toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/85 backdrop-blur-[10px]">
        {/* Row 1: brand + account */}
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 pt-[12px] sm:px-[24px]">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-teal">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M21 7v6h-6" />
              </svg>
            </div>
            <span className="text-[19px] font-extrabold tracking-[-.02em]">
              ATLAS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-tint text-[13px] font-bold text-teal"
              title={email}
            >
              {initial}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-[9px] px-3 py-[7px] text-[13px] font-semibold text-secondary transition-colors hover:bg-divider"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Row 2: navigation (scrolls horizontally instead of wrapping) */}
        <div className="mx-auto max-w-[1160px] overflow-x-auto px-4 pb-[8px] pt-[6px] sm:px-[20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Nav />
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] animate-fade-up px-4 pb-[72px] pt-5 sm:px-[30px] sm:pt-[26px]">
        {children}
      </main>
    </div>
  );
}
