import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import FundsManager, { type FundDTO } from "./FundsManager";

export default async function FundsPage() {
  const userId = await requireUserId();

  const funds = await prisma.fund.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, balance: true },
  });

  const dto: FundDTO[] = funds.map((f) => ({
    id: f.id,
    name: f.name,
    balancePaise: f.balance,
  }));
  const totalPaise = funds.reduce((s, f) => s + f.balance, 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[19px] font-extrabold tracking-[-.01em]">
          Savings &amp; funds
        </h1>
        <p className="mt-1 text-[13px] text-secondary">
          A snapshot of your savings and investment balances. Edit any balance
          inline.
        </p>
      </div>
      <FundsManager funds={dto} totalPaise={totalPaise} />
    </div>
  );
}
