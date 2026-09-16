import Image from "next/image";
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

  try {
    await ensureRecurringTransactionsGenerated(session.user.id);
  } catch {
    // never block the page render on generation
  }

  const email = session.user.email ?? "";
  const initial = (email[0] ?? "A").toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/88 shadow-[0_10px_26px_-24px_rgba(26,28,40,0.35)] backdrop-blur-[12px]">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-[24px]">
          <div className="flex items-center justify-between gap-4 py-[12px]">
            <div className="flex items-center gap-[10px]">
            <Image
              src="/brand-icon.png"
              alt="ATLAS"
              width={30}
              height={30}
              loading="eager"
              className="h-[30px] w-[30px] rounded-[9px] object-cover"
            />
              <span className="text-[19px] font-extrabold tracking-[-.02em]">
                ATLAS
              </span>
            </div>

            <div data-testid="nav-user-menu" className="flex items-center gap-2">
              <ThemeToggle />
              <div
                aria-label={`Signed in as ${email}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-tint text-[13px] font-bold text-teal"
                title={email}
              >
                {initial}
              </div>
              <form action={signOutAction}>
                <button
                  data-testid="nav-logout"
                  type="submit"
                  className="atlas-focus-ring atlas-touch rounded-[10px] px-3 text-[13px] font-semibold text-secondary transition-colors hover:bg-divider hover:text-strong"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="hidden border-t border-line/80 pb-[10px] pt-[8px] md:block">
            <Nav variant="desktop" />
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground/92 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-[12px] md:hidden">
        <div className="mx-auto max-w-[1160px] px-0">
          <Nav variant="mobile" />
        </div>
      </div>

      <main className="mx-auto max-w-[1160px] animate-fade-up px-4 pb-[112px] pt-5 sm:px-[30px] sm:pt-[26px] md:pb-[72px]">
        {children}
      </main>
    </div>
  );
}
