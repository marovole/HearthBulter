#!/usr/bin/env node

/**
 * Prepare standalone directory for OpenNext
 * Next.js standalone creates: .next/standalone/{monorepoPath}/{packagePath}/.next
 * OpenNext expects: .next/standalone/{packagePath}/.next (relative to buildOutputPath)
 * This script copies the files to the expected location, including node_modules
 * 
 * This script works in any environment (local or CI/CD) by using relative paths
 */

const fs = require('fs');
const path = require('path');

// Use current working directory instead of hardcoded paths
const projectRoot = process.cwd();

console.log('🔧 Preparing standalone for OpenNext...');
console.log('  Project root:', projectRoot);
console.log('  Current directory contents:');
const rootItems = fs.readdirSync(projectRoot);
rootItems.forEach(item => {
  const stat = fs.lstatSync(path.join(projectRoot, item));
  console.log(`    ${stat.isDirectory() ? '📁' : '📄'} ${item}`);
});

// Check if .next/standalone exists
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
if (!fs.existsSync(standaloneDir)) {
  console.error('❌ .next/standalone directory does not exist');
  console.error('   This should have been created by Next.js build');
  process.exit(1);
}

console.log('');
console.log('  .next/standalone contents:');
const standaloneItems = fs.readdirSync(standaloneDir, { withFileTypes: true });
standaloneItems.forEach(item => {
  console.log(`    ${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
  if (item.isDirectory()) {
    const subItems = fs.readdirSync(path.join(standaloneDir, item.name));
    subItems.forEach(subItem => {
      console.log(`      📁 ${subItem}`);
    });
  }
});

// Auto-detect monorepo root by looking for pnpm-lock.yaml, package.json, etc.
function findMonorepoRoot(startPath) {
  let currentPath = startPath;
  
  while (currentPath !== path.dirname(currentPath)) {
    // Look for lock files that indicate monorepo root
    const lockFiles = [
      'pnpm-lock.yaml',
      'package-lock.json', 
      'yarn.lock',
      'bun.lockb'
    ];
    
    for (const lockFile of lockFiles) {
      if (fs.existsSync(path.join(currentPath, lockFile))) {
        return currentPath;
      }
    }
    
    currentPath = path.dirname(currentPath);
  }
  
  return startPath; // Fallback to project root
}

// Auto-detect build output path (usually same as project root for most projects)
const buildOutputPath = projectRoot;

// Auto-detect monorepo root
const monorepoRoot = findMonorepoRoot(projectRoot);

// Calculate packagePath (relative path from monorepo root to build output)
const packagePath = path.relative(monorepoRoot, buildOutputPath);

console.log('');
console.log('  Detected configuration:');
console.log('    Monorepo root:', monorepoRoot);
console.log('    Build output path:', buildOutputPath);
console.log('    Package path:', packagePath);
console.log('    Standalone dir:', standaloneDir);

// Try to find the source directory
// Next.js standalone creates nested directories based on the full path
function findSourceDirectory(standaloneDir, packagePath) {
  console.log('');
  console.log('  Searching for source directory...');
  
  const items = fs.readdirSync(standaloneDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log('    Found directories:', items);
  
  // If there's only one directory and it's not our packagePath, it's likely the monorepo wrapper
  if (items.length === 1 && items[0] !== packagePath) {
    const nestedPath = path.join(standaloneDir, items[0], packagePath);
    console.log('    Checking nested path:', nestedPath);
    if (fs.existsSync(nestedPath)) {
      console.log('    ✅ Found source directory at nested path');
      return path.join(standaloneDir, items[0], packagePath);
    }
  }
  
  // Try common patterns
  const possiblePaths = [
    path.join(standaloneDir, 'GitHub', 'HearthBulter'), // Local development
    path.join(standaloneDir, 'repo'), // Common CI pattern
    path.join(standaloneDir, 'workspace'), // Another CI pattern
    path.join(standaloneDir, 'project'), // Another CI pattern
    path.join(standaloneDir, packagePath), // Direct path
  ];
  
  for (const possiblePath of possiblePaths) {
    console.log('    Checking possible path:', possiblePath);
    if (fs.existsSync(possiblePath)) {
      console.log('    ✅ Found source directory');
      return possiblePath;
    }
  }
  
  // If we can't find it, list what's actually there for debugging
  console.error('❌ Could not find source directory. Contents of .next/standalone:');
  const allItems = fs.readdirSync(standaloneDir, { withFileTypes: true });
  allItems.forEach(item => {
    console.error(`   ${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
    if (item.isDirectory()) {
      const subItems = fs.readdirSync(path.join(standaloneDir, item.name));
      subItems.forEach(subItem => {
        console.error(`     📁 ${subItem}`);
      });
    }
  });
  
  throw new Error(`Source directory not found in .next/standalone`);
}

let sourceDir;
try {
  sourceDir = findSourceDirectory(standaloneDir, packagePath);
} catch (error) {
  console.error('');
  console.error(error.message);
  process.exit(1);
}

const targetDir = path.join(standaloneDir, packagePath);

console.log('');
console.log('  Final paths:');
console.log('    Source dir:', sourceDir);
console.log('    Target dir:', targetDir);

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
console.log('');
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

console.log('');
console.log('✅ Standalone preparation complete');
console.log('');
console.log('OpenNext will look for files at:');
console.log('  .next/standalone/' + packagePath + '/.next/server');
console.log('  .next/standalone/' + packagePath + '/node_modules');
console.log('  .next/standalone/' + packagePath + '/package.json');
console.log('  .next/standalone/package.json (for nft.json relative paths)');