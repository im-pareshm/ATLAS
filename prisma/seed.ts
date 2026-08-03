import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  // env already provided
}

const url =
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url, authToken }),
});

// Default 2-level structure derived from the user's Notion tracker (DESIGN.md).
const DEFAULT_GROUPS: {
  name: string;
  kind: "INCOME" | "KNOWN_EXPENSE" | "SAVINGS" | "DISCRETIONARY";
  categories: string[];
}[] = [
  { name: "Income", kind: "INCOME", categories: ["Salary", "Additional"] },
  { name: "Savings", kind: "SAVINGS", categories: ["SIP", "Personal savings"] },
  {
    name: "EMI & loans",
    kind: "KNOWN_EXPENSE",
    categories: ["Loan EMI", "Home loan"],
  },
  {
    name: "Subscriptions",
    kind: "KNOWN_EXPENSE",
    categories: ["Streaming", "Cloud storage"],
  },
  {
    name: "Miscellaneous",
    kind: "KNOWN_EXPENSE",
    categories: ["Credit card bill", "Utilities"],
  },
  {
    name: "Other Expenses",
    kind: "DISCRETIONARY",
    categories: ["Food", "Transport", "Shopping", "Misc"],
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
  console.log(`✔ user: ${user.email}`);

  let groupOrder = 0;
  for (const g of DEFAULT_GROUPS) {
    const group = await prisma.categoryGroup.upsert({
      where: { userId_name: { userId: user.id, name: g.name } },
      update: { kind: g.kind, sortOrder: groupOrder },
      create: {
        userId: user.id,
        name: g.name,
        kind: g.kind,
        sortOrder: groupOrder,
      },
    });
    groupOrder += 1;

    let catOrder = 0;
    for (const catName of g.categories) {
      await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: catName } },
        update: { groupId: group.id, sortOrder: catOrder, isDefault: true },
        create: {
          userId: user.id,
          groupId: group.id,
          name: catName,
          isDefault: true,
          sortOrder: catOrder,
        },
      });
      catOrder += 1;
    }
    console.log(`✔ group: ${g.name} (${g.categories.length} categories)`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
