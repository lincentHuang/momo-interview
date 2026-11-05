import { expect, type Page } from "@playwright/test";

/** Playwright 的 CSS locator 預設會穿透 open Shadow DOM */
export const card = (page: Page, id: string) => page.locator(`momo-product-card[card-id="${id}"]`);

export async function openEditor(page: Page, id: string) {
  await page.goto(`/cards/${id}`);
  // 等 Store hydrate、Web Component 載入完成
  await expect(card(page, id).locator(".price")).toBeVisible();
}

export async function openSample(page: Page) {
  await page.goto("/sample.html");
  await expect(card(page, "std-airfryer").locator(".price")).toBeVisible();
}

export async function fillNumber(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
}
