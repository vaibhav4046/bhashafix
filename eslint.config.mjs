import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".vercel/**",
    ".vinext/**",
    ".wrangler/**",
    ".tmp/**",
    ".npm-cache/**",
    "artifacts/**",
    "coverage/**",
    "dist/**",
    "packages/*/dist/**",
    "fixtures/**/.next/**",
    "fixtures/**/out/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
