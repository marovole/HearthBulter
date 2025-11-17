#!/bin/bash

# 移除所有页面文件的 'use client' 指令

echo "🔍 查找所有包含 'use client' 的页面文件..."

find src/app -name "page.tsx" -type f | while read -r file; do
  if grep -q "^'use client'" "$file" || grep -q '^"use client"' "$file"; then
    echo "  处理: $file"

    # 移除 'use client' 或 "use client" 及其后面的空行
    sed -i '' "/^'use client'/d; /^\"use client\"/d" "$file"

    echo "    ✅ 已移除 'use client'"
  fi
done

echo ""
echo "✅ 完成！"
