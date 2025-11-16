import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;

async function executeSQLFile(client: Client, filePath: string): Promise<boolean> {
  const fileName = path.basename(filePath);
  console.log(`\n📄 执行: ${fileName}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    await client.query(sql);

    console.log(`  ✅ 成功`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ 失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始部署 Supabase 迁移...\n');
  console.log(`📡 连接到: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');

    // 1. 执行双写框架迁移
    console.log('=' + '='.repeat(59));
    console.log('第 1 步: 部署双写框架');
    console.log('=' + '='.repeat(59));

    const dualWriteMigration = path.join(
      migrationsDir,
      '20251113000000_dual_write_framework.sql'
    );
    const result1 = await executeSQLFile(client, dualWriteMigration);

    if (!result1) {
      console.log('\n⚠️  双写框架部署失败，跳过 RPC 函数部署');
      return;
    }

    // 2. 执行所有 RPC 函数
    console.log('\n' + '=' + '='.repeat(59));
    console.log('第 2 步: 部署 RPC 函数');
    console.log('=' + '='.repeat(59));

    const rpcDir = path.join(migrationsDir, 'rpc-functions');
    const rpcFiles = fs
      .readdirSync(rpcDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`\n📦 发现 ${rpcFiles.length} 个 RPC 函数\n`);

    let successCount = 0;
    let failCount = 0;

    for (const file of rpcFiles) {
      const filePath = path.join(rpcDir, file);
      const result = await executeSQLFile(client, filePath);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '=' + '='.repeat(59));
    console.log('部署完成');
    console.log('=' + '='.repeat(59));
    console.log(`\n✅ 成功: ${successCount + 1}`);
    console.log(`❌ 失败: ${failCount}`);

    if (failCount === 0) {
      console.log('\n🎉 所有迁移部署成功！\n');
      console.log('下一步:');
      console.log('  1. 运行验证脚本: pnpm tsx scripts/check-dual-write-diffs.ts');
      console.log('  2. 测试双写功能: pnpm tsx scripts/test-dual-write.ts');
      console.log('  3. 监控 Grafana 仪表盘');
    } else {
      console.log('\n⚠️  有些迁移失败，请检查错误信息');
    }
  } catch (error: any) {
    console.error('\n❌ 部署失败:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

main().catch(console.error);
