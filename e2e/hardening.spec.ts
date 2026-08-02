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

  test("document responses include a nonced CSP without script unsafe-inline", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src[^;]*'nonce-/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/);
    expect(csp).not.toMatch(/platform\.twitter\.com/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
  });

  test("embed routes carve out frame-ancestors", async ({ request }) => {
    const response = await request.get(`/embed/notes/${"a".repeat(64)}`);
    expect(response.ok()).toBeTruthy();
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toMatch(/frame-ancestors \*/);
    expect(response.headers()["x-frame-options"]).toBeFalsy();
  });
});
