import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import i18next from "eslint-plugin-i18next";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    // Every user-facing string goes through next-intl. This fails the build on JSX text or a
    // user-facing attribute written as a literal in any component.
    files: ["src/**/*.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            include: ["placeholder", "title", "alt", "aria-label", "aria-description", "aria-placeholder", "label"],
            exclude: [".*"],
          },
          // Arguments to translators and formatters are keys/format names, not display text.
          callees: {
            exclude: ["t(Ta|En)?", "format\\.(number|dateTime|relativeTime|list)", "require", "addEventListener", "removeEventListener", "includes", "startsWith", "endsWith"],
          },
          message: "User-facing text must come from messages/*.json via next-intl.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "public/sw.js", "public/tesseract/**", "src/lib/database.types.ts", "supabase/**"]),
]);
