import { expect, test } from "@playwright/test";

test.describe("hashtag notes Show more", () => {
  test("appends the next page in place without scrolling to the top", async ({ page }) => {
    await page.goto("/hashtags/nostr/notes");

    const showMore = page.getByRole("button", { name: /show more notes/i });
    await expect(showMore).toBeVisible();

    // Read below the fold so a scroll reset would be observable.
    await showMore.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await showMore.click();
    await expect(page.getByText("Second page mock note for hashtag pagination")).toBeVisible();

    // First-page content is still present above the appended chunk.
    await expect(page.getByText(/hello/i).first()).toBeVisible();

    // No navigation happened and the reader kept their position.
    expect(page.url()).toContain("/hashtags/nostr/notes");
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(200);

    // The mock's second page has no cursor, so the button disappears.
    await expect(showMore).toBeHidden();
  });
});
