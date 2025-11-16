import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function checkDiffs() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📊 检查双写 Diff 记录...\n');

  // 1. 查询最近 20 条 diff 记录
  const { data: recentDiffs, error: diffsError } = await supabase
    .from('dual_write_diffs')
    .select('api_endpoint, operation, severity, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (diffsError) {
    console.error('❌ 查询 diff 记录失败:', diffsError.message);
  } else {
    console.log(`最近 20 条 Diff 记录 (共 ${recentDiffs.length} 条):`);
    if (recentDiffs.length === 0) {
      console.log('  ✅ 暂无 diff 记录\n');
    } else {
      recentDiffs.forEach((diff, index) => {
        const icon = diff.severity === 'error' ? '❌' : diff.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${index + 1}. ${icon} ${diff.api_endpoint} [${diff.operation}] - ${diff.severity}`);
        console.log(`     时间: ${diff.created_at}`);
      });
      console.log('');
    }
  }

  // 2. 调用 RPC 获取统计信息（最近 1 天）
  const { data: stats, error: statsError } = await supabase.rpc('get_dual_write_stats', {
    days_ago: 1,
  });

  if (statsError) {
    console.error('❌ 获取统计信息失败:', statsError.message);
  } else if (stats && stats.length > 0) {
    console.log('过去 24 小时统计:');
    console.log(`- 总 Diff 数: ${stats[0].total_diffs}`);
    console.log(`- 错误 (error): ${stats[0].severity_breakdown?.error || 0}`);
    console.log(`- 警告 (warning): ${stats[0].severity_breakdown?.warning || 0}`);
    console.log(`- 信息 (info): ${stats[0].severity_breakdown?.info || 0}`);
    console.log('');

    // 检查是否达标
    const totalDiffs = stats[0].total_diffs;
    const errorDiffs = stats[0].severity_breakdown?.error || 0;

    if (totalDiffs < 5) {
      console.log('✅ Diff 数量达标 (目标: <5/天)');
    } else {
      console.log(`⚠️  Diff 数量超标: ${totalDiffs}/天 (目标: <5/天)`);
    }

    if (errorDiffs === 0) {
      console.log('✅ 无错误级别 diff');
    } else {
      console.log(`❌ 发现 ${errorDiffs} 个错误级别 diff，需要处理`);
    }
  } else {
    console.log('✅ 过去 24 小时无 diff 记录');
  }
}

checkDiffs().catch(console.error);
