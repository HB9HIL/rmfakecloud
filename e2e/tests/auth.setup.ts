import { expect, test as setup } from "@playwright/test";

// The first login on an empty instance creates the admin user
setup("login as admin", async ({ page, request }) => {
  await expect
    .poll(() => request.get("/health").then((r) => r.status(), () => 0), { timeout: 30_000 })
    .toBe(200);

  await page.goto("/login");
  await page.locator("#username").fill("admin");
  await page.locator("#password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/documents");
  await page.context().storageState({ path: ".auth/admin.json" });
});
