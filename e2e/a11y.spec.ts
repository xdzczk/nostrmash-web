import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/search?q=bitcoin&tab=all",
  "/trending",
  "/trending/notes",
  "/discovery/conversations/hot",
  "/relays",
  "/relays/health",
  "/stats",
  "/hashtags/nostr",
  `/notes/${"a".repeat(64)}`,
  `/profiles/${"b".repeat(64)}`,
] as const;

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((next) => {
    if (next === "dark") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
  }, theme);
}

async function disableMotion(page: Page) {
  // Page-enter fades opacity 0→1; axe mid-animation reports false contrast failures.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

async function expectNoSeriousViolations(page: Page, route: string, theme: "dark" | "light") {
  await page.goto(route);
  await setTheme(page, theme);
  if (theme === "light") {
    await page.reload();
  }
  await disableMotion(page);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );

  expect(
    serious,
    [
      `${theme} theme ${route}`,
      ...serious.map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(" "))
            .join("; ")}`
      ),
    ].join("\n")
  ).toEqual([]);
}

test.describe("accessibility", () => {
  for (const route of ROUTES) {
    test(`no serious/critical axe violations on ${route} (dark)`, async ({ page }) => {
      await expectNoSeriousViolations(page, route, "dark");
    });

    test(`no serious/critical axe violations on ${route} (light)`, async ({ page }) => {
      await expectNoSeriousViolations(page, route, "light");
    });
  }
});
