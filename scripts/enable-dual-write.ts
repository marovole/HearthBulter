import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function enableDualWrite() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('🔧 开启双写模式（Prisma 为主）...\n');

  const { data, error } = await supabase
    .from('dual_write_config')
    .update({
      value: {
        enableDualWrite: true,
        enableSupabasePrimary: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'dual_write_feature_flags')
    .select()
    .single();

  if (error) {
    console.error('❌ 错误:', error.message);
    return;
  }

  const config = data.value as { enableDualWrite: boolean; enableSupabasePrimary: boolean };

  console.log('✅ 双写模式已开启\n');
  console.log('当前配置:');
  console.log('- enableDualWrite:', config.enableDualWrite ? '✅ 开启' : '❌ 关闭');
  console.log('- enableSupabasePrimary:', config.enableSupabasePrimary ? '✅ Supabase 为主' : '⚪ Prisma 为主');
  console.log('- 更新时间:', data.updated_at);
  console.log('\n⚠️  请注意:');
  console.log('  1. 双写模式会同时写入 Prisma 和 Supabase');
  console.log('  2. 以 Prisma 为主，Supabase 写入失败不影响请求成功');
  console.log('  3. 差异会被记录到 dual_write_diffs 表');
  console.log('  4. 建议监控 Grafana 仪表盘观察 diff 情况');
}

enableDualWrite().catch(console.error);
