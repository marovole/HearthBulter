import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;

async function main() {
  console.log('🚀 开始部署主 Schema 迁移...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');

    // 应用主要的 schema 迁移
    const mainMigrations = [
      '20251109T153239_prisma_to_supabase.sql',
      '20251110_add_budget_category_columns.sql',
      '002_rls_policies.sql',
      '003_performance_indexes.sql',
    ];

    for (const migration of mainMigrations) {
      const filePath = path.join(migrationsDir, migration);

      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  跳过不存在的文件: ${migration}`);
        continue;
      }

      console.log(`\n📄 执行: ${migration}`);
      try {
        const sql = fs.readFileSync(filePath, 'utf-8');
        await client.query(sql);
        console.log(`  ✅ 成功`);
      } catch (error: any) {
        // 忽略"already exists"错误
        if (error.message.includes('already exists')) {
          console.log(`  ⏭️  已存在，跳过`);
        } else {
          console.error(`  ❌ 失败:`, error.message);
        }
      }
    }

    console.log('\n✅ 主 Schema 迁移完成！');
  } catch (error: any) {
    console.error('\n❌ 部署失败:', error.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
