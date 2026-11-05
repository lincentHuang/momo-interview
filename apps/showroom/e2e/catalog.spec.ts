import { expect, test } from "@playwright/test";
import { card } from "./helpers";

test.describe("商品卡目錄", () => {
  test("列出所有種子卡片", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /商品卡目錄/ })).toBeVisible();
    await expect(page.locator("momo-product-card")).toHaveCount(5);
    await expect(card(page, "flash-earbuds").locator(".flash-banner time")).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    await expect(card(page, "live-skincare").locator(".tag--live")).toBeVisible();
    await expect(card(page, "rank-rice").locator(".rank-flag")).toHaveAttribute("aria-label", "第 1 名");
  });

  test("篩選條件存在 URL，重新整理後保留", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "限時搶購卡" }).click();
    await expect(page).toHaveURL(/variant=flash-sale/);
    await expect(page.locator("momo-product-card")).toHaveCount(1);

    await page.reload();
    await expect(page.locator("momo-product-card")).toHaveCount(1);
    await expect(page.getByRole("radio", { name: "限時搶購卡" })).toHaveAttribute("data-state", "on");
  });

  test("不合法的 URL 參數會被忽略", async ({ page }) => {
    await page.goto("/?variant=<script>&layout=nope");
    await expect(page.locator("momo-product-card")).toHaveCount(5);
  });

  test("點擊卡片進入編輯器", async ({ page }) => {
    await page.goto("/");
    await card(page, "rank-rice").locator(".title").click();
    await expect(page).toHaveURL(/\/cards\/rank-rice$/);
    await expect(page.getByRole("navigation", { name: "主導覽" }).getByRole("link", { name: "商品卡目錄" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("商品名稱")).toHaveValue("【池上】一等米 3kg 真空包裝");
  });
});
