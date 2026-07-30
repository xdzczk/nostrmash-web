import { expect, test, type Page } from "@playwright/test";

async function activeTabContrast(page: Page): Promise<number> {
  return page.evaluate(() => {
    const tab = document.querySelector(
      'nav[aria-label="Search result categories"] a[aria-current="page"]'
    ) as HTMLElement | null;
    if (!tab) return -1;
    const parse = (value: string) => {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?/i);
      if (!match) return null;
      return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        match[4] === undefined ? 1 : Number(match[4]),
      ] as const;
    };
    const color = parse(getComputedStyle(tab).color);
    let backgroundNode: HTMLElement | null = tab;
    let bg: ReturnType<typeof parse> = null;
    while (backgroundNode && (!bg || bg[3] === 0)) {
      bg = parse(getComputedStyle(backgroundNode).backgroundColor);
      backgroundNode = backgroundNode.parentElement;
    }
    if (!color || !bg) return -1;
    const luminance = ([r, g, b]: readonly [number, number, number, number]) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const lighter = Math.max(luminance(color), luminance(bg));
    const darker = Math.min(luminance(color), luminance(bg));
    return (lighter + 0.05) / (darker + 0.05);
  });
}

test.describe("tab contrast regression", () => {
  test("active search tab remains readable in dark and light themes", async ({ page }) => {
    await page.goto("/search?q=bitcoin");
    await expect(page.getByRole("navigation", { name: "Search result categories" })).toBeVisible();

    const darkContrast = await activeTabContrast(page);
    expect(darkContrast).toBeGreaterThanOrEqual(4.5);

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    });
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Search result categories" })).toBeVisible();

    const lightContrast = await activeTabContrast(page);
    expect(lightContrast).toBeGreaterThanOrEqual(4.5);
  });
});
