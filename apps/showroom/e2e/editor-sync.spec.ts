import { expect, test } from "@playwright/test";
import { card, fillNumber, openEditor, openSample } from "./helpers";

test.describe("編輯器 ↔ sample.html 跨宿主同步", () => {
  test("編輯器修改價格，另一分頁的 sample.html 即時更新", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "flash-earbuds");
    await openSample(sample);

    await fillNumber(editor, "售價", "999");

    await expect(card(sample, "flash-earbuds").locator(".price")).toHaveText("$999");
    await expect(card(sample, "flash-earbuds").locator(".original")).toHaveText("$2,990");
  });

  test("sample.html 收藏 / 加入購物車，編輯器的互動狀態同步", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "rank-rice");
    await openSample(sample);

    // 互動狀態與事件屬於開發者資訊，在「檢視器」子頁
    await editor.getByRole("link", { name: "檢視器" }).click();
    await expect(editor).toHaveURL(/\/cards\/rank-rice\/inspect$/);

    const target = card(sample, "rank-rice");
    await target.getByRole("button", { name: "加入收藏" }).click();
    await target.getByRole("button", { name: "加入購物車" }).click();
    await target.getByRole("button", { name: "加入購物車" }).click();

    await expect(editor.getByText("收藏：♥ 已收藏")).toBeVisible();
    await expect(editor.getByText("購物車：2 件")).toBeVisible();
    await expect(card(editor, "rank-rice").getByRole("button", { name: "取消收藏" })).toHaveAttribute("aria-pressed", "true");
  });

  test("加入模組後，sample.html 出現對應標籤", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "rank-rice");
    await openSample(sample);

    await editor.getByRole("button", { name: "加入折價券" }).click();

    // momo 列表上的折價券只標示「折價券」，金額為選填設定
    await expect(card(sample, "rank-rice").locator(".tag--coupon")).toHaveText("折價券");
  });

  test("不合法的修改不寫入、不廣播，並標示錯誤", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "std-airfryer");
    await openSample(sample);

    await fillNumber(editor, "原價（劃線價）", "100"); // 低於售價 3990

    await expect(editor.getByText("原價不可低於售價")).toBeVisible();
    await expect(editor.getByRole("tab", { name: /內容/ })).toContainText("1");
    // 預覽與其他宿主維持最後一個合法版本
    await expect(card(editor, "std-airfryer").locator(".original")).toHaveText("$5,990");
    await expect(card(sample, "std-airfryer").locator(".original")).toHaveText("$5,990");

    await editor.getByRole("button", { name: "放棄修改" }).click();
    await expect(editor.getByLabel("原價（劃線價）", { exact: true })).toHaveValue("5990");
  });

  test("設定持久化：重新整理後保留；重設恢復種子資料", async ({ page }) => {
    await openEditor(page, "std-towel");
    await page.getByLabel("商品名稱").fill("改過的浴巾");
    await page.reload();
    await expect(page.getByLabel("商品名稱")).toHaveValue("改過的浴巾");

    await page.getByRole("button", { name: "重設" }).click();
    await expect(page.getByLabel("商品名稱")).toHaveValue("【台灣製】極細纖維超吸水浴巾 3入組");
  });

  test("切換 variant 後補上新類型的預設欄位", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    await page.getByLabel("卡片類型").click();
    await page.getByRole("option", { name: "直播商品卡" }).click();

    await expect(page.getByLabel("觀看人數", { exact: true })).toBeVisible();
    await expect(card(page, "std-airfryer").locator(".tag--live")).toBeVisible();
  });
});

test.describe("分享連結", () => {
  test("在另一個瀏覽器開啟分享連結，確認後套用", async ({ browser, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const page = await context.newPage();
    await openEditor(page, "std-airfryer");
    await fillNumber(page, "售價", "2490");
    await page.getByRole("button", { name: "複製分享連結" }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("/cards/std-airfryer?config=");

    // 全新的 context = 另一位使用者，localStorage 是種子資料
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(url);
    await expect(card(otherPage, "std-airfryer").locator(".price")).toHaveText("$3,990");
    await otherPage.getByRole("button", { name: "套用設定" }).click();

    await expect(card(otherPage, "std-airfryer").locator(".price")).toHaveText("$2,490");
    await expect(otherPage).not.toHaveURL(/config=/);
    await other.close();
  });

  test("與商品不符的分享連結會被拒絕", async ({ page }) => {
    await page.goto("/cards/rank-rice?config=bm90LWpzb24");
    await expect(page.getByText("分享連結的設定無效或與此商品不符")).toBeVisible();
  });
});
