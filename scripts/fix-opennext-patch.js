#!/usr/bin/env node

/**
 * Fix the OpenNext patch to use the correct paths
 */

const fs = require('fs');
const path = require('path');

// Path to the helper.js file in the AWS package
const helperPath = '/Users/marovole/GitHub/HearthBulter/node_modules/.pnpm/@opennextjs+aws@3.8.5/node_modules/@opennextjs/aws/dist/build/helper.js';

// Read the file
let content = fs.readFileSync(helperPath, 'utf8');

console.log('🔧 Fixing OpenNext patch...');

// Replace the incorrect buildOutputPath
if (content.includes('const buildOutputPath = "/Users/marovole/GitHub";')) {
  content = content.replace('const buildOutputPath = "/Users/marovole/GitHub";', 'const buildOutputPath = "/Users/marovole/GitHub/HearthBulter";');
  console.log('✅ Fixed buildOutputPath');
} else {
  console.log('❌ Could not find the incorrect buildOutputPath');
}

// Write the fixed content
fs.writeFileSync(helperPath, content);

// Verify the fix
const newContent = fs.readFileSync(helperPath, 'utf8');
if (newContent.includes('const buildOutputPath = "/Users/marovole/GitHub/HearthBulter"')) {
  console.log('✅ Patch verified: buildOutputPath is now correct');
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