#!/usr/bin/env node

/**
 * Patch OpenNext's normalizeOptions function to use correct paths
 * This is necessary because defineCloudflareConfig doesn't support buildOutputPath and monorepoRoot
 */

const fs = require('fs');
const path = require('path');

// Path to the helper.js file in the AWS package
const helperPath = '/Users/marovole/GitHub/HearthBulter/node_modules/.pnpm/@opennextjs+aws@3.8.5/node_modules/@opennextjs/aws/dist/build/helper.js';

// Read the file
let content = fs.readFileSync(helperPath, 'utf8');

// Find the normalizeOptions function and replace it
const oldFunction = `export function normalizeOptions(config, distDir, tempBuildDir) {
    const appPath = path.join(process.cwd(), config.appPath || ".");
    const buildOutputPath = path.join(process.cwd(), config.buildOutputPath || ".");
    const outputDir = path.join(buildOutputPath, ".open-next");
    const { root: monorepoRoot, packager } = findMonorepoRoot(path.join(process.cwd(), config.appPath || "."));`;

const newFunction = `export function normalizeOptions(config, distDir, tempBuildDir) {
    const appPath = path.join(process.cwd(), config.appPath || ".");
    // Force buildOutputPath to the project root
    const buildOutputPath = "/Users/marovole/GitHub/HearthBulter";
    const outputDir = path.join(buildOutputPath, ".open-next");
    // Force monorepoRoot to GitHub directory
    const monorepoRoot = "/Users/marovole/GitHub";
    const packager = "pnpm";`;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync(helperPath, content);
  console.log('✅ Successfully patched normalizeOptions function');
} else {
  console.log('❌ Could not find the exact function to patch');
  console.log('Trying alternative approach...');
  
  // Try patching individual lines
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const buildOutputPath = path.join(process.cwd(), config.buildOutputPath || ".");')) {
      lines[i] = '    const buildOutputPath = "/Users/marovole/GitHub/HearthBulter"; // PATCHED';
      modified = true;
    }
    
    if (lines[i].includes('const { root: monorepoRoot, packager } = findMonorepoRoot')) {
      lines[i] = '    const monorepoRoot = "/Users/marovole/GitHub"; // PATCHED\n    const packager = "pnpm"; // PATCHED';
      modified = true;
      break;
    }
  }
  
  if (modified) {
    fs.writeFileSync(helperPath, lines.join('\n'));
    console.log('✅ Successfully patched using line-by-line approach');
  } else {
    console.log('❌ Could not patch the file');
    process.exit(1);
  }
}

// Verify the patch
const newContent = fs.readFileSync(helperPath, 'utf8');
if (newContent.includes('const buildOutputPath = "/Users/marovole/GitHub/HearthBulter"')) {
  console.log('✅ Patch verified: buildOutputPath is correct');
} else {
  console.log('❌ Patch verification failed');
  process.exit(1);
}

if (newContent.includes('const monorepoRoot = "/Users/marovole/GitHub"')) {
  console.log('✅ Patch verified: monorepoRoot is correct');
} else {
  console.log('❌ Patch verification failed for monorepoRoot');
  process.exit(1);
}