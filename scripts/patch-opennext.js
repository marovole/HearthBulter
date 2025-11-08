#!/usr/bin/env node

/**
 * Patch OpenNext to work with Next.js standalone mode in a monorepo
 * This script modifies the normalizeOptions function to set the correct paths
 */

const fs = require('fs');
const path = require('path');

// Path to the helper.js file
const helperPath = '/Users/marovole/GitHub/HearthBulter/node_modules/.pnpm/@opennextjs+aws@3.8.5/node_modules/@opennextjs/aws/dist/build/helper.js';

// Read the file
const content = fs.readFileSync(helperPath, 'utf8');

// Find and replace the normalizeOptions function
const oldCode = `export function normalizeOptions(config, distDir, tempBuildDir) {
    const appPath = path.join(process.cwd(), config.appPath || ".");
    const buildOutputPath = path.join(process.cwd(), config.buildOutputPath || ".");
    const outputDir = path.join(buildOutputPath, ".open-next");
    const { root: monorepoRoot, packager } = findMonorepoRoot(path.join(process.cwd(), config.appPath || "."));`;

const newCode = `export function normalizeOptions(config, distDir, tempBuildDir) {
    const appPath = path.join(process.cwd(), config.appPath || ".");
    
    // Force buildOutputPath to be the monorepo root for standalone mode
    const buildOutputPath = "/Users/marovole/GitHub";
    const outputDir = path.join(buildOutputPath, ".open-next");
    
    // Force monorepoRoot to match buildOutputPath
    const monorepoRoot = "/Users/marovole/GitHub";
    const packager = "pnpm";`;

if (content.includes(oldCode)) {
  const newContent = content.replace(oldCode, newCode);
  fs.writeFileSync(helperPath, newContent);
  console.log('✅ Successfully patched normalizeOptions function');
  console.log('  buildOutputPath forced to: /Users/marovole/GitHub');
  console.log('  monorepoRoot forced to: /Users/marovole/GitHub');
} else {
  console.log('❌ Could not find the code to patch');
  console.log('The function may have already been patched or the code has changed');
}