import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { LedgerDirection } from "@/lib/constants";
import PeopleManager, { type PersonDTO } from "./PeopleManager";

export default async function PeoplePage() {
  const userId = await requireUserId();

  const people = await prisma.person.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      entries: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          description: true,
          direction: true,
          amount: true,
          pending: true,
        },
      },
    },
  });

  const dto: PersonDTO[] = people.map((p) => {
    let given = 0;
    let received = 0;
    for (const e of p.entries) {
      if (e.pending) continue;
      if (e.direction === "GIVEN") given += e.amount;
      else received += e.amount;
    }
    return {
      id: p.id,
      name: p.name,
      netPaise: given - received, // >0 = they owe you
      hasEntries: p.entries.length > 0,
      entries: p.entries.map((e) => ({
        id: e.id,
        description: e.description ?? "",
        direction: e.direction as LedgerDirection,
        amountPaise: e.amount,
        pending: e.pending,
      })),
    };
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[19px] font-extrabold tracking-[-.01em]">People</h1>
        <p className="mt-1 text-[13px] text-secondary">
          Money you&apos;ve given to or received from people. Received (non-pending)
          counts as money-in; given counts as money-out on the dashboard.
        </p>
      </div>
      <PeopleManager people={dto} />
    </div>
  );
}
