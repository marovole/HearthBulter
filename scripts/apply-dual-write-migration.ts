/**
 * 应用双写框架的 Supabase 迁移
 */
import { config } from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// 加载环境变量
config({ path: join(process.cwd(), '.env.local') });

async function applyMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ 缺少 DATABASE_URL 环境变量');
    process.exit(1);
  }

  console.log('🔗 连接到数据库...');
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('📝 读取迁移文件...');
    const migrationPath = join(
      process.cwd(),
      'supabase/migrations/20251113000000_dual_write_framework.sql'
    );
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 应用迁移（整个文件）...');

    try {
      await pool.query(sql);
      console.log('  ✅ SQL 执行成功');
    } catch (error: any) {
      // 忽略 "already exists" 错误
      if (error.message.includes('already exists')) {
        console.log('  ⚠️  部分对象已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n✅ 迁移应用成功！\n');

    // 验证表是否创建
    console.log('🔍 验证 dual_write_config 表...');
    const { rows } = await pool.query('SELECT * FROM dual_write_config WHERE key = $1', [
      'dual_write_feature_flags',
    ]);

    if (rows.length > 0) {
      console.log('✅ dual_write_config 表已创建并初始化');
      console.log('📊 默认配置:');
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('⚠️  表已创建但没有默认配置');
    }
  } catch (error: any) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n👋 数据库连接已关闭');
  }
}

applyMigration().catch(console.error);
