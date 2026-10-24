import { expect, test } from "@playwright/test";

test.describe("logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to the login page", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL("/login");
    await expect(page.locator("footer")).toHaveCount(0);
  });

  test("rejects a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("wrong");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Can't login")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("shows a 404 page", async ({ page }) => {
    await page.goto("/nope");
    await expect(page.getByText("Page Not Found.")).toBeVisible();
  });
});

test("shows the documents after login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/documents");
  await expect(page.locator("#userMenu")).toHaveText("admin");
  await expect(page.locator("footer")).toHaveText(/^rmfakecloud \S+$/);
});

test("logs out", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/documents");
  await expect(page).toHaveURL("/login");
});
