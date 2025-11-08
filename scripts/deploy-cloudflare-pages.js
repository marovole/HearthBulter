#!/usr/bin/env node

/**
 * Deploy to Cloudflare Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/marovole/GitHub/HearthBulter';

console.log('🚀 Deploying to Cloudflare Pages...');
console.log('');

// Check if _worker.js exists
const workerJsPath = path.join(projectRoot, '.open-next', '_worker.js');
if (!fs.existsSync(workerJsPath)) {
  console.error('❌ _worker.js not found at:', workerJsPath);
  console.error('Please run the build process first: pnpm build:cloudflare');
  process.exit(1);
}

console.log('✅ _worker.js found');

// Check if wrangler.toml exists
const wranglerPath = path.join(projectRoot, '.open-next', 'wrangler.toml');
if (!fs.existsSync(wranglerPath)) {
  console.error('❌ wrangler.toml not found at:', wranglerPath);
  process.exit(1);
}

console.log('✅ wrangler.toml found');

// Check bundle size
const stats = fs.statSync(workerJsPath);
const sizeInMB = stats.size / (1024 * 1024);
console.log(`📊 Bundle size: ${sizeInMB.toFixed(2)} MB`);

if (sizeInMB > 25) {
  console.error('❌ Bundle size exceeds Cloudflare Pages 25MB limit!');
  console.error('Please optimize the bundle further.');
  process.exit(1);
}

console.log('✅ Bundle size is within Cloudflare Pages limit');

// Deploy to Cloudflare Pages
console.log('');
console.log('📡 Deploying to Cloudflare Pages...');

try {
  execSync('npx wrangler pages deploy .open-next --project-name=health-butler', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  
  console.log('');
  console.log('✅ Deployment completed successfully!');
  
} catch (error) {
  console.error('');
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}