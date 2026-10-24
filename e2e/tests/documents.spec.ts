import { expect, test } from "@playwright/test";
import { unique, upload } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/documents");
});

test("uploads, opens and trashes a pdf", async ({ page }) => {
  const name = unique("lifecycle");
  const item = page.locator(".filelist-item", { hasText: name });
  await upload(page, "test.pdf", name);
  await item.dblclick();

  await expect(page).toHaveURL(/\/documents\/.+/);
  await expect(page.locator(".react-pdf__Page canvas")).toBeVisible();
  await expect(page.getByText("Page: ")).toHaveCount(0);

  await page.goto("/documents");
  await item.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Move to Trash" }).click();
  await expect(item).toHaveCount(0);

  await page.goto("/documents/trash");
  await item.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await expect(item).toHaveCount(0);
  await page.goto("/documents");
  await expect(item).toBeVisible();
});

test("keeps the page when a document can't be rendered", async ({ page }) => {
  const name = unique("broken");
  await upload(page, "test.pdf", name);
  await page.route("**/ui/api/documents/*", (route) => route.fulfill({ body: "not a pdf" }));
  await page.locator(".filelist-item", { hasText: name }).dblclick();
  await expect(page.getByText("Failed to load the document.")).toBeVisible();
  await expect(page.locator("nav[aria-label=Breadcrumb] a", { hasText: "My Files" })).toBeVisible();
});

test("puts search hits on the page", async ({ page }) => {
  const name = unique("hits");
  await upload(page, "text.pdf", name);
  await page.locator(".filelist-item", { hasText: name }).dblclick();
  const canvas = page.locator(".react-pdf__Page canvas");
  await expect(canvas).toBeVisible();
  await page.locator("input[name=q]").fill("Searchable");
  await page.locator("input[name=q]").press("Enter");

  // the text layer must lie on the canvas, not next to it
  const mark = page.locator(".textLayer mark").first();
  await expect(async () => {
    const p = (await canvas.boundingBox())!;
    const hit = (await mark.boundingBox())!;
    expect(hit.x).toBeGreaterThanOrEqual(p.x);
    expect(hit.x + hit.width).toBeLessThanOrEqual(p.x + p.width);
    expect(hit.y).toBeGreaterThanOrEqual(p.y);
    expect(hit.y + hit.height).toBeLessThanOrEqual(p.y + p.height);
  }).toPass();
  await expect(mark).toHaveCSS("color", "rgba(0, 0, 0, 0)");
});

test("creates and renames a folder", async ({ page }) => {
  const [before, after] = [unique("Projects"), unique("Archive")];
  await page.getByRole("button", { name: "New Folder", exact: true }).click();
  await expect(page.locator("input:focus")).toHaveValue("New folder");
  await page.keyboard.type(before);
  await page.keyboard.press("Enter");
  await page.locator(".filelist-item", { hasText: before }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.keyboard.type(after);
  await page.keyboard.press("Enter");
  await expect(page.locator(".filelist-item", { hasText: after })).toBeVisible();
  await expect(page.locator(".filelist-item", { hasText: before })).toHaveCount(0);
});

test("selects with the keyboard and moves to the trash", async ({ page }) => {
  const name = unique("Keyboard");
  const item = page.locator(".filelist-item", { hasText: name });
  await page.getByRole("button", { name: "New Folder", exact: true }).click();
  await expect(page.locator("input:focus")).toHaveValue("New folder");
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
  await item.click();
  await expect(item).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Delete");
  await expect(item).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(item).toBeVisible();
});

test("switches between list and grid", async ({ page }) => {
  await page.locator("label[for=grid]").click();
  await expect(page.locator(".filegrid")).toBeVisible();
  await page.locator("label[for=list]").click();
  await expect(page.locator(".filelist")).toBeVisible();
});
