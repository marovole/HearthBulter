/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("fs");
const path = require("path");

const routesConfig = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/avatars/*",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/BUILD_ID",
    "/sw.js",
    "/logo.svg",
    "/manifest.json",
    "/*.png",
    "/*.ico",
    "/*.svg",
  ],
};

const outputPath = path.join(__dirname, "..", ".open-next", "_routes.json");

fs.writeFileSync(outputPath, JSON.stringify(routesConfig, null, 2));

console.log("✅ Generated _routes.json for Cloudflare Pages");
console.log(`   Exclude paths: ${routesConfig.exclude.length} patterns`);
