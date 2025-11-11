#!/usr/bin/env tsx
/**
 * 通过 Supabase Management API 部署 RPC 函数
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

async function executeSQL(sql: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function deployFunction(filePath: string, functionName: string) {
  console.log(`\n📦 部署 ${functionName}...`);

  try {
    const fullPath = join(process.cwd(), filePath);
    const sql = readFileSync(fullPath, 'utf-8');

    console.log(`   文件大小: ${sql.length} 字节`);
    console.log(`   正在执行 SQL...`);

    const result = await executeSQL(sql);

    if (result.success) {
      console.log(`✅ ${functionName} 部署成功`);
      return true;
    } else {
      console.error(`❌ 部署失败:`, result.error);
      return false;
    }

  } catch (error) {
    console.error(`❌ 读取或部署文件时发生错误:`, error);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 通过 API 部署 Recipe RPC 函数');
  console.log('='.repeat(60) + '\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    process.exit(1);
  }

  const functions = [
    {
      file: 'supabase/migrations/rpc-functions/005_update_recipe_favorite_count.sql',
      name: 'update_recipe_favorite_count'
    },
    {
      file: 'supabase/migrations/rpc-functions/006_update_recipe_average_rating.sql',
      name: 'update_recipe_average_rating'
    }
  ];

  let allSuccess = true;

  for (const fn of functions) {
    const success = await deployFunction(fn.file, fn.name);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allSuccess) {
    console.log('✅ 所有函数部署成功！');
    console.log('\n💡 运行测试：pnpm tsx scripts/test-recipe-rpc-functions.ts');
  } else {
    console.log('❌ 部分函数部署失败');
    console.log('\n💡 请尝试在 Supabase Dashboard SQL Editor 中手动执行');
  }

  console.log('='.repeat(60) + '\n');

  process.exit(allSuccess ? 0 : 1);
}

main();
