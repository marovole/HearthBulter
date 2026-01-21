import { test, expect } from "@playwright/test";

const BASE_URL = "https://healthbutler.life";

test("1. Verify /privacy, /terms, and /contact return 200 and have content", async ({ page }) => {
  const paths = ["/privacy", "/terms", "/contact"];

  for (const path of paths) {
    process.stdout.write(`Checking ${path}...\n`);
    const response = await page.goto(`${BASE_URL}${path}`);
    const status = response?.status();
    const title = await page.title();
    const content = await page.textContent("body");

    process.stdout.write(`Path: ${path} | Status: ${status} | Title: ${title}\n`);

    expect(status).toBe(200);

    if (path === "/privacy") {
      expect(content?.toLowerCase()).toContain("privacy");
    } else if (path === "/terms") {
      expect(content?.toLowerCase()).toContain("terms");
    } else if (path === "/contact") {
      expect(content?.toLowerCase()).toContain("contact");
    }
  }
});

test("2. Verify /dashboard redirects to Clerk and no 500 error", async ({ page }) => {
  process.stdout.write("Checking /dashboard redirect...\n");
  const response = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "commit" });

  const url = page.url();
  const status = response?.status();
  process.stdout.write(`Final URL after /dashboard: ${url} | Initial Status: ${status}\n`);

  expect(url).toMatch(/clerk\.com|accounts\.healthbutler\.life/);
  expect(status).not.toBe(500);
});

test("3. Check homepage footer links", async ({ page }) => {
  process.stdout.write("Checking homepage footer links...\n");
  await page.goto(BASE_URL);

  const privacyLink = page.locator('footer a:has-text("Privacy"), footer a:has-text("隐私")');
  const termsLink = page.locator('footer a:has-text("Terms"), footer a:has-text("条款")');

  const privacyHref = await privacyLink.first().getAttribute("href");
  const termsHref = await termsLink.first().getAttribute("href");

  process.stdout.write(`Privacy Link Href: ${privacyHref}\n`);
  process.stdout.write(`Terms Link Href: ${termsHref}\n`);

  expect(privacyHref).not.toBe("#");
  expect(termsHref).not.toBe("#");
  expect(privacyHref).toContain("/privacy");
  expect(termsHref).toContain("/terms");
});
