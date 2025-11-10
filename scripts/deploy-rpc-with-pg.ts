#!/usr/bin/env tsx
/**
 * 使用 pg 库直接部署 RPC 函数到 PostgreSQL
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

async function deployFunction(client: Client, filePath: string, functionName: string) {
  console.log(`\n📦 部署 ${functionName}...`);

  try {
    const fullPath = join(process.cwd(), filePath);
    const sql = readFileSync(fullPath, 'utf-8');

    console.log(`   文件大小: ${sql.length} 字节`);
    console.log(`   正在执行 SQL...`);

    const startTime = Date.now();
    await client.query(sql);
    const duration = Date.now() - startTime;

    console.log(`✅ ${functionName} 部署成功 (${duration}ms)`);
    return true;

  } catch (error) {
    console.error(`❌ 部署失败:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function verifyFunction(client: Client, functionName: string) {
  console.log(`   🔍 验证函数 ${functionName}...`);

  try {
    const result = await client.query(`
      SELECT
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as definition_preview
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = $1
    `, [functionName]);

    if (result.rows.length > 0) {
      console.log(`   ✅ 函数已存在: ${result.rows[0].function_name}(${result.rows[0].arguments})`);
      return true;
    } else {
      console.log(`   ❌ 函数不存在`);
      return false;
    }

  } catch (error) {
    console.log(`   ⚠️  验证失败:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 部署 Recipe RPC 函数到 PostgreSQL');
  console.log('='.repeat(60) + '\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ 缺少 DATABASE_URL 环境变量');
    console.log('\n💡 请确保 .env 文件中配置了 DATABASE_URL');
    process.exit(1);
  }

  console.log('环境配置:');
  console.log(`  数据库: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

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

  try {
    console.log('🔌 连接数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    let allSuccess = true;

    for (const fn of functions) {
      const success = await deployFunction(client, fn.file, fn.name);
      if (success) {
        await verifyFunction(client, fn.name);
      }
      if (!success) {
        allSuccess = false;
      }
      console.log();
    }

    console.log('='.repeat(60));

    if (allSuccess) {
      console.log('✅ 所有函数部署成功！\n');
      console.log('💡 运行测试：');
      console.log('   pnpm tsx scripts/test-recipe-rpc-functions.ts');
    } else {
      console.log('❌ 部分函数部署失败\n');
      console.log('💡 请检查错误信息并重试');
    }

    console.log('='.repeat(60) + '\n');

    process.exit(allSuccess ? 0 : 1);

  } catch (error) {
    console.error('\n❌ 发生错误:', error instanceof Error ? error.message : error);
    process.exit(1);

  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭\n');
  }
}

main();
