/**
 * 刷新 Supabase PostgREST Schema Cache
 *
 * 当在 PostgreSQL 中直接创建表后，Supabase 的 PostgREST API 需要刷新 schema cache
 */
import { config } from 'dotenv';
import { Pool } from 'pg';
import { join } from 'path';

// 加载环境变量
config({ path: join(process.cwd(), '.env.local') });

async function refreshSchema() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ 缺少 DATABASE_URL 环境变量');
    process.exit(1);
  }

  console.log('🔗 连接到数据库...');
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔄 发送 schema reload 信号...');

    // 方法 1: 使用 NOTIFY 触发 PostgREST schema reload
    await pool.query("NOTIFY pgrst, 'reload schema'");
    console.log('  ✅ NOTIFY 信号已发送');

    // 方法 2: 验证表是否可访问
    console.log('\n🔍 验证表访问权限...');
    const { rows } = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('dual_write_config', 'dual_write_diffs')
      ORDER BY tablename
    `);

    console.log('📊 找到的表:');
    rows.forEach((row) => {
      console.log(`  - ${row.tablename}`);
    });

    if (rows.length === 2) {
      console.log('\n✅ 双写框架表已正确创建！');
      console.log('\n💡 提示:');
      console.log('  1. Supabase PostgREST 会在收到 NOTIFY 信号后刷新 schema');
      console.log('  2. 如果还有问题，请访问 Supabase Dashboard 手动刷新');
      console.log('  3. 或者等待约 3-5 分钟让 Supabase 自动刷新');
    } else {
      console.log('\n⚠️  部分表未找到，请检查迁移是否完全执行');
    }
  } catch (error: any) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n👋 数据库连接已关闭');
  }
}

refreshSchema().catch(console.error);
