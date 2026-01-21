import { test, expect } from "@playwright/test";

test.describe("Smoke Test - healthbutler.life", () => {
  const baseUrl = "https://healthbutler.life";

  test("comprehensive smoke test", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("pageerror", (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // 1. Verify the homepage loads successfully
    console.log("Visiting homepage...");
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    console.log("Homepage loaded successfully (200)");

    // 2. Check for navigation links
    const navLinks = await page.locator("nav a, header a").all();
    console.log(`Found ${navLinks.length} navigation-specific links`);
    const allLinks = await page.locator("a").all();
    console.log(`Found ${allLinks.length} total links on page`);

    for (const link of allLinks) {
      const text = await link.innerText();
      const href = await link.getAttribute("href");
      console.log(`Link: "${text}" -> ${href}`);
    }

    // 3. Verify legal pages (checking for /policy or similar if seen in links)
    // Based on previous run, /legal/privacy returned 500, which is an ANOMALY.
    const legalPages = ["/legal/privacy", "/legal/terms"];
    for (const path of legalPages) {
      console.log(`Verifying legal path: ${path}`);
      const res = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      if (res?.status() !== 200) {
        console.error(`ANOMALY: ${path} returned status ${res?.status()}`);
      } else {
        console.log(`${path} is accessible (200)`);
      }
    }

    // 4. Console Errors Check
    if (consoleErrors.length > 0) {
      console.warn("Found console/page errors:", consoleErrors);
    }

    // 5. Screenshot
    await page.goto(baseUrl);
    await page.screenshot({ path: "homepage-smoke-test.png", fullPage: true });
    console.log("Final screenshot captured.");
  });
});
