import { expect, test } from "@playwright/test";

test.describe("global product shell", () => {
  test("search is available globally by keyboard", async ({ page }) => {
    await page.goto("/trending/notes");
    await page.keyboard.press("/");
    await expect(page.locator("#global-search-input")).toBeFocused();

    await page.locator("#global-search-input").fill("bitcoin");
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
