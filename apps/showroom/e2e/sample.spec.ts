import { expect, test } from "@playwright/test";
import { card, openSample } from "./helpers";

test.describe("sample.html 嵌入", () => {
  test("Shadow DOM 隔離宿主的汙染樣式", async ({ page }) => {
    await openSample(page);
    const title = card(page, "std-airfryer").locator(".title");
    // 宿主設定 h3 { color: lime; font-size: 32px }
    await expect(title).not.toHaveCSS("color", "rgb(0, 255, 0)");
    await expect(title).toHaveCSS("font-size", "14px");
    await expect(card(page, "std-airfryer").locator("img")).toHaveCSS("border-top-width", "0px");
  });

  test("CSS 變數可穿透 Shadow DOM 覆寫主題", async ({ page }) => {
    await openSample(page);
    const themed = page.locator(".theme-blue momo-product-card").first();
    await expect(themed.locator(".price")).toHaveCSS("color", "rgb(21, 101, 192)");
  });

  test("非法資料顯示錯誤狀態（繁中訊息）", async ({ page }) => {
    await openSample(page);
    const broken = page.locator('momo-product-card[data*="broken"]');
    await expect(broken.getByRole("alert")).toContainText("商品資料格式錯誤");
    await expect(broken).toHaveAttribute("invalid", "");
    expect(await broken.evaluate((el) => (el as unknown as { issues: unknown[] }).issues.length)).toBeGreaterThan(0);
    // 監聽器在 bundle 載入前掛上，初次渲染的錯誤事件不會漏接
    await expect(page.locator("#log")).toContainText("momo-card:error");
  });

  test("宿主於執行期註冊自訂 plugin，已渲染的卡片自動重繪", async ({ page }) => {
    await openSample(page);
    const target = page.locator("#double11-card");
    await expect(target.locator(".media-top")).not.toContainText("11.11");
    await expect(target.locator(".media-top")).toContainText("🎉 11.11 滿千折百", { timeout: 5000 });
    await expect(page.locator("#log")).toContainText("plugin:registered");
  });

  test("卡片事件可在宿主頁面監聽", async ({ page }) => {
    await openSample(page);
    await card(page, "live-skincare").getByRole("button", { name: "加入購物車" }).click();
    await expect(page.locator("#log")).toContainText(/momo-card:add-to-cart \{"cardId":"live-skincare"/);
  });

  test("兩個 sample.html 分頁之間也會同步", async ({ context }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await openSample(a);
    await openSample(b);
    await card(a, "std-towel").getByRole("button", { name: "加入收藏" }).click();
    await expect(card(b, "std-towel").getByRole("button", { name: "取消收藏" })).toBeVisible();
  });
});
