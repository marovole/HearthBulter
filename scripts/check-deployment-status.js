#!/usr/bin/env node

/**
 * Check Cloudflare Pages deployment status
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = '/Users/marovole/GitHub/HearthBulter';

console.log('🔍 检查 Cloudflare Pages 部署状态...');
console.log('');

// Get the latest commit info
try {
  const commitHash = execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim();
  const commitMessage = execSync('git log -1 --pretty=%B', { cwd: projectRoot }).toString().trim();
  const commitAuthor = execSync('git log -1 --pretty=%an', { cwd: projectRoot }).toString().trim();
  
  console.log('📋 最新提交信息:');
  console.log(`   Commit: ${commitHash}`);
  console.log(`   Author: ${commitAuthor}`);
  console.log(`   Message: ${commitMessage}`);
  console.log('');
} catch (error) {
  console.error('❌ 无法获取提交信息:', error.message);
  process.exit(1);
}

// Check if wrangler is configured
const wranglerConfigPath = path.join(projectRoot, 'wrangler.toml');
if (!fs.existsSync(wranglerConfigPath)) {
  console.error('❌ wrangler.toml 未找到');
  process.exit(1);
}

console.log('✅ wrangler.toml 已配置');

// Check if _worker.js exists
const workerJsPath = path.join(projectRoot, '.open-next', '_worker.js');
if (!fs.existsSync(workerJsPath)) {
  console.error('❌ _worker.js 未找到，请先运行构建');
  process.exit(1);
}

const stats = fs.statSync(workerJsPath);
const sizeInKB = (stats.size / 1024).toFixed(2);
console.log(`✅ _worker.js 已就绪 (${sizeInKB} KB)`);

console.log('');
console.log('🚀 部署状态:');
console.log('   GitHub 推送已完成，Cloudflare Pages 应该会自动检测到变化');
console.log('   通常部署需要 1-3 分钟');
console.log('');
console.log('📊 你可以通过以下方式检查部署状态:');
console.log('   1. 访问 Cloudflare Dashboard: https://dash.cloudflare.com');
console.log('   2. 进入 Pages > health-butler 项目');
console.log('   3. 查看部署日志和状态');
console.log('');
console.log('🌐 部署成功后，访问地址会在 Cloudflare Dashboard 中显示');

// Optional: Try to get deployment status via Wrangler API
console.log('');
console.log('⏳ 尝试获取部署状态... (需要几秒钟)');

try {
  // This requires authentication, may not work in all environments
  const result = execSync('npx wrangler pages deployment list --project-name=health-butler --limit=1', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 10000
  });
  
  if (result) {
    console.log('');
    console.log('📋 最新部署:');
    console.log(result);
  }
} catch (error) {
  console.log('⚠️  无法自动获取部署状态 (可能需要配置 API 令牌)');
  console.log('   请手动检查 Cloudflare Dashboard');
}