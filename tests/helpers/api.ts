import { execSync } from "child_process";
import { TEST_USER } from "./test-data";

/**
 * Direct database/API helpers for test setup and teardown.
 * Uses Prisma CLI commands since we don't have a direct API endpoint.
 */

export async function seedTestDatabase(): Promise<void> {
  execSync("npm run db:seed", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      ADMIN_EMAIL: TEST_USER.email,
      ADMIN_PASSWORD: TEST_USER.password,
    },
  });
}

export async function runMigrations(): Promise<void> {
  execSync("npm run db:migrate", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

export async function deployMigrations(): Promise<void> {
  execSync("npm run db:deploy", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

export async function resetDatabase(): Promise<void> {
  execSync("npm run db:reset -- --force", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

/**
 * Helper to execute Prisma queries directly for test assertions.
 */
export async function queryDatabase<T>(): Promise<T> {
  throw new Error("Direct DB queries not implemented - use UI assertions");
}

/**
 * Generate unique test identifiers to avoid conflicts
 */
export function uniqueId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
