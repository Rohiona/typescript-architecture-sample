import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/demo/reset");
  expect(response.ok()).toBe(true);
});

test("仮予約の在庫競合・期限切れ・確定・貸出・返却を実DBで操作する", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "機材一覧", level: 1, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "この内容で仮予約する" }).click();
  const camera = page.getByRole("article", { name: "ミラーレスカメラの予約" });
  await expect(camera.getByText("仮予約", { exact: true })).toBeVisible();

  await page.getByLabel("利用者を切り替え").selectOption("customer-b");
  await page.getByRole("button", { name: "機材一覧", exact: true }).click();
  await page.getByRole("button", { name: "この内容で仮予約する" }).click();
  await expect(page.getByRole("alert")).toContainText("必要な台数を確保できません");
  await page.getByRole("button", { name: "+15分", exact: true }).click();
  await page.getByRole("button", { name: "この内容で仮予約する" }).click();
  await expect(camera.getByText("仮予約", { exact: true })).toBeVisible();
  await camera.getByRole("button", { name: "予約を確定", exact: true }).click();
  await expect(camera.getByText("予約確定", { exact: true })).toBeVisible();

  await page.getByLabel("利用者を切り替え").selectOption("staff-1");
  await page.getByRole("button", { name: "+1時間", exact: true }).click();
  await page.getByRole("button", { name: "貸出管理", exact: true }).click();
  await camera.getByRole("button", { name: "貸し出す", exact: true }).click();
  await expect(camera.getByText("貸出中", { exact: true })).toBeVisible();
  await camera.getByRole("button", { name: "返却を受け付ける", exact: true }).click();
  await page.getByRole("button", { name: /^予約一覧/ }).click();
  // Staff can see the expired reservation and the new, returned reservation.
  await expect(camera.filter({ hasText: "返却済み" })).toHaveCount(1);
});

test("スマホで予約と初期化を操作でき、横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "この内容で仮予約する" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "この内容で仮予約する" }).click();
  await expect(page.getByRole("article", { name: "ミラーレスカメラの予約" })).toBeVisible();
  await page.getByRole("button", { name: "初期化", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "デモを初期化", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "機材一覧", level: 1, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
