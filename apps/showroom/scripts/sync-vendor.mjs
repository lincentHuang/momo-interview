// 將 @momo/merchant-card 的建置產物複製到 public/vendor，
// 讓 /sample.html 與 Showroom 同源載入 → BroadcastChannel / localStorage 可跨頁同步。
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../../../packages/merchant-card/dist");
const out = resolve(here, "../public/vendor");

if (!existsSync(dist)) {
  console.error("[sync-vendor] 找不到 packages/merchant-card/dist，請先執行 `npm run build:card`");
  process.exit(1);
}
mkdirSync(out, { recursive: true });
cpSync(dist, out, { recursive: true });
console.log("[sync-vendor] copied merchant-card dist → public/vendor");
