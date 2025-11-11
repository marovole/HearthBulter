#!/usr/bin/env tsx
/**
 * 部署 Recipe RPC 函数到 Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function deployRpcFunction(filePath: string, functionName: string) {
  console.log(`\n📦 部署 ${functionName}...`);
  console.log(`   文件: ${filePath}\n`);

  try {
    const sql = readFileSync(filePath, 'utf-8');

    // 使用 Supabase 客户端执行 SQL
    // 注意：需要使用 rpc('sql', ...) 或直接使用 PostgreSQL connection
    // Supabase JS 客户端不直接支持执行任意 SQL，所以我们需要使用 REST API

    const { data, error } = await supabase.rpc('sql', { query: sql });

    if (error) {
      console.error(`❌ 部署失败:`, error);
      return false;
    }

    console.log(`✅ ${functionName} 部署成功\n`);
    return true;

  } catch (error) {
    console.error(`❌ 读取或部署文件时发生错误:`, error);
    return false;
  }
}

async function verifyFunction(functionName: string) {
  console.log(`🔍 验证函数 ${functionName}...`);

  try {
    // 查询 pg_proc 来验证函数是否存在
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as arguments
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
            AND p.proname = '${functionName}'
        `
      });

    if (error) {
      console.log(`   ℹ️  无法查询函数（可能需要手动验证）`);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`✅ 函数存在\n`);
      return true;
    } else {
      console.log(`❌ 函数不存在\n`);
      return false;
    }

  } catch (error) {
    console.log(`   ℹ️  验证过程出错（可能需要手动验证）\n`);
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Recipe RPC 函数部署脚本');
  console.log('='.repeat(60));

  console.log('\n环境配置:');
  console.log(`  Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`  Service Key: ${process.env.SUPABASE_SERVICE_KEY ? '已配置' : '❌ 未配置'}\n`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    process.exit(1);
  }

  console.log('⚠️  注意：Supabase JS 客户端不支持直接执行 DDL SQL。');
  console.log('   建议使用以下任一方式部署：\n');
  console.log('   选项 1: 使用 Supabase Dashboard SQL Editor');
  console.log('   --------');
  console.log('   1. 打开 Supabase Dashboard: https://app.supabase.com');
  console.log('   2. 进入 SQL Editor');
  console.log('   3. 复制并执行以下文件内容：\n');

  const rpcFunctions = [
    {
      file: 'supabase/migrations/rpc-functions/005_update_recipe_favorite_count.sql',
      name: 'update_recipe_favorite_count'
    },
    {
      file: 'supabase/migrations/rpc-functions/006_update_recipe_average_rating.sql',
      name: 'update_recipe_average_rating'
    }
  ];

  rpcFunctions.forEach((fn, index) => {
    const filePath = join(process.cwd(), fn.file);
    console.log(`   ${index + 1}. ${fn.file}`);
    console.log(`      函数名: ${fn.name}`);
  });

  console.log('\n   选项 2: 使用 psql 命令行');
  console.log('   --------');
  console.log('   如果已安装 PostgreSQL 客户端，可以运行：\n');
  console.log('   ```bash');
  rpcFunctions.forEach(fn => {
    console.log(`   psql "$DATABASE_URL" < ${fn.file}`);
  });
  console.log('   ```\n');

  console.log('   选项 3: 使用 Supabase CLI');
  console.log('   --------');
  console.log('   如果已配置 Supabase CLI 链接到远程项目：\n');
  console.log('   ```bash');
  console.log('   supabase db remote commit  # 这会同步所有迁移');
  console.log('   ```\n');

  console.log('=' .repeat(60));
  console.log('\n📋 SQL 文件内容预览：\n');
  console.log('=' .repeat(60));

  rpcFunctions.forEach(fn => {
    const filePath = join(process.cwd(), fn.file);
    console.log(`\n--- ${fn.name} ---\n`);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 15);
      lines.forEach((line, i) => {
        console.log(`${String(i + 1).padStart(3, ' ')}: ${line}`);
      });
      const totalLines = content.split('\n').length;
      if (totalLines > 15) {
        console.log(`   ... (共 ${totalLines} 行)`);
      }
    } catch (error) {
      console.error(`❌ 无法读取文件: ${error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 提示：部署完成后，运行以下命令测试 RPC 函数：');
  console.log('   pnpm tsx scripts/test-recipe-rpc-functions.ts\n');
}

main();
