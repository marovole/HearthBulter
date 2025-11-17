/**
 * Feature Flag 切换工具
 *
 * 用于快速切换双写验证框架的 Feature Flags
 *
 * 使用示例:
 * ```bash
 * # 开启双写模式(Prisma为主)
 * pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --dual-write=on
 *
 * # 切换到Supabase为主
 * pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --primary=supabase
 *
 * # 关闭双写,仅使用Supabase
 * pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --dual-write=off --primary=supabase
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 错误: 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

interface FlagUpdate {
  enableDualWrite?: boolean;
  enableSupabasePrimary?: boolean;
}

async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const updates: FlagUpdate = {};

  for (const arg of args) {
    if (arg.startsWith('--dual-write=')) {
      const value = arg.split('=')[1];
      updates.enableDualWrite = value === 'on' || value === 'true';
    } else if (arg.startsWith('--primary=')) {
      const value = arg.split('=')[1];
      updates.enableSupabasePrimary = value === 'supabase';
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('ℹ️  未指定任何更新,显示当前配置:');
    await showCurrentFlags();
    console.log('\n运行 --help 查看使用说明');
    process.exit(0);
  }

  // 更新 Feature Flags
  await updateFeatureFlags(updates);
}

async function showCurrentFlags() {
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from('dual_write_config')
    .select('*')
    .eq('key', 'dual_write_feature_flags')
    .maybeSingle();

  if (error) {
    console.error('❌ 读取配置失败:', error.message);
    return;
  }

  if (!data) {
    console.log('⚠️  配置不存在,使用默认值:');
    console.log('  - enableDualWrite: false');
    console.log('  - enableSupabasePrimary: false');
    return;
  }

  console.log('✅ 当前配置:');
  console.log(`  - enableDualWrite: ${data.value.enableDualWrite}`);
  console.log(`  - enableSupabasePrimary: ${data.value.enableSupabasePrimary}`);
  console.log(`  - 最后更新: ${data.updated_at}`);

  // 解释当前模式
  const mode = getModeDescription(data.value.enableDualWrite, data.value.enableSupabasePrimary);
  console.log(`\n📋 当前模式: ${mode}`);
}

async function updateFeatureFlags(updates: FlagUpdate) {
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // 先读取当前配置
  const { data: current, error: readError } = await supabase
    .from('dual_write_config')
    .select('*')
    .eq('key', 'dual_write_feature_flags')
    .maybeSingle();

  if (readError) {
    console.error('❌ 读取当前配置失败:', readError.message);
    process.exit(1);
  }

  // 合并更新
  const newValue = {
    enableDualWrite: updates.enableDualWrite ?? current?.value.enableDualWrite ?? false,
    enableSupabasePrimary:
      updates.enableSupabasePrimary ?? current?.value.enableSupabasePrimary ?? false,
  };

  console.log('📝 准备更新配置:');
  console.log(`  enableDualWrite: ${current?.value.enableDualWrite ?? 'N/A'} → ${newValue.enableDualWrite}`);
  console.log(
    `  enableSupabasePrimary: ${current?.value.enableSupabasePrimary ?? 'N/A'} → ${newValue.enableSupabasePrimary}`
  );

  const newMode = getModeDescription(newValue.enableDualWrite, newValue.enableSupabasePrimary);
  console.log(`\n📋 新模式: ${newMode}`);

  // 确认更新
  console.log('\n⚠️  警告: 此操作将立即生效,影响所有正在运行的实例!');
  console.log('确认更新? (按 Ctrl+C 取消,或等待 3 秒自动继续)');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 执行更新
  const { error: updateError } = await supabase.from('dual_write_config').upsert(
    {
      key: 'dual_write_feature_flags',
      value: newValue,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'key',
    }
  );

  if (updateError) {
    console.error('❌ 更新失败:', updateError.message);
    process.exit(1);
  }

  console.log('\n✅ 更新成功!');
  console.log('\n💡 提示: 缓存刷新需要最多 5 秒,请等待生效。');
}

function getModeDescription(enableDualWrite: boolean, enableSupabasePrimary: boolean): string {
  if (!enableDualWrite && !enableSupabasePrimary) {
    return '单写模式 - 仅使用 Prisma';
  } else if (!enableDualWrite && enableSupabasePrimary) {
    return '单写模式 - 仅使用 Supabase';
  } else if (enableDualWrite && !enableSupabasePrimary) {
    return '双写模式 - Prisma 为主, Supabase 为影子';
  } else {
    return '双写模式 - Supabase 为主, Prisma 为影子';
  }
}

function printHelp() {
  console.log(`
Feature Flag 切换工具

用法:
  pnpm ts-node scripts/dual-write/toggle-feature-flags.ts [选项]

选项:
  --dual-write=<on|off>       开启/关闭双写模式
  --primary=<prisma|supabase> 选择主库
  --help, -h                  显示此帮助信息

示例:
  # 查看当前配置
  pnpm ts-node scripts/dual-write/toggle-feature-flags.ts

  # 开启双写模式(Prisma为主)
  pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --dual-write=on --primary=prisma

  # 切换到Supabase为主(保持双写)
  pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --primary=supabase

  # 关闭双写,仅使用Supabase
  pnpm ts-node scripts/dual-write/toggle-feature-flags.ts --dual-write=off --primary=supabase

模式说明:
  - 单写模式 - 仅使用 Prisma: 不开启双写,仅使用 Prisma(默认)
  - 单写模式 - 仅使用 Supabase: 不开启双写,仅使用 Supabase(迁移完成)
  - 双写模式 - Prisma 为主: 双写验证期,Prisma 结果返回给用户
  - 双写模式 - Supabase 为主: 双写验证期,Supabase 结果返回给用户
`);
}

main().catch((err) => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
