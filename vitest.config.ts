import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only — colocated under lib/__tests__ so they never collide with the
// Playwright specs in tests/ (playwright.config.ts's testDir is scoped there, and
// this config's `include` is scoped to lib/, so neither runner picks up the
// other's files). Node environment: the tested modules are pure TS with no DOM.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
