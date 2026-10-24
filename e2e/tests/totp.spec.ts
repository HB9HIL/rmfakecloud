import { expect, test, type Page } from "@playwright/test";
import { totp, unique } from "./helpers";

const login = async (page: Page, userid: string) => {
  await page.goto("/login");
  await page.locator("#username").fill(userid);
  await page.locator("#password").fill("secret");
  await page.getByRole("button", { name: "Login" }).click();
};

// two-factor login for a separate user in its own browser context, the admin session stays without it
test("enables, requires and disables the code", async ({ page, browser }) => {
  const carol = unique("carol");
  const row = page.locator("tr", { hasText: carol });
  await page.goto("/admin");
  await page.getByRole("button", { name: "New User" }).click();
  await page.locator("input[name=userid]").fill(carol);
  await page.locator("input[name=email]").fill(`${carol}@example.com`);
  await page.locator("input[name=newPassword]").fill("secret");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(row).toBeVisible();

  const user = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await login(user, carol);
  await expect(user).toHaveURL("/documents");

  // each code needs a newer time step than the one before (replay protection)
  await user.goto("/profile");
  const secret = await user.locator(".font-mono").textContent();
  await user.locator("input[name=code]").fill(totp(secret!, -1));
  await user.getByRole("button", { name: "Enable" }).click();
  await expect(user.getByRole("button", { name: "Disable" })).toBeVisible();

  await user.getByRole("button", { name: "Log out" }).click();
  await login(user, carol);
  await user.locator("#code").fill("000000");
  await user.getByRole("button", { name: "Login" }).click();
  await expect(user.getByText("Invalid code")).toBeVisible();
  await expect(user).toHaveURL("/login");

  await user.locator("#code").fill(totp(secret!, 0));
  await user.getByRole("button", { name: "Login" }).click();
  await expect(user).toHaveURL("/documents");

  await user.goto("/profile");
  await user.locator("input[name=code]").fill(totp(secret!, 1));
  await user.getByRole("button", { name: "Disable" }).click();
  await expect(user.getByRole("button", { name: "Enable" })).toBeVisible();
  await user.close();

  await page.reload();
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
});
