#!/usr/bin/env node

/**
 * Prepare standalone directory for OpenNext
 * Simply copies .next/static to the standalone directory
 * OpenNext will handle the rest based on the directory structure created by Next.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

console.log('🔧 Preparing standalone for OpenNext...');
console.log('  Project root:', projectRoot);

// Check if .next/standalone exists
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
if (!fs.existsSync(standaloneDir)) {
  console.error('❌ .next/standalone directory does not exist');
  console.error('   This should have been created by Next.js build');
  process.exit(1);
}

// Copy .next/static from the original build (not in standalone)
const sourceStaticDir = path.join(projectRoot, '.next', 'static');
const targetStaticDir = path.join(projectRoot, '.next', 'standalone', '.next', 'static');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.lstatSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (stat.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

if (fs.existsSync(sourceStaticDir)) {
  console.log('📋 Copying .next/static directory...');
  copyDir(sourceStaticDir, targetStaticDir);
  console.log('✅ .next/static directory copied');
} else {
  console.log('⚠️  Warning: .next/static directory does not exist:', sourceStaticDir);
}

console.log('');
console.log('✅ Standalone preparation complete');
