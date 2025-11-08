#!/usr/bin/env node

/**
 * Check Cloudflare Pages deployment status
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cloudflare API credentials would be needed for automated checks
// For now, we'll provide manual check instructions

console.log('🔍 Cloudflare Pages 部署状态检查');
console.log('');

console.log('📋 部署信息:');
console.log('   项目: health-butler');
console.log('   分支: main');
console.log('   最新提交: 3cfe8af');
console.log('   提交消息: fix: make standalone preparation script work in CI/CD environment');
console.log('');

console.log('⏱️  预计部署时间: 2-5 分钟');
console.log('');

console.log('📊 检查部署状态的方法:');
console.log('');
console.log('1️⃣  Cloudflare Dashboard:');
console.log('   • 访问: https://dash.cloudflare.com');
console.log('   • 登录你的账户');
console.log('   • 进入 Pages > health-butler');
console.log('   • 查看部署日志和状态');
console.log('');

console.log('2️⃣  部署日志:');
console.log('   • 在 Dashboard 中查看实时构建日志');
console.log('   • 检查是否有错误信息');
console.log('   • 查看构建时间线和警告');
console.log('');

console.log('3️⃣  部署成功标志:');
console.log('   • 状态显示 ✅ Success');
console.log('   • 提供访问 URL (如: https://health-butler.pages.dev)');
console.log('   • 所有环境变量已正确加载');
console.log('');

console.log('4️⃣  常见问题排查:');
console.log('   ❌ 如果部署失败:');
console.log('      - 检查构建日志中的错误信息');
console.log('      - 验证环境变量是否正确设置');
console.log('      - 检查 bundle 大小是否超过 25MB 限制');
console.log('      - 查看是否有路径解析错误');
console.log('');

console.log('   ⚠️  如果有警告:');
console.log('      - 注意 deprecated 警告');
console.log('      - 检查 Node.js 版本兼容性');
console.log('      - 查看依赖项安全警告');
console.log('');

console.log('🎯 部署成功后:');
console.log('   • 访问提供的 URL 测试功能');
console.log('   • 验证所有页面和 API 路由');
console.log('   • 检查数据库连接');
console.log('   • 测试用户认证流程');
console.log('');

console.log('🔄 如果部署失败需要重新部署:');
console.log('   • 修复代码中的问题');
console.log('   • 提交新的 commit');
console.log('   • 推送到 GitHub: git push origin main');
console.log('   • Cloudflare 会自动重新部署');
console.log('');

// Check if we have a wrangler.toml to verify configuration
const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
if (fs.existsSync(wranglerPath)) {
  console.log('✅ wrangler.toml 配置文件存在');
  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  
  // Parse basic config
  const nameMatch = wranglerContent.match(/name\s*=\s*"([^"]+)"/);
  const pagesBuildOutputDirMatch = wranglerContent.match(/pages_build_output_dir\s*=\s*"([^"]+)"/);
  
  if (nameMatch) {
    console.log(`   项目名称: ${nameMatch[1]}`);
  }
  if (pagesBuildOutputDirMatch) {
    console.log(`   构建输出目录: ${pagesBuildOutputDirMatch[1]}`);
  }
} else {
  console.log('❌ wrangler.toml 配置文件不存在');
}
console.log('');

console.log('📖 相关文档:');
console.log('   • Cloudflare Pages: https://developers.cloudflare.com/pages');
console.log('   • OpenNext.js: https://opennext.js.org/cloudflare');
console.log('   • Next.js: https://nextjs.org/docs');
console.log('');

console.log('🚀 部署状态: 等待 Cloudflare 构建...');
console.log('   请耐心等待 2-5 分钟，然后检查 Dashboard');