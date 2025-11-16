import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function viewDiffDetails() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔍 查看详细的 Diff 记录...\n');

  const { data: diffs, error } = await supabase
    .from('dual_write_diffs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ 查询失败:', error.message);
    return;
  }

  if (!diffs || diffs.length === 0) {
    console.log('✅ 暂无 diff 记录');
    return;
  }

  console.log(`找到 ${diffs.length} 条 diff 记录:\n`);

  diffs.forEach((diff, index) => {
    const icon = diff.severity === 'error' ? '❌' : diff.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} Diff #${index + 1}`);
    console.log(`  端点: ${diff.api_endpoint}`);
    console.log(`  操作: ${diff.operation}`);
    console.log(`  严重性: ${diff.severity}`);
    console.log(`  时间: ${diff.created_at}`);

    if (diff.diff && diff.diff.length > 0) {
      console.log(`  差异数量: ${diff.diff.length} 个字段`);
      console.log(`  差异详情:`);
      diff.diff.forEach((d: any, i: number) => {
        console.log(`    ${i + 1}. ${d.op} ${d.path}`);
        if (d.value !== undefined) {
          const valueStr = JSON.stringify(d.value);
          console.log(`       值: ${valueStr.substring(0, 100)}${valueStr.length > 100 ? '...' : ''}`);
        }
      });
    } else {
      console.log(`  ✅ 无差异（完全一致）`);
    }

    console.log('');
  });

  // 统计
  const errorCount = diffs.filter(d => d.severity === 'error').length;
  const warningCount = diffs.filter(d => d.severity === 'warning').length;
  const infoCount = diffs.filter(d => d.severity === 'info').length;

  console.log('=' + '='.repeat(59));
  console.log('统计');
  console.log('=' + '='.repeat(59));
  console.log(`总计: ${diffs.length}`);
  console.log(`- ❌ 错误 (error): ${errorCount}`);
  console.log(`- ⚠️  警告 (warning): ${warningCount}`);
  console.log(`- ℹ️  信息 (info): ${infoCount}`);
}

viewDiffDetails().catch(console.error);
