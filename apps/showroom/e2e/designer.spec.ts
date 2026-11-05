import { expect, test, type Page } from "@playwright/test";
import { card, openEditor, openSample } from "./helpers";

/** 設計畫布上的卡片（editable 模式） */
const canvasCard = (page: Page, id: string) => page.getByRole("application").locator(`momo-product-card[card-id="${id}"]`);
const slotIds = (page: Page, id: string, slot: string) =>
  canvasCard(page, id)
    .locator(`[data-slot="${slot}"] > [data-plugin-id]`)
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.pluginId));

test.describe("所見即所得模組編輯器", () => {
  test("從模組面板拖到卡片插槽，其他宿主即時出現在相同位置", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "rank-rice");
    await openSample(sample);

    // Playwright 的 CSS locator 會穿透 open Shadow DOM，可直接以插槽為放置目標
    await editor.locator('[data-module="corner-label"]').dragTo(canvasCard(editor, "rank-rice").locator('[data-slot="footer"]'));

    await expect.poll(() => slotIds(editor, "rank-rice", "footer")).toEqual(["corner-label"]);
    await expect(card(sample, "rank-rice").locator('[data-slot="footer"] .tag--solid')).toHaveText("momo獨家");
    // 放下後自動選取並開啟該模組的設定
    await expect(editor.getByRole("tab", { name: /模組/ })).toHaveAttribute("data-state", "active");
    await expect(editor.getByLabel("角標文字")).toBeVisible();
  });

  test("卡片上的模組可拖曳重新排序", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    await page.getByRole("button", { name: "加入贈品" }).click();
    await expect.poll(() => slotIds(page, "std-airfryer", "badges")).toEqual(["fast-delivery", "gift"]);

    const target = canvasCard(page, "std-airfryer").locator('[data-plugin-id="fast-delivery"]');
    await canvasCard(page, "std-airfryer").locator('[data-plugin-id="gift"]').dragTo(target, { targetPosition: { x: 2, y: 8 } });

    await expect.poll(() => slotIds(page, "std-airfryer", "badges")).toEqual(["gift", "fast-delivery"]);
  });

  test("把卡片上的模組拖回模組面板即移除", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    await canvasCard(page, "std-airfryer").locator('[data-plugin-id="coupon"]').dragTo(page.getByRole("complementary", { name: "模組面板" }));

    await expect(canvasCard(page, "std-airfryer").locator(".tag--coupon")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "加入折價券" })).toBeVisible();
  });

  test("鍵盤替代方案：在屬性面板換插槽與調整順序", async ({ page }) => {
    await openEditor(page, "flash-earbuds");
    await page.getByRole("tab", { name: /模組/ }).click();

    // 分期零利率：價格旁 → 標籤列（加到尾端），再往前移一格
    await page.getByRole("button", { name: "分期零利率", exact: true }).click();
    await page.getByLabel("擺放位置").click();
    await page.getByRole("option", { name: "標籤列" }).click();
    await expect.poll(() => slotIds(page, "flash-earbuds", "badges")).toEqual(["fast-delivery", "installment"]);

    await page.getByRole("button", { name: "分期零利率往前移" }).click();
    await expect.poll(() => slotIds(page, "flash-earbuds", "badges")).toEqual(["installment", "fast-delivery"]);

    await page.getByRole("button", { name: "移除分期零利率" }).click();
    await expect.poll(() => slotIds(page, "flash-earbuds", "badges")).toEqual(["fast-delivery"]);
  });

  test("點選卡片上的模組 → 開啟它的設定，修改即時反映", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    await canvasCard(page, "std-airfryer").locator('[data-plugin-id="coupon"]').click();

    await expect(canvasCard(page, "std-airfryer").locator('[data-plugin-id="coupon"]')).toHaveClass(/is-selected/);
    await page.getByLabel("折抵金額", { exact: true }).fill("300");
    await expect(canvasCard(page, "std-airfryer").locator(".tag--coupon")).toHaveText("券 $300");
  });
});

test.describe("App Shell", () => {
  test("sidebar 導覽到各頁，次要資訊不在目錄頁", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("商品卡類型", { exact: true })).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: "主導覽" });
    await nav.getByRole("link", { name: "類型分析" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "商品卡類型分析" })).toBeVisible();

    await nav.getByRole("link", { name: "模組庫" }).click();
    await expect(page.getByText("corner-label")).toBeVisible();

    await nav.getByRole("link", { name: "設定與同步" }).click();
    await expect(page.getByText("正常同步中")).toBeVisible();
  });

  test("設定頁的全部重設需要二次確認，並還原排版", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    await page.getByRole("button", { name: "加入活動角標" }).click();
    await expect(canvasCard(page, "std-airfryer").locator(".tag--solid")).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("button", { name: "全部重設" }).click();
    await page.getByRole("button", { name: "確定重設全部卡片" }).click();
    await expect(page.getByText("已重設並同步")).toBeVisible();

    await openEditor(page, "std-airfryer");
    await expect(canvasCard(page, "std-airfryer").locator(".tag--solid")).toHaveCount(0);
  });

  test("側欄可收合，偏好在重新整理後保留", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "收合側欄" }).click();
    await expect(page.getByRole("button", { name: "展開側欄" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "展開側欄" })).toBeVisible();
  });
});
