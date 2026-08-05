import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "**/Mockup designs/**",
    "playwright-report/**",
    "test-results/**",
    "*.zip",
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
