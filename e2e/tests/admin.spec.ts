import { expect, test } from "@playwright/test";
import { unique } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
});

test("lists the admin user", async ({ page }) => {
  await expect(page.locator("tr", { hasText: "admin" })).toBeVisible();
});

test("creates and deletes a user", async ({ page }) => {
  const bob = unique("bob");
  await page.getByRole("button", { name: "New User" }).click();
  await page.locator("input[name=userid]").fill(bob);
  await page.locator("input[name=email]").fill(`${bob}@example.com`);
  await page.locator("input[name=newPassword]").fill("secret");
  await page.getByRole("button", { name: "Save" }).click();

  const row = page.locator("tr", { hasText: bob });
  await expect(row).toContainText(`${bob}@example.com`);
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
});
