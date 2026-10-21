import { expect, test } from "@playwright/test";

const FOCAL_ID = "a".repeat(64);
const NESTED_REPLY_ID = "3".repeat(64);

test.describe("note page reading surface", () => {
  test("puts the note first under a single author-led heading", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);

    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);
    await expect(headings).toHaveText("Note by Mock Author");

    // The focal note is the first thing in the reading column and renders at
    // reading size; nothing on the page is below 12px.
    const body = page.locator("#note .nm-note-body");
    await expect(body).toBeVisible();
    await expect(page.locator("#conversation-context article").first()).toBeVisible();
    const fontSize = await body.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(17);

    const smallest = await page.evaluate(() => {
      let min = Infinity;
      for (const el of document.querySelectorAll("main *")) {
        if (el.children.length > 0 || !el.textContent?.trim()) continue;
        min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
      }
      return min;
    });
    expect(smallest).toBeGreaterThanOrEqual(12);

    // Schema-dump sections and leaked internals are gone.
    await expect(page.getByText("Media summary")).toHaveCount(0);
    await expect(page.getByText("Quote or repost context")).toHaveCount(0);
    await expect(page.getByText(/skipped for faster/i)).toHaveCount(0);
    await expect(page.getByText(/cursor/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Inspect thread" })).toHaveCount(0);

    // Engagement appears once, on the note itself.
    await expect(page.locator("#note").getByText("Replies", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /engagement/i })).toHaveCount(0);
  });

  test("meta description is a readable summary, not a truncated URL dump", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);
    const description = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute("content");
    expect(description).toMatch(/^Mock Author: Hello/);
    expect(description).not.toContain("npub1");
    expect(description).not.toContain("nostr:");
  });
});

test.describe("note page thread", () => {
  test("threads replies one level deep, folds duplicates, and loads more in place", async ({
    page,
  }) => {
    await page.goto(`/notes/${FOCAL_ID}`);

    const thread = page.locator("#conversation-context");
    await expect(thread.getByRole("heading", { name: /^\d+ replies$/ })).toBeVisible();

    // Two top-level replies; the nested reply and the depth-2 reply both sit
    // one visual level down, and the depth-2 one says who it answers.
    const topLevel = thread.getByRole("article", { name: "Reply", exact: true });
    await expect(topLevel).toHaveCount(2);
    const nested = thread.getByRole("article", { name: "Nested reply" });
    await expect(nested).toHaveCount(2);
    const deep = nested.filter({ hasText: "Deep reply to the nested reply" });
    await expect(deep.getByText("replying to")).toBeVisible();
    await expect(deep.getByRole("link", { name: "@Nested Nancy" })).toBeVisible();
    await expect(
      nested.filter({ hasText: "Nested reply to the first reply" }).getByText("replying to")
    ).toHaveCount(0);

    // Two identical replies from one author are folded into a single card.
    await expect(thread.getByText("Same reply posted twice")).toHaveCount(1);
    await expect(thread.getByText("posted 2 times")).toBeVisible();

    // Replies carry no action row; the timestamp is the permalink.
    await expect(thread.getByRole("link", { name: "Open note" })).toHaveCount(0);
    await expect(thread.getByRole("link", { name: /Open reply by/ }).first()).toBeVisible();

    // Second page appends in place without touching the URL.
    const showMore = thread.getByRole("button", { name: "Show more replies" });
    await expect(showMore).toBeVisible();
    await showMore.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await showMore.click();
    await expect(thread.getByText("Second page reply loaded in place")).toBeVisible();
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(200);
    expect(page.url()).not.toContain("cursor");
    await expect(showMore).toBeHidden();
  });

  test("shows ancestors above a nested reply", async ({ page }) => {
    await page.goto(`/notes/${NESTED_REPLY_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reply by Nested Nancy");
    const ancestors = page.getByRole("list", { name: "Earlier in this thread" });
    await expect(ancestors).toBeVisible();
    await expect(ancestors.getByText(/Hello/)).toBeVisible();
    await expect(ancestors.getByText("First direct reply")).toBeVisible();

    const order = await page.evaluate(() => {
      const ancestorsTop =
        document.querySelector('[aria-label="Earlier in this thread"]')?.getBoundingClientRect()
          .top ?? Infinity;
      const noteTop = document.querySelector("#note")?.getBoundingClientRect().top ?? -Infinity;
      return ancestorsTop < noteTop;
    });
    expect(order).toBe(true);
  });

  test("media is letterboxed instead of cropped", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);
    const image = page.locator("#conversation-context img[src*='tall.png']").first();
    await expect(image).toBeAttached();
    await expect(image).toHaveClass(/object-contain/);
    await expect(image).not.toHaveClass(/object-cover/);
  });
});

test.describe("note page on-demand sections", () => {
  test("thread activity renders reposts as attributions, never raw JSON", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);
    const activity = page.locator("#thread-activity");
    await activity.getByRole("button", { name: "Show thread activity" }).click();

    await expect(activity.getByRole("article", { name: "Repost by Rhea Reposter" })).toBeVisible();
    await expect(activity.getByText("Quoted note body for mock e2e")).toBeVisible();
    await expect(activity.getByText(/"kind":/)).toHaveCount(0);
    expect(page.url()).not.toContain("view=full");
  });

  test("related reposts of the focal note collapse to one line", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);
    const related = page.locator("#related-notes");
    await related.getByRole("button", { name: "Show related notes" }).click();

    await expect(related.getByText("reposted this note")).toBeVisible();
    await expect(related.getByText(/Hello https:\/\/example\.com/)).toHaveCount(0);
    await expect(related.getByText(/"sig":/)).toHaveCount(0);
  });
});

test.describe("note page mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no horizontal overflow and the breadcrumb stays on one row", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Note by Mock Author");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const context = page.getByRole("navigation", { name: "Discovery context" });
    const rows = await context.locator("a").evaluateAll((links) => {
      const tops = new Set(links.map((link) => Math.round(link.getBoundingClientRect().top)));
      return tops.size;
    });
    expect(rows).toBe(1);
  });
});
