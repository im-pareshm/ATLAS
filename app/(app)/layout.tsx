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
      <header className="sticky top-0 z-20 border-b border-line bg-ground/85 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 pt-[12px] sm:px-[24px]">
          <div className="flex items-center gap-[10px]">
            <Image
              src="/brand-icon.png"
              alt="ATLAS"
              width={30}
              height={30}
              className="h-[30px] w-[30px] rounded-[9px] object-cover"
            />
            <span className="text-[19px] font-extrabold tracking-[-.02em]">
              ATLAS
            </span>
          </div>

          <div data-testid="nav-user-menu" className="flex items-center gap-2">
            <ThemeToggle />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-tint text-[13px] font-bold text-teal"
              title={email}
            >
              {initial}
            </div>
            <form action={signOutAction}>
              <button
                data-testid="nav-logout"
                type="submit"
                className="rounded-[9px] px-3 py-[7px] text-[13px] font-semibold text-secondary transition-colors hover:bg-divider"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

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
