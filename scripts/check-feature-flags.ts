import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function checkFlags() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📊 检查 Feature Flags 配置...\n');

  const { data, error } = await supabase
    .from('dual_write_config')
    .select('*')
    .eq('key', 'dual_write_feature_flags')
    .single();

  if (error) {
    console.error('❌ 错误:', error.message);
    return;
  }

  const config = data.value as { enableDualWrite: boolean; enableSupabasePrimary: boolean };

  console.log('当前配置:');
  console.log('- enableDualWrite:', config.enableDualWrite ? '✅ 开启' : '❌ 关闭');
  console.log('- enableSupabasePrimary:', config.enableSupabasePrimary ? '✅ Supabase 为主' : '⚪ Prisma 为主');
  console.log('- 最后更新:', data.updated_at);
}

checkFlags().catch(console.error);
