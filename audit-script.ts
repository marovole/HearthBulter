import { chromium } from "playwright";

async function runAudit() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const report: any = { steps: [] };

  try {
    // Step 1: Privacy Page
    console.log("Visiting /privacy...");
    const privacyRes = await page.goto("https://healthbutler.life/privacy", {
      waitUntil: "load",
      timeout: 60000,
    });
    const privacyText = await page.textContent("body");
    const hasPrivacyText = privacyText?.includes("隐私政策");
    await page.screenshot({ path: "audit-evidence/privacy-screenshot.png" });
    report.steps.push({
      step: "Privacy Page Audit",
      url: "https://healthbutler.life/privacy",
      status: privacyRes?.status(),
      hasText: !!hasPrivacyText,
      screenshot: "audit-evidence/privacy-screenshot.png",
    });

    // Step 2: Dashboard Redirect
    console.log("Visiting /dashboard...");
    const dashboardRes = await page.goto("https://healthbutler.life/dashboard", {
      waitUntil: "load",
      timeout: 60000,
    });
    const finalUrl = page.url();
    const status = dashboardRes?.status();
    report.steps.push({
      step: "Dashboard Audit",
      url: "https://healthbutler.life/dashboard",
      finalUrl,
      status,
      is500: status === 500,
    });

    // Step 3: Homepage Link (More thorough link search)
    console.log("Visiting homepage...");
    await page.goto("https://healthbutler.life/", { waitUntil: "load", timeout: 60000 });

    // Log all links to see what we have
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a")).map((a) => ({
        text: a.textContent?.trim(),
        href: a.getAttribute("href"),
      }));
    });

    const privacyLink = allLinks.find((l) => l.text?.includes("隐私政策"));

    report.steps.push({
      step: "Homepage Footer Audit",
      url: "https://healthbutler.life/",
      privacyLinkFound: !!privacyLink,
      foundLink: privacyLink,
      isValid: privacyLink?.href === "/privacy",
    });
  } catch (error: any) {
    report.error = error.message;
    console.error("Audit Error:", error);
  } finally {
    await browser.close();
    console.log("AUDIT_RESULT_START");
    console.log(JSON.stringify(report, null, 2));
    console.log("AUDIT_RESULT_END");
  }
}

runAudit();
