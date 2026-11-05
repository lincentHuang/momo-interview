import { expect, test, type Locator, type Page } from "@playwright/test";
import { card, openEditor, openSample } from "./helpers";

/** 設計畫布上的卡片（editable 模式） */
const canvasCard = (page: Page, id: string) => page.getByRole("application").locator(`momo-product-card[card-id="${id}"]`);
const slotIds = (page: Page, id: string, slot: string) =>
  canvasCard(page, id)
    .locator(`[data-slot="${slot}"] > [data-plugin-id]`)
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.pluginId));

async function mouseDrag(page: Page, source: Locator, target: Locator) {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe("所見即所得模組編輯器", () => {
  test("從右側模組庫拖到卡片插槽，其他宿主即時出現在相同位置", async ({ context }) => {
    const editor = await context.newPage();
    const sample = await context.newPage();
    await openEditor(editor, "rank-rice");
    await openSample(sample);
    await editor.getByRole("tab", { name: /模組/ }).click();

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
    await page.getByRole("tab", { name: /模組/ }).click();
    await page.getByRole("button", { name: "加入贈品" }).click();
    await expect.poll(() => slotIds(page, "std-airfryer", "badges")).toEqual(["fast-delivery", "campaign-tag", "coupon", "register", "gift"]);

    const target = canvasCard(page, "std-airfryer").locator('[data-plugin-id="fast-delivery"]');
    await canvasCard(page, "std-airfryer").locator('[data-plugin-id="gift"]').dragTo(target, { targetPosition: { x: 2, y: 8 } });

    await expect.poll(() => slotIds(page, "std-airfryer", "badges")).toEqual(["gift", "fast-delivery", "campaign-tag", "coupon", "register"]);
  });

  test("把卡片上的模組拖回右側編輯面板即移除", async ({ page }) => {
    await openEditor(page, "std-airfryer");
    // 用真實滑鼠軌跡：locator.dragTo 的落點若在表單 label 上，Chromium 不會觸發 dragstart（使用者實際拖曳不受影響）
    await mouseDrag(page, canvasCard(page, "std-airfryer").locator('[data-plugin-id="coupon"]'), page.getByRole("complementary", { name: "編輯面板" }));

    await expect(canvasCard(page, "std-airfryer").locator(".tag--coupon")).toHaveCount(0);
    await page.getByRole("tab", { name: /模組/ }).click();
    await expect(page.getByRole("button", { name: "加入折價券" })).toBeVisible();
  });

  test("鍵盤替代方案：在編輯面板換插槽與調整順序", async ({ page }) => {
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
    await page.getByRole("tab", { name: /模組/ }).click();
    await page.getByRole("button", { name: "加入活動角標" }).click();
    await expect(canvasCard(page, "std-airfryer").locator(".tag--solid")).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("button", { name: "全部重設" }).click();
    await page.getByRole("button", { name: "確定重設全部卡片" }).click();
    await expect(page.getByText("已重設並同步")).toBeVisible();

    await openEditor(page, "std-airfryer");
    await expect(canvasCard(page, "std-airfryer").locator(".tag--solid")).toHaveCount(0);
  });

  test("新增卡片：建立後進入設計頁，其他分頁的目錄即時出現", async ({ context }) => {
    const page = await context.newPage();
    const other = await context.newPage();
    await other.goto("/");
    await page.goto("/");

    await page.getByRole("button", { name: "新增卡片" }).click();
    const dialog = page.getByRole("dialog", { name: "新增商品卡" });
    await dialog.getByRole("radio", { name: /限時搶購卡/ }).check();
    await dialog.getByLabel("商品名稱").fill("【E2E】測試用保溫杯");
    await dialog.getByLabel("售價（元）").fill("680");
    await dialog.getByRole("button", { name: "建立並開始編輯" }).click();

    await expect(page).toHaveURL(/\/cards\/flash-[a-z0-9]{6}$/);
    const id = page.url().split("/").pop()!;
    await expect(canvasCard(page, id)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("【E2E】測試用保溫杯");
    // 自訂卡片沒有種子資料可還原
    await expect(page.getByRole("button", { name: "重設", exact: true })).toHaveCount(0);

    // 預設停在「內容」分頁，可直接補資料；切到「模組」即可加模組
    await expect(page.getByLabel("商品名稱")).toHaveValue("【E2E】測試用保溫杯");
    await page.getByRole("tab", { name: /模組/ }).click();
    await page.getByRole("button", { name: "加入折價券" }).click();
    await expect(canvasCard(page, id).locator('[data-plugin-id="coupon"]')).toBeVisible();

    const listed = other.locator(`li:has(momo-product-card[card-id="${id}"])`);
    await expect(listed.getByText("自訂")).toBeVisible();
  });

  test("新增卡片：名稱必填", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "新增商品卡" }).click();
    await page.getByRole("button", { name: "建立並開始編輯" }).click();
    await expect(page.getByRole("alert")).toHaveText("請輸入商品名稱");
    await expect(page).toHaveURL(/\/$/);
  });

  test("側欄可收合，偏好在重新整理後保留", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "收合側欄" }).click();
    await expect(page.getByRole("button", { name: "展開側欄" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "展開側欄" })).toBeVisible();
  });
});
