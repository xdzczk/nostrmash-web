import { expect, test } from "@playwright/test";

test.describe("explorer smoke", () => {
  test("home renders brand and search entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /nostrmash/i }).first()).toBeVisible();
    await expect(page.getByRole("search").or(page.locator("form")).first()).toBeVisible();
  });

  test("search page renders", async ({ page }) => {
    await page.goto("/search?q=bitcoin");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("trending hub renders", async ({ page }) => {
    await page.goto("/trending");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("methodology page renders", async ({ page }) => {
    await page.goto("/methodology");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/index|ranking|window/i).first()).toBeVisible();
  });

  test("profile page renders with mock API data", async ({ page }) => {
    await page.goto(`/profiles/${"e".repeat(64)}`);
    await expect(page.getByText(/mock profile/i).first()).toBeVisible();
  });

  test("note page renders with mock API data", async ({ page }) => {
    await page.goto(`/notes/${"a".repeat(64)}`);
    await expect(page.getByText(/mock note content/i).first()).toBeVisible();
  });

  test("unknown routes show the not-found page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText(/page not found/i)).toBeVisible();
    await expect(page.locator("#main-content").getByRole("link", { name: "Home" })).toBeVisible();
  });
});
