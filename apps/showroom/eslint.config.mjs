import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Feature 邊界：跨 feature 只能透過其 index（public API）引用；shared 不可依賴 features
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*/*"], message: "請從 feature 的 index（@/features/<name>）引用，不要深入內部檔案。" },
            { group: ["radix-ui", "@radix-ui/*"], message: "請使用 @/shared/ui 的封裝元件。" },
            { group: ["@momo/merchant-card/element"], message: "Web Component 只能由 card-preview feature 載入。" },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/ui/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/features/card-preview/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["@/features/*/*"] }] }] },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/features/*", "@/features/**"], message: "shared 不可依賴 features。" }] }],
    },
  },
  {
    files: ["src/shared/ui/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/vendor/**"]),
]);

export default eslintConfig;
