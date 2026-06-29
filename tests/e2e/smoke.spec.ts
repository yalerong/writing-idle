import { expect, test } from "@playwright/test";
import path from "node:path";

test("loads the local workspace shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Novel Idle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "选择 novel-lab 文件夹" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把 novel-lab 接进来" })).toBeVisible();
});

test("loads a fixture project and renders chapter context pack", async ({ page }) => {
  await page.goto("/");
  await page.locator("#folderInput").setInputFiles(path.resolve("tests/fixtures/novel-lab"));

  await expect(page.getByText("2 个正文文件")).toBeVisible();
  await page.getByRole("button", { name: "章节" }).click();
  await page.getByRole("button", { name: /卷一 · 亡命/ }).click();

  await expect(page.locator("#detailTitle")).toHaveText("卷一 · 亡命");
  await expect(page.locator("#contextPackPreview")).toHaveValue(/上一章结尾/);
  await expect(page.locator("#contextPackPreview")).toHaveValue(/沈砚看见明堂灯火/);
  await expect(page.locator("#contextPackPreview")).toHaveValue(/character\/沈砚\.md/);
});
