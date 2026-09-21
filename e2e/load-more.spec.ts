import { expect, test } from "@playwright/test";

test.describe("hashtag notes Show more", () => {
  test("appends every page in place without scrolling to the top", async ({ page }) => {
    await page.goto("/hashtags/nostr/notes");

    const showMore = page.getByRole("button", { name: /show more notes/i });
    await expect(showMore).toBeVisible();

    // The mock serves a chain of pages 2..5; click through all of them and
    // assert the scroll position survives every append, not just the first.
    for (let pageNumber = 2; pageNumber <= 5; pageNumber += 1) {
      await showMore.scrollIntoViewIfNeeded();
      const scrollBefore = await page.evaluate(() => window.scrollY);

      await showMore.click();
      await expect(page.getByText(`Mock hashtag pagination page ${pageNumber}`)).toBeVisible();

      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(
        Math.abs(scrollAfter - scrollBefore),
        `scroll jumped on append of page ${pageNumber}`
      ).toBeLessThan(200);
    }

    // First-page content is still present above the appended chunks, the
    // URL never changed, and the exhausted cursor hides the button.
    await expect(page.getByText(/hello/i).first()).toBeVisible();
    expect(page.url()).toContain("/hashtags/nostr/notes");
    await expect(showMore).toBeHidden();
  });
});
