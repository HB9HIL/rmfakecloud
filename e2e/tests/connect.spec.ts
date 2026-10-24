import { expect, test } from "@playwright/test";

test("shows a pairing code", async ({ page }) => {
  await page.goto("/connect");
  await expect(page.locator("h1")).toHaveText(/^[a-z]{8}$/);
});
