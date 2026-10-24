import { expect, test } from "@playwright/test";
import { unique, upload } from "./helpers";

test("collapses the navigation", async ({ page }) => {
  const link = page.locator("header nav a", { hasText: "Documents" });
  await page.goto("/help");
  await expect(link).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  await link.click();

  await expect(page).toHaveURL("/documents");
  await expect(link).toBeHidden();
});

test("opens the document tree from the side", async ({ page }) => {
  const folders = page.locator("#folders");
  await page.goto("/documents");
  await expect(folders).toBeHidden();
  await page.getByRole("button", { name: "Folders" }).click();
  await expect(folders).toBeVisible();
  await folders.getByRole("treeitem", { name: "My Files" }).click();
  await expect(folders).toBeHidden();

  // a coarse pointer opens with a single tap
  const name = unique("phone");
  const item = page.locator(".filelist-item", { hasText: name });
  await upload(page, "test.pdf", name);
  await item.tap();
  await expect(page.locator(".react-pdf__Page canvas")).toBeVisible();

  await page.goto("/documents");
  await item.locator(".filelist-checkbox").check();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText(`Moved "${name}" to Trash`)).toBeVisible();
});

test("turns pages with a swipe", async ({ page }) => {
  await page.goto("/documents");
  const name = unique("swipe");
  await upload(page, "text.pdf", name);
  await page.locator(".filelist-item", { hasText: name }).tap();
  await expect(page.locator(".react-pdf__Page canvas")).toBeVisible();

  const area = page.locator(".react-pdf__Page").locator("..");
  const swipe = async (from: number, to: number) => {
    await area.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: from, clientY: 400 }] });
    await area.dispatchEvent("touchend", { changedTouches: [{ identifier: 0, clientX: to, clientY: 410 }] });
  };
  const pageInput = page.locator("input[aria-label=Page]");
  await swipe(300, 100);
  await expect(pageInput).toHaveValue("2");
  await swipe(100, 300);
  await expect(pageInput).toHaveValue("1");
});

test("has no horizontal overflow", async ({ page }) => {
  const pages = [
    ["/help", "h1"],
    ["/integrations", "table"],
    ["/admin", "table"],
    ["/connect", "h1"],
    ["/profile", "form"],
  ];
  for (const [path, ready] of pages) {
    await page.goto(path);
    await expect(page.locator(ready).first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const main = document.querySelector(".app-main")!;
      const doc = document.documentElement;
      return [main.scrollWidth - main.clientWidth, doc.scrollWidth - doc.clientWidth];
    });
    expect(overflow, path).toEqual([0, 0]);
  }
});
