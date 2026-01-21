import { chromium } from "playwright";

const BASE_URL = "https://healthbutler.life";

async function verify() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("--- Verification Log ---");

  const targets = ["/", "/privacy", "/terms", "/contact", "/dashboard"];

  for (const path of targets) {
    console.log(`Navigating to ${path}...`);
    try {
      const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: "load", timeout: 30000 });
      const status = response?.status();
      const finalUrl = page.url();
      const title = await page.title();
      console.log(
        `Result -> Path: ${path} | Status: ${status} | URL: ${finalUrl} | Title: ${title}`
      );

      if (path === "/") {
        const footerLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("a"))
            .map((a) => ({
              text: a.textContent?.trim(),
              href: a.getAttribute("href"),
            }))
            .filter(
              (l) =>
                l.text?.includes("Privacy") ||
                l.text?.includes("Terms") ||
                l.text?.includes("隐私") ||
                l.text?.includes("条款")
            );
        });
        console.log("Relevant links found on homepage:", footerLinks);
      }
    } catch (e: any) {
      console.log(`Failed to load ${path}: ${e.message}`);
    }
  }

  await browser.close();
}

verify();
