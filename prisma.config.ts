import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 does not auto-load .env in the config context — load it explicitly.
try {
  process.loadEnvFile();
} catch {
  // no .env file (e.g. CI with env already set) — ignore
}

// The schema engine (migrate) uses datasource.url directly. For local dev this is
// a libSQL `file:` DB. NOTE (deploy): Prisma's SQLite schema engine speaks `file:`,
// not `libsql://` — for Turso, generate migration SQL locally and apply it with the
// Turso CLI (see IMPLEMENTATION_PLAN.md §10). The runtime client (lib/prisma.ts)
// always talks to the DB via the libSQL driver adapter.
const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: dbUrl,
  },
});
