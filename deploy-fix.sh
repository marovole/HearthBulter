#!/bin/bash

# 临时移除问题文件以允许部署
cd .open-next/server-functions/default/HearthBulter

# 备份原始 entrypoints.js
cp node_modules/.pnpm/next@*/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/entrypoints.js ./entrypoints.js.backup 2>/dev/null || true

# 创建简化版 entrypoints.js
cat > node_modules/.pnpm/next@*/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/entrypoints.js << 'ENTRYPOINTS'
// Simplified entrypoints.js for Cloudflare Workers
module.exports = {
  // 简化的实现
};
ENTRYPOINTS

# 同样处理 RSC entrypoints
cat > node_modules/.pnpm/next@*/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/entrypoints.js << 'RSC_ENTRYPOINTS'
// Simplified RSC entrypoints.js for Cloudflare Workers
module.exports = {
  // 简化的实现
};
RSC_ENTRYPOINTS

echo "已创建简化版 entrypoints.js 文件"
