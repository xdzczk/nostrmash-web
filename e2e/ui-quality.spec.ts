import { expect, test } from "@playwright/test";

test.describe("global product shell", () => {
  test("search is available globally by keyboard", async ({ page }) => {
    await page.goto("/trending/notes");
    const globalSearch = page.locator("#global-search-input");
    await expect(globalSearch).toBeVisible();
    await page.keyboard.press("ControlOrMeta+K");
    await expect(globalSearch).toBeFocused();

    await globalSearch.fill("bitcoin");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=bitcoin&tab=all/);
  });

  test("mobile search opens as a focused modal surface", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open search" }).click();

    const dialog = page.getByRole("dialog", { name: "Search NostrMash" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox")).toBeFocused();
  });

  test("primary navigation reflects the product architecture", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(nav.getByRole("link", { name: "Network" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Search" })).toHaveCount(0);
  });

  test("Discover category and mode context stay explicit", async ({ page }) => {
    await page.goto("/trending/long-form?window=7d");

    const categories = page.getByRole("navigation", { name: "Discover categories" });
    await expect(categories.getByRole("link", { name: "Notes" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(categories.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/trending/profiles?window=7d"
    );
    await expect(
      page.getByRole("navigation", { name: "notes modes" }).getByRole("link", {
        name: "Long-form",
      })
    ).toHaveAttribute("aria-current", "page");
  });

  test("entity pages use contextual return navigation instead of category chrome", async ({
    page,
  }) => {
    await page.goto(`/notes/${"a".repeat(64)}`);
    const context = page.getByRole("navigation", { name: "Discovery context" });
    await expect(context.getByRole("link", { name: "Back to Notes" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Discover categories" })).toHaveCount(0);
  });
});

test.describe("responsive visual references", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("Discover desktop reference", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("discover-desktop.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("Discover mobile reference", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page).toHaveScreenshot("discover-mobile.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

test.describe("experience budgets", () => {
  test("Discover remains stable and has no horizontal overflow", async ({ page }) => {
    await page.addInitScript(() => {
      (window as typeof window & { __layoutShiftScore?: number }).__layoutShiftScore = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) {
            const target = window as typeof window & { __layoutShiftScore?: number };
            target.__layoutShiftScore = (target.__layoutShiftScore ?? 0) + shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => ({
      cls: (window as typeof window & { __layoutShiftScore?: number }).__layoutShiftScore ?? 0,
      overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));

    expect(result.cls).toBeLessThanOrEqual(0.1);
    expect(result.overflows).toBe(false);
  });
});
