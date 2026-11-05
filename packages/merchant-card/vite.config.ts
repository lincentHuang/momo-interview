import { defineConfig } from "vitest/config";

/**
 * 建置產物：
 *  - dist/momo-card.js       ES Module（現代宿主 import）
 *  - dist/momo-card.iife.js  傳統 <script> 載入（掛到 window.MomoCard）
 * 兩者都是 self-contained（lit / zod 打包進來），宿主頁面不需額外依賴。
 */
export default defineConfig({
  build: {
    lib: {
      entry: "src/element/index.ts",
      name: "MomoCard",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "momo-card.js" : "momo-card.iife.js"),
    },
    target: "es2020",
    sourcemap: true,
    minify: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
