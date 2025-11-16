import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function applyMigration(filePath: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(`\n📄 应用迁移: ${path.basename(filePath)}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // 使用 Supabase RPC 执行 SQL（需要创建一个执行 SQL 的函数）
    // 或者直接使用 PostgreSQL 客户端
    // 这里我们尝试拆分并执行每个语句

    // 简化版本：只记录需要执行的文件
    console.log(`  ✅ 读取成功 (${sql.length} 字符)`);
    console.log(`  ⚠️  需要手动执行或使用 supabase db push`);

    return true;
  } catch (error: any) {
    console.error(`  ❌ 失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始应用 Supabase 迁移...\n');

  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');

  // 1. 应用双写框架迁移
  const dualWriteMigration = path.join(migrationsDir, '20251113000000_dual_write_framework.sql');
  await applyMigration(dualWriteMigration);

  // 2. 应用所有 RPC 函数
  const rpcDir = path.join(migrationsDir, 'rpc-functions');
  const rpcFiles = fs.readdirSync(rpcDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n📦 发现 ${rpcFiles.length} 个 RPC 函数文件\n`);

  for (const file of rpcFiles) {
    const filePath = path.join(rpcDir, file);
    await applyMigration(filePath);
  }

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  重要提示:');
  console.log('='.repeat(60));
  console.log('\nSupabase JS SDK 无法直接执行 DDL 语句。');
  console.log('请使用以下方法之一来应用迁移:\n');
  console.log('方法 1: 使用 Supabase Dashboard SQL Editor');
  console.log('  1. 访问: https://supabase.com/dashboard/project/ppmliptjvzurewsiwswb/sql');
  console.log('  2. 复制并执行各个迁移文件的内容\n');
  console.log('方法 2: 使用 psql 命令行工具');
  console.log('  psql "$DATABASE_URL" -f supabase/migrations/20251113000000_dual_write_framework.sql');
  console.log('  for file in supabase/migrations/rpc-functions/*.sql; do');
  console.log('    psql "$DATABASE_URL" -f "$file"');
  console.log('  done\n');
  console.log('方法 3: 使用 Supabase CLI (推荐)');
  console.log('  supabase link --project-ref ppmliptjvzurewsiwswb');
  console.log('  supabase db push --linked\n');
}

main().catch(console.error);
