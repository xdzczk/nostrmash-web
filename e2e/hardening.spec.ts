import { expect, test } from "@playwright/test";

test.describe("edge hardening", () => {
  test("invalid note ids render not-found without depending on upstream content", async ({
    page,
  }) => {
    await page.goto("/notes/not-a-valid-event-id");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test("invalid profile ids render not-found", async ({ page }) => {
    await page.goto("/profiles/not-a-valid-pubkey");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test("invalid domain ids render not-found", async ({ page }) => {
    await page.goto("/domains/not%20a%20domain");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});
