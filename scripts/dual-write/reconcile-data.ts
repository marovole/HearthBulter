/**
 * 数据对账脚本
 *
 * 定期比对 Prisma 和 Supabase 的关键数据，
 * 确保数据一致性
 *
 * 使用示例:
 * ```bash
 * # 对账预算数据
 * pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=budget
 *
 * # 对账所有支持的实体
 * pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all
 *
 * # 生成报告
 * pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all --report
 * ```
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { compare as jsonPatchCompare } from 'fast-json-patch';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 错误: 缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('❌ 错误: 缺少环境变量 DATABASE_URL');
  process.exit(1);
}

interface ReconcileResult {
  entity: string;
  totalRecords: number;
  mismatches: number;
  details: Array<{
    id: string;
    field: string;
    prismaValue: any;
    supabaseValue: any;
  }>;
}

const IGNORE_FIELDS = ['createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'];

async function main() {
  const args = process.argv.slice(2);

  let entity = 'all';
  let generateReport = false;

  for (const arg of args) {
    if (arg.startsWith('--entity=')) {
      entity = arg.split('=')[1];
    } else if (arg === '--report') {
      generateReport = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  console.log('🔍 开始数据对账...\n');

  const results: ReconcileResult[] = [];

  if (entity === 'all' || entity === 'budget') {
    results.push(await reconcileBudgets());
  }

  if (entity === 'all' || entity === 'spending') {
    results.push(await reconcileSpendings());
  }

  if (entity === 'all' || entity === 'recipe_favorite') {
    results.push(await reconcileRecipeFavorites());
  }

  console.log('\n📊 对账结果汇总:');
  console.log('─'.repeat(70));

  let totalMismatches = 0;

  for (const result of results) {
    console.log(`\n${result.entity}:`);
    console.log(`  总记录数: ${result.totalRecords}`);
    console.log(`  不一致数量: ${result.mismatches}`);

    if (result.mismatches > 0) {
      console.log(`  ⚠️  发现数据不一致!`);
      totalMismatches += result.mismatches;

      // 显示前5个差异
      const preview = result.details.slice(0, 5);
      for (const detail of preview) {
        console.log(`    - ID: ${detail.id}, 字段: ${detail.field}`);
        console.log(`      Prisma: ${JSON.stringify(detail.prismaValue)}`);
        console.log(`      Supabase: ${JSON.stringify(detail.supabaseValue)}`);
      }

      if (result.details.length > 5) {
        console.log(`    ... 还有 ${result.details.length - 5} 个差异`);
      }
    } else {
      console.log(`  ✅ 数据一致`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`\n总计: ${totalMismatches} 个不一致项`);

  if (totalMismatches > 0) {
    console.log('\n⚠️  建议: 检查 dual_write_diffs 表获取详细信息');
    console.log('或运行补偿脚本修复数据不一致');
  }

  if (generateReport) {
    const reportPath = `./reconcile-report-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 报告已保存: ${reportPath}`);
  }
}

async function reconcileBudgets(): Promise<ReconcileResult> {
  const prisma = new PrismaClient();
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  console.log('🔄 对账 Budget 数据...');

  try {
    // 从 Prisma 读取
    const prismaBudgets = await prisma.budget.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
    });

    // 从 Supabase 读取
    const { data: supabaseBudgets, error } = await supabase
      .from('budgets')
      .select('*')
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // 比对
    const mismatches: ReconcileResult['details'] = [];

    for (const prismaBudget of prismaBudgets) {
      const supabaseBudget = supabaseBudgets?.find((sb) => sb.id === prismaBudget.id);

      if (!supabaseBudget) {
        mismatches.push({
          id: prismaBudget.id,
          field: '_exists',
          prismaValue: true,
          supabaseValue: false,
        });
        continue;
      }

      // 比对关键字段
      const fieldsToCheck = [
        'total_amount',
        'used_amount',
        'remaining_amount',
        'status',
        'member_id',
      ];

      for (const field of fieldsToCheck) {
        const prismaValue = (prismaBudget as any)[
          field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        ];
        const supabaseValue = (supabaseBudget as any)[field];

        if (prismaValue !== supabaseValue) {
          // 对于数值类型,允许小误差
          if (typeof prismaValue === 'number' && typeof supabaseValue === 'number') {
            if (Math.abs(prismaValue - supabaseValue) < 0.01) continue;
          }

          mismatches.push({
            id: prismaBudget.id,
            field,
            prismaValue,
            supabaseValue,
          });
        }
      }
    }

    return {
      entity: 'Budget',
      totalRecords: prismaBudgets.length,
      mismatches: mismatches.length,
      details: mismatches,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function reconcileSpendings(): Promise<ReconcileResult> {
  const prisma = new PrismaClient();
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  console.log('🔄 对账 Spending 数据...');

  try {
    // 从 Prisma 读取最近30天的支出记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prismaSpendings = await prisma.spending.findMany({
      where: {
        deletedAt: null,
        purchaseDate: { gte: thirtyDaysAgo },
      },
      orderBy: { id: 'asc' },
    });

    // 从 Supabase 读取
    const { data: supabaseSpendings, error } = await supabase
      .from('spendings')
      .select('*')
      .is('deleted_at', null)
      .gte('purchase_date', thirtyDaysAgo.toISOString())
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // 比对
    const mismatches: ReconcileResult['details'] = [];

    for (const prismaSpending of prismaSpendings) {
      const supabaseSpending = supabaseSpendings?.find((ss) => ss.id === prismaSpending.id);

      if (!supabaseSpending) {
        mismatches.push({
          id: prismaSpending.id,
          field: '_exists',
          prismaValue: true,
          supabaseValue: false,
        });
        continue;
      }

      // 比对金额(关键字段)
      if (Math.abs(prismaSpending.totalAmount - supabaseSpending.total_amount) >= 0.01) {
        mismatches.push({
          id: prismaSpending.id,
          field: 'total_amount',
          prismaValue: prismaSpending.totalAmount,
          supabaseValue: supabaseSpending.total_amount,
        });
      }
    }

    return {
      entity: 'Spending',
      totalRecords: prismaSpendings.length,
      mismatches: mismatches.length,
      details: mismatches,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function reconcileRecipeFavorites(): Promise<ReconcileResult> {
  const prisma = new PrismaClient();
  const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  console.log('🔄 对账 RecipeFavorite 计数...');

  try {
    // 从 Prisma 计算收藏数
    const prismaRecipes = await prisma.recipe.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        favoriteCount: true,
        _count: {
          select: { favorites: true },
        },
      },
    });

    // 从 Supabase 读取
    const { data: supabaseRecipes, error } = await supabase
      .from('recipes')
      .select('id, favorite_count')
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // 比对
    const mismatches: ReconcileResult['details'] = [];

    for (const prismaRecipe of prismaRecipes) {
      const supabaseRecipe = supabaseRecipes?.find((sr) => sr.id === prismaRecipe.id);

      if (!supabaseRecipe) {
        mismatches.push({
          id: prismaRecipe.id,
          field: '_exists',
          prismaValue: true,
          supabaseValue: false,
        });
        continue;
      }

      // 比对收藏计数
      const actualCount = prismaRecipe._count.favorites;
      const storedCount = prismaRecipe.favoriteCount;
      const supabaseCount = supabaseRecipe.favorite_count;

      if (actualCount !== supabaseCount) {
        mismatches.push({
          id: prismaRecipe.id,
          field: 'favorite_count',
          prismaValue: actualCount,
          supabaseValue: supabaseCount,
        });
      }
    }

    return {
      entity: 'RecipeFavorite',
      totalRecords: prismaRecipes.length,
      mismatches: mismatches.length,
      details: mismatches,
    };
  } finally {
    await prisma.$disconnect();
  }
}

function printHelp() {
  console.log(`
数据对账脚本

用法:
  pnpm ts-node scripts/dual-write/reconcile-data.ts [选项]

选项:
  --entity=<entity>  指定要对账的实体类型
                     可选值: budget, spending, recipe_favorite, all
                     默认值: all
  --report           生成 JSON 格式的报告文件
  --help, -h         显示此帮助信息

示例:
  # 对账所有实体
  pnpm ts-node scripts/dual-write/reconcile-data.ts

  # 仅对账预算数据
  pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=budget

  # 生成报告
  pnpm ts-node scripts/dual-write/reconcile-data.ts --entity=all --report

对账实体说明:
  - budget: 预算金额、使用量、剩余量
  - spending: 支出记录金额(最近30天)
  - recipe_favorite: 食谱收藏计数
  - all: 所有上述实体
`);
}

main().catch((err) => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
