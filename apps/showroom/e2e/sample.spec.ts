import { expect, test } from "@playwright/test";
import { card, openSample } from "./helpers";

test.describe("sample.html 嵌入", () => {
  test("Shadow DOM 隔離宿主的汙染樣式", async ({ page }) => {
    await openSample(page);
    const title = card(page, "std-airfryer").locator(".title");
    // 宿主設定 h3 { color: lime; font-size: 32px }
    await expect(title).not.toHaveCSS("color", "rgb(0, 255, 0)");
    await expect(title).toHaveCSS("font-size", "14px");
    await expect(card(page, "std-airfryer").locator(".track img").first()).toHaveCSS("border-top-width", "0px");
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

  test("多圖輪播：箭頭 / 圓點切換，且不觸發卡片點擊", async ({ page }) => {
    await openSample(page);
    const target = card(page, "std-airfryer");
    await target.hover();
    await target.getByRole("button", { name: "下一張圖" }).click();
    await expect(target.getByRole("tab", { name: "第 2 張圖" })).toHaveAttribute("aria-selected", "true");
    await target.getByRole("tab", { name: "第 1 張圖" }).click();
    await expect(target.getByRole("tab", { name: "第 1 張圖" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#log")).not.toContainText(/momo-card:click \{"cardId":"std-airfryer"/);
  });

  test("標籤列固定單行；收藏 / 購物車可由 extensions 移除；影片在卡片內播放", async ({ page }) => {
    await openSample(page);
    await page.evaluate(() => {
      const el = document.createElement("momo-product-card");
      el.id = "optional-card";
      el.style.width = "160px";
      (el as unknown as { card: unknown }).card = {
        id: "opt",
        variant: "standard",
        title: "選配測試",
        imageUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        videoUrl: "https://example.com/demo.mp4",
        price: 100,
        extensions: { "store-plus": {}, "pre-order": {}, "fast-delivery": {}, coupon: {}, register: {}, gift: {} },
      };
      document.body.append(el);
    });
    const target = page.locator("#optional-card");
    await expect(target.locator(".badges")).toHaveCSS("height", "18px");
    await expect(target.getByRole("button", { name: "加入收藏" })).toHaveCount(0);
    await expect(target.getByRole("button", { name: "加入購物車" })).toHaveCount(0);
    await target.getByRole("button", { name: "播放商品影片" }).click();
    await expect(target.locator(".player video")).toHaveAttribute("src", "https://example.com/demo.mp4");
    await target.getByRole("button", { name: "關閉影片" }).click();
    await expect(target.locator(".player")).toHaveCount(0);
  });
});
