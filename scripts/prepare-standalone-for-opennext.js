#!/usr/bin/env node

/**
 * Prepare standalone directory for OpenNext
 * Next.js standalone creates: .next/standalone/GitHub/HearthBulter/.next
 * OpenNext expects: .next/standalone/{packagePath}/.next (relative to buildOutputPath)
 * Where packagePath = path.relative(monorepoRoot, buildOutputPath) = "HearthBulter"
 * This script copies the files to the expected location, including node_modules
 */

const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/marovole/GitHub/HearthBulter';
const monorepoRoot = '/Users/marovole/GitHub';
const buildOutputPath = '/Users/marovole/GitHub/HearthBulter';

// Calculate packagePath (what OpenNext expects)
const packagePath = path.relative(monorepoRoot, buildOutputPath); // Should be "HearthBulter"

// Paths - Next.js creates .next/standalone/{monorepoPath}/{packagePath}
// For us: .next/standalone/GitHub/HearthBulter/.next
// OpenNext expects: .next/standalone/{packagePath}/.next (relative to buildOutputPath)
// Which is: .next/standalone/HearthBulter/.next
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const sourceDir = path.join(standaloneDir, 'GitHub', 'HearthBulter');
const targetDir = path.join(standaloneDir, packagePath);

console.log('🔧 Preparing standalone for OpenNext...');
console.log('  monorepoRoot:', monorepoRoot);
console.log('  buildOutputPath:', buildOutputPath);
console.log('  packagePath:', packagePath);
console.log('  Source dir:', sourceDir);
console.log('  Target dir:', targetDir);

// Check if source exists
if (!fs.existsSync(sourceDir)) {
  console.error('❌ Source directory does not exist:', sourceDir);
  process.exit(1);
}

// Remove existing target if it exists
if (fs.existsSync(targetDir)) {
  console.log('🗑️  Removing existing target directory');
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// Ensure parent directory exists
const targetParentDir = path.dirname(targetDir);
if (!fs.existsSync(targetParentDir)) {
  fs.mkdirSync(targetParentDir, { recursive: true });
}

// Copy entire directory tree
console.log('📋 Copying entire standalone directory...');
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
    } else if (stat.isSymbolicLink()) {
      // Handle symlinks
      const linkTarget = fs.readlinkSync(srcPath);
      try {
        fs.symlinkSync(linkTarget, destPath);
      } catch (err) {
        // If symlink creation fails, copy the file instead
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (copyErr) {
          console.warn(`⚠️  Warning: Could not copy symlink ${srcPath}: ${copyErr.message}`);
        }
      }
    } else if (stat.isFile() || stat.isFIFO()) {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.warn(`⚠️  Warning: Could not copy file ${srcPath}: ${err.message}`);
      }
    } else {
      console.warn(`⚠️  Warning: Skipping special file ${srcPath}`);
    }
  });
}

copyDir(sourceDir, targetDir);
console.log('✅ Entire standalone directory copied');

// Also copy package.json to standalone root (needed for nft.json relative paths like ../../../../package.json)
const sourcePackageJson = path.join(sourceDir, 'package.json');
const targetPackageJson = path.join(standaloneDir, 'package.json');

if (fs.existsSync(sourcePackageJson)) {
  console.log('📋 Copying package.json to standalone root...');
  fs.copyFileSync(sourcePackageJson, targetPackageJson);
  console.log('✅ package.json copied to standalone root');
} else {
  console.log('⚠️  Warning: source package.json does not exist:', sourcePackageJson);
}

// Also copy .next/static from the original build (not in standalone)
const sourceStaticDir = path.join(projectRoot, '.next', 'static');
const targetStaticDir = path.join(buildOutputPath, '.next', 'static');

if (fs.existsSync(sourceStaticDir)) {
  console.log('📋 Copying .next/static directory...');
  copyDir(sourceStaticDir, targetStaticDir);
  console.log('✅ .next/static directory copied');
} else {
  console.log('⚠️  Warning: .next/static directory does not exist:', sourceStaticDir);
}

// Copy nft.json files that are in the standalone root
const nftFiles = [
  'next-server.js.nft.json',
  'next-minimal-server.js.nft.json'
];

nftFiles.forEach(filename => {
  const sourcePath = path.join(standaloneDir, 'GitHub', 'HearthBulter', filename);
  const targetPath = path.join(buildOutputPath, '.next', filename);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied ${filename}`);
  } else {
    console.log(`⚠️  Warning: ${filename} does not exist`);
  }
});

console.log('✅ Standalone preparation complete');
console.log('');
console.log('OpenNext will look for files at:');
console.log('  .next/standalone/' + packagePath + '/.next/server');
console.log('  .next/standalone/' + packagePath + '/node_modules');
console.log('  .next/standalone/' + packagePath + '/package.json');
console.log('  .next/standalone/' + packagePath + '/.env files');
console.log('  .next/standalone/package.json (for nft.json relative paths)');