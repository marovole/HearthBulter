#!/usr/bin/env node

/**
 * Debug script to trace the build process and file existence
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = '/Users/marovole/GitHub/HearthBulter';
const targetFile = path.join(projectRoot, '.next/standalone/HearthBulter/.next/server/pages-manifest.json');

console.log('🔍 Debugging build process...');
console.log('');

// Step 1: Clean previous build
console.log('Step 1: Cleaning previous build...');
if (fs.existsSync(path.join(projectRoot, '.next'))) {
  fs.rmSync(path.join(projectRoot, '.next'), { recursive: true, force: true });
  console.log('✅ .next directory removed');
}
if (fs.existsSync(path.join(projectRoot, '.open-next'))) {
  fs.rmSync(path.join(projectRoot, '.open-next'), { recursive: true, force: true });
  console.log('✅ .open-next directory removed');
}

// Step 2: Run Next.js build
console.log('');
console.log('Step 2: Running Next.js build...');
try {
  execSync('pnpm build', { 
    cwd: projectRoot, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Next.js build completed');
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Step 3: Check what Next.js created
console.log('');
console.log('Step 3: Checking Next.js standalone output...');
const standaloneRoot = path.join(projectRoot, '.next/standalone');
if (fs.existsSync(standaloneRoot)) {
  console.log('📁 Contents of .next/standalone:');
  const items = fs.readdirSync(standaloneRoot);
  items.forEach(item => {
    const fullPath = path.join(standaloneRoot, item);
    const stat = fs.lstatSync(fullPath);
    console.log(`  ${stat.isDirectory() ? '📂' : '📄'} ${item}`);
    if (item === 'GitHub' && stat.isDirectory()) {
      const githubContents = fs.readdirSync(fullPath);
      githubContents.forEach(subitem => {
        console.log(`    📂 ${subitem}`);
      });
    }
  });
}

// Step 4: Run our preparation script
console.log('');
console.log('Step 4: Running preparation script...');
try {
  execSync('node scripts/prepare-standalone-for-opennext.js', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  console.log('✅ Preparation script completed');
} catch (error) {
  console.error('❌ Preparation script failed:', error.message);
  process.exit(1);
}

// Step 5: Verify files exist
console.log('');
console.log('Step 5: Verifying files exist after preparation...');
const filesToCheck = [
  targetFile,
  path.join(projectRoot, '.next/standalone/HearthBulter/node_modules'),
  path.join(projectRoot, '.next/standalone/HearthBulter/.next/server/app'),
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    console.log(`✅ ${path.relative(projectRoot, file)} - ${stat.isDirectory() ? 'directory' : 'file'} exists`);
  } else {
    console.log(`❌ ${path.relative(projectRoot, file)} - NOT FOUND`);
  }
});

// Step 6: Run OpenNext build with debug
console.log('');
console.log('Step 6: Running OpenNext build...');
console.log('This will show if files are still there when OpenNext runs...');

try {
  // First, let's see what the OpenNext config looks like
  console.log('');
  console.log('OpenNext config:');
  const openNextConfig = require(path.join(projectRoot, 'open-next.config.ts'));
  console.log(JSON.stringify(openNextConfig.default, null, 2));
  
  // Now run the build
  console.log('');
  console.log('Running: pnpm build:cloudflare');
  execSync('pnpm build:cloudflare', { 
    cwd: projectRoot, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', DEBUG: '*' }
  });
  
} catch (error) {
  console.error('❌ OpenNext build failed');
  
  // After failure, check if files still exist
  console.log('');
  console.log('Post-failure file check:');
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${path.relative(projectRoot, file)} still exists`);
    } else {
      console.log(`❌ ${path.relative(projectRoot, file)} disappeared!`);
    }
  });
  
  process.exit(1);
}

console.log('✅ Debug build process completed successfully');