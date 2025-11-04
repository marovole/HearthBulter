const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next/_worker.js');

if (!fs.existsSync(workerPath)) {
  console.error('❌ _worker.js 文件不存在');
  process.exit(1);
}

const workerContent = fs.readFileSync(workerPath, 'utf8');

// 在文件顶部添加兼容性注释
const compatComment = `// @cloudflare/workers compatibility-flags: nodejs_compat
// @cloudflare/workers compatibility-date: 2024-01-01

`;

if (!workerContent.includes('compatibility-flags')) {
  fs.writeFileSync(workerPath, compatComment + workerContent);
  console.log('✅ 已添加兼容性标志到 _worker.js');
} else {
  console.log('✅ _worker.js 已包含兼容性标志');
}
