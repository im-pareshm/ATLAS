import path from "node:path";
import { createClient, type Client, type InStatement } from "@libsql/client";

// One-off: copy ONE user's data from the local dev DB into Turso (or any other
// libSQL database) so you don't start production empty. See DEPLOYMENT.md Part 5.
//
//   npm run db:copy-to-turso                # copy
//   npm run db:copy-to-turso -- --dry-run   # check everything, write nothing
//   npm run db:copy-to-turso -- --replace   # wipe the target's app tables first
//
// Source: SOURCE_DATABASE_URL, default file:./prisma/dev.db.
// Target: DATABASE_URL ?? TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) — the same
//         variables and precedence as prisma/seed.ts, so the Part 5 PowerShell
//         window works for both.
// Which user: ADMIN_EMAIL — only that account's rows are copied (the dev DB also
//         holds the e2e test accounts, which must never reach production).
//
// Rows are copied verbatim with plain SQL (SELECT * → INSERT), not through Prisma,
// so ids, timestamps and the recurringSourceId links survive unchanged. The target
// must already have the tables (prisma/turso-schema.sql) and must be empty; the
// whole copy runs as one transaction. Run the seed AFTERWARDS to set the
// production password — it upserts by email, so it just rotates the hash.

try {
  process.loadEnvFile();
} catch {
  // env already provided
}

// Parents before children — Category needs CategoryGroup, Transaction needs both
// Category and RecurringTransaction, PersonLedgerEntry needs Person.
const TABLES = [
  "User",
  "CategoryGroup",
  "Category",
  "RecurringTransaction",
  "Transaction",
  "Budget",
  "Person",
  "PersonLedgerEntry",
  "Fund",
] as const;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const replace = args.has("--replace");
for (const a of args) {
  if (a !== "--dry-run" && a !== "--replace") fail(`Unknown option: ${a}`);
}

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? "file:./prisma/dev.db";
const targetUrl =
  process.env.DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  fail("Set DATABASE_URL (or TURSO_DATABASE_URL) to the Turso URL to copy into.");
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const email =
  process.env.ADMIN_EMAIL ||
  fail("Set ADMIN_EMAIL to the account whose data should be copied.");

if (normalizeUrl(sourceUrl) === normalizeUrl(targetUrl)) {
  fail(
    `Source and target are the same database (${targetUrl}).\n` +
      `  In the PowerShell window, set $env:DATABASE_URL to your libsql://… URL first.`,
  );
}
const isRemote = /^(libsql|https?|wss?):\/\//.test(targetUrl);
if (isRemote && !authToken && !targetUrl.includes("authToken=")) {
  fail("Set TURSO_AUTH_TOKEN (the token from DEPLOYMENT.md step 3b).");
}

const source = createClient({ url: sourceUrl });
const target = createClient({ url: targetUrl, authToken });

async function main() {
  console.log(`source: ${sourceUrl}`);
  console.log(`target: ${redact(targetUrl)}${dryRun ? "  (dry run)" : ""}`);
  console.log(`user:   ${email}`);

  // --- source: find the user ---------------------------------------------
  const userRow = (
    await source.execute({
      sql: `SELECT id FROM "User" WHERE email = ?`,
      args: [email],
    })
  ).rows[0];
  if (!userRow) {
    const emails = (await source.execute(`SELECT email FROM "User"`)).rows.map(
      (r) => r.email,
    );
    fail(
      `No user ${email} in the source DB. Accounts there: ${emails.join(", ") || "(none)"}`,
    );
  }
  const userId = String(userRow.id);

  // --- target: tables exist, columns match --------------------------------
  const present = new Set(
    (
      await target.execute(
        `SELECT name FROM sqlite_master WHERE type = 'table'`,
      )
    ).rows.map((r) => String(r.name)),
  );
  const missing = TABLES.filter((t) => !present.has(t));
  if (missing.length) {
    fail(
      `Target is missing table(s): ${missing.join(", ")}.\n` +
        `  Apply prisma/turso-schema.sql first (DEPLOYMENT.md Part 3c).`,
    );
  }
  for (const t of TABLES) {
    const s = await columns(source, t);
    const d = await columns(target, t);
    if (s.join(",") !== d.join(",")) {
      fail(
        `Column mismatch on "${t}":\n  source: ${s.join(", ")}\n  target: ${d.join(", ")}\n` +
          `  Regenerate prisma/turso-schema.sql and bring the target up to date ` +
          `(DEPLOYMENT.md, "If you change the database schema").`,
      );
    }
  }

  // --- target: must be empty (or --replace) --------------------------------
  const existing = await counts(target);
  const occupied = TABLES.filter((t) => existing[t] > 0);
  if (occupied.length && !replace) {
    const emails = (await target.execute(`SELECT email FROM "User"`)).rows.map(
      (r) => r.email,
    );
    fail(
      `Target already has data: ` +
        occupied.map((t) => `${t}=${existing[t]}`).join(", ") +
        (emails.length ? `\n  accounts there: ${emails.join(", ")}` : "") +
        `\n  Re-run with --replace to wipe those tables and copy afresh ` +
        `(then run the seed again to set the production password).`,
    );
  }

  // --- read the source rows ------------------------------------------------
  const statements: InStatement[] = [];
  const expected: Record<string, number> = {};
  if (replace) {
    for (const t of [...TABLES].reverse()) {
      statements.push(`DELETE FROM "${t}"`);
    }
  }
  for (const t of TABLES) {
    const where = t === "User" ? `id = ?` : `userId = ?`;
    const rs = await source.execute({
      sql: `SELECT * FROM "${t}" WHERE ${where}`,
      args: [userId],
    });
    expected[t] = rs.rows.length;
    const cols = rs.columns;
    const sql =
      `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
      `VALUES (${cols.map(() => "?").join(", ")})`;
    for (const row of rs.rows) {
      statements.push({ sql, args: cols.map((c) => row[c] ?? null) });
    }
    console.log(`  ${t.padEnd(21)} ${String(rs.rows.length).padStart(4)} rows`);
  }

  if (dryRun) {
    console.log(
      `✔ dry run: ${statements.length} statement(s) would run; nothing written.`,
    );
    return;
  }
  if (replace && occupied.length) {
    console.log(
      `… wiping target: ${occupied.map((t) => `${t}=${existing[t]}`).join(", ")}`,
    );
  }

  // --- write, atomically ---------------------------------------------------
  await target.batch(statements, "write");

  // --- verify ----------------------------------------------------------------
  const after = await counts(target);
  const bad = TABLES.filter((t) => after[t] !== expected[t]);
  if (bad.length) {
    fail(
      `Row counts differ after copy: ` +
        bad.map((t) => `${t} expected ${expected[t]}, got ${after[t]}`).join("; "),
    );
  }
  console.log(`✔ copied ${email} (${TABLES.reduce((n, t) => n + expected[t], 0)} rows)`);
  console.log(
    `  Next: run the seed against the same target to set your production password (DEPLOYMENT.md Part 5b).`,
  );
}

async function columns(db: Client, table: string): Promise<string[]> {
  const rs = await db.execute({
    sql: `SELECT name FROM pragma_table_info(?) ORDER BY cid`,
    args: [table],
  });
  return rs.rows.map((r) => String(r.name));
}

async function counts(db: Client): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const rs = await db.execute(`SELECT COUNT(*) AS n FROM "${t}"`);
    out[t] = Number(rs.rows[0].n);
  }
  return out;
}

// `file:` URLs are relative to the cwd; compare them resolved so `file:./x.db`
// and `file:x.db` count as the same database.
function normalizeUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  return "file:" + path.resolve(url.slice("file:".length)).toLowerCase();
}

function redact(url: string): string {
  return url.replace(/authToken=[^&]+/, "authToken=…");
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

main()
  .then(() => {
    source.close();
    target.close();
  })
  .catch((e) => {
    console.error(e);
    source.close();
    target.close();
    process.exit(1);
  });
