import { expect, test } from "@playwright/test";

/** momo 首頁情境（錄製快照，不對 momo 發請求） */
test.describe("momo 首頁情境", () => {
  test("以真實資料格式渲染四種區塊與對應卡片", async ({ page }) => {
    await page.goto("/momo");

    for (const name of ["你的精選好物榜", "限時搶購", "你可能會喜歡"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    const flash = page.getByRole("region", { name: "限時搶購" });
    await expect(flash.getByLabel(/^倒數 \d+ 小時/)).toBeVisible();
    await expect(flash.locator("momo-product-card .price-label").first()).toHaveText("限搶價");
    await expect(flash.locator("momo-product-card .stock-left").first()).toHaveText(/^最後\d/);

    const ranking = page.getByRole("region", { name: "你的精選好物榜" });
    await expect(ranking.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
    await expect(ranking.locator("momo-product-card .rank-flag").first()).toHaveAttribute("aria-label", "第 1 名");

    const waterfall = page.getByRole("region", { name: "你可能會喜歡" });
    await expect(waterfall.locator("momo-product-card .sold").first()).toHaveText(/^總銷量>/);
  });

  test("匯入目錄後可在編輯器繼續調整", async ({ page }) => {
    await page.goto("/momo");
    const flash = page.getByRole("region", { name: "限時搶購" });
    await flash.getByRole("button", { name: "匯入目錄" }).click();
    await flash.getByRole("link", { name: /已匯入 \d+ 張/ }).click();

    const imported = page.locator('momo-product-card[card-id^="momo-flash-"]');
    await expect(imported.first()).toBeVisible();
  });
});
