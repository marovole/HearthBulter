#!/usr/bin/env node

/**
 * Build script that sets up correct paths for Next.js standalone mode
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Set the environment variables that Next.js uses for standalone mode
// This is equivalent to what setStandaloneBuildMode does
process.env.NEXT_PRIVATE_STANDALONE = "true";
process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT = "/Users/marovole/GitHub";

console.log('🔧 Setting up Next.js standalone build mode...');
console.log('  NEXT_PRIVATE_STANDALONE:', process.env.NEXT_PRIVATE_STANDALONE);
console.log('  NEXT_PRIVATE_OUTPUT_TRACE_ROOT:', process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT);
console.log('');

// Run the OpenNext build
console.log('🏃 Running OpenNext build...');

const proc = spawn('npx', ['@opennextjs/cloudflare', 'build'], {
  cwd: '/Users/marovole/GitHub/HearthBulter',
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_PRIVATE_STANDALONE: "true",
    NEXT_PRIVATE_OUTPUT_TRACE_ROOT: "/Users/marovole/GitHub"
  }
});

proc.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ Build completed successfully');
  } else {
    console.log(`❌ Build failed with code ${code}`);
  }
  process.exit(code);
});

proc.on('error', (err) => {
  console.error('Failed to start build:', err);
  process.exit(1);
});