#!/usr/bin/env tsx

/**
 * 数据迁移脚本：从现有 PostgreSQL 迁移到 Supabase
 * 
 * 此脚本会：
 * 1. 连接到现有 PostgreSQL 数据库
 * 2. 导出所有表的数据
 * 3. 转换数据格式（camelCase → snake_case）
 * 4. 导入到 Supabase
 * 5. 验证数据完整性
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';

// 配置
const BATCH_SIZE = 1000; // 批量插入大小
const MAX_RETRIES = 3; // 最大重试次数

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置');
  console.error('请设置以下环境变量：');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// 初始化客户端
const prisma = new PrismaClient();
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// 辅助函数：将 camelCase 转换为 snake_case
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// 辅助函数：转换对象键
function keysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }
  
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// 迁移统计
interface MigrationStats {
  tableName: string;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  duration: number;
}

const stats: MigrationStats[] = [];

// 迁移单个表
async function migrateTable<T = any>(
  tableName: string,
  prismaModel: any,
  supabaseTable: string
): Promise<MigrationStats> {
  const startTime = Date.now();
  console.log(`\n📦 开始迁移表: ${tableName}`);

  try {
    // 1. 从 Prisma 获取数据
    console.log(`   📊 读取数据...`);
    const records = await prismaModel.findMany();
    const totalRecords = records.length;
    console.log(`   找到 ${totalRecords} 条记录`);

    if (totalRecords === 0) {
      return {
        tableName,
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0,
        duration: Date.now() - startTime,
      };
    }

    // 2. 转换数据格式
    console.log(`   🔄 转换数据格式...`);
    const transformedRecords = keysToSnakeCase(records);

    // 3. 批量插入到 Supabase
    console.log(`   ⬆️  上传数据到 Supabase...`);
    let migratedRecords = 0;
    let failedRecords = 0;

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(transformedRecords.length / BATCH_SIZE);

      console.log(`   批次 ${batchNumber}/${totalBatches} (${batch.length} 条记录)`);

      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES && !success) {
        try {
          const { error, count } = await supabase
            .from(supabaseTable)
            .insert(batch);

          if (error) {
            throw error;
          }

          migratedRecords += count || batch.length;
          success = true;
        } catch (error) {
          retries++;
          console.warn(`   ⚠️  批次 ${batchNumber} 失败，重试 ${retries}/${MAX_RETRIES}`);
          
          if (retries >= MAX_RETRIES) {
            console.error(`   ❌ 批次 ${batchNumber} 失败：`, error);
            failedRecords += batch.length;
          } else {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`   ✅ 完成! ${migratedRecords}/${totalRecords} 条记录成功迁移 (${(duration / 1000).toFixed(2)}s)`);

    return {
      tableName,
      totalRecords,
      migratedRecords,
      failedRecords,
      duration,
    };
  } catch (error) {
    console.error(`   ❌ 迁移表 ${tableName} 失败:`, error);
    return {
      tableName,
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      duration: Date.now() - startTime,
    };
  }
}

// 验证数据完整性
async function verifyMigration(stat: MigrationStats, supabaseTable: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from(supabaseTable)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`   ❌ 验证失败: ${error.message}`);
      return false;
    }

    const isValid = count === stat.migratedRecords;
    if (isValid) {
      console.log(`   ✅ 验证通过: ${count} 条记录`);
    } else {
      console.warn(`   ⚠️  记录数不匹配: 预期 ${stat.migratedRecords}, 实际 ${count}`);
    }

    return isValid;
  } catch (error) {
    console.error(`   ❌ 验证出错:`, error);
    return false;
  }
}

// 主迁移函数
async function main() {
  console.log('🚀 开始数据迁移到 Supabase\n');
  console.log('📋 迁移配置:');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   批量大小: ${BATCH_SIZE}`);
  console.log(`   最大重试: ${MAX_RETRIES}\n`);

  const overallStartTime = Date.now();

  try {
    // 按依赖顺序迁移表
    // 1. 基础表（无外键）
    stats.push(await migrateTable('User', prisma.user, 'users'));
    
    // 2. 家庭相关
    stats.push(await migrateTable('Family', prisma.family, 'families'));
    stats.push(await migrateTable('FamilyMember', prisma.familyMember, 'family_members'));
    
    // 3. 健康数据
    stats.push(await migrateTable('HealthGoal', prisma.healthGoal, 'health_goals'));
    stats.push(await migrateTable('HealthData', prisma.healthData, 'health_data'));
    stats.push(await migrateTable('HealthReminder', prisma.healthReminder, 'health_reminders'));
    
    // 4. 饮食相关
    stats.push(await migrateTable('MealPlan', prisma.mealPlan, 'meal_plans'));
    stats.push(await migrateTable('MealLog', prisma.mealLog, 'meal_logs'));
    
    // 5. AI 相关
    stats.push(await migrateTable('AIAdvice', prisma.aIAdvice, 'ai_advices'));
    stats.push(await migrateTable('AIConversation', prisma.aIConversation, 'ai_conversations'));
    
    // 6. 其他表...
    // 根据实际需要添加更多表的迁移

    // 打印迁移报告
    console.log('\n' + '='.repeat(80));
    console.log('📊 迁移报告');
    console.log('='.repeat(80));

    const totalTime = Date.now() - overallStartTime;
    const totalRecords = stats.reduce((sum, s) => sum + s.totalRecords, 0);
    const totalMigrated = stats.reduce((sum, s) => sum + s.migratedRecords, 0);
    const totalFailed = stats.reduce((sum, s) => sum + s.failedRecords, 0);

    console.log('\n表级统计:');
    console.table(stats.map(s => ({
      表名: s.tableName,
      总记录数: s.totalRecords,
      成功迁移: s.migratedRecords,
      失败记录: s.failedRecords,
      耗时秒: (s.duration / 1000).toFixed(2),
      成功率: s.totalRecords > 0 
        ? `${((s.migratedRecords / s.totalRecords) * 100).toFixed(1)}%` 
        : 'N/A',
    })));

    console.log('\n总体统计:');
    console.log(`   总记录数: ${totalRecords}`);
    console.log(`   成功迁移: ${totalMigrated}`);
    console.log(`   失败记录: ${totalFailed}`);
    console.log(`   成功率: ${((totalMigrated / totalRecords) * 100).toFixed(2)}%`);
    console.log(`   总耗时: ${(totalTime / 1000).toFixed(2)}s`);

    // 验证迁移
    console.log('\n🔍 验证数据完整性...\n');
    const verificationResults: boolean[] = [];
    
    for (const stat of stats) {
      if (stat.totalRecords > 0) {
        const tableName = toSnakeCase(stat.tableName);
        console.log(`验证 ${stat.tableName}...`);
        const isValid = await verifyMigration(stat, tableName);
        verificationResults.push(isValid);
      }
    }

    const allValid = verificationResults.every(v => v);
    
    console.log('\n' + '='.repeat(80));
    if (allValid) {
      console.log('✅ 数据迁移完成并验证通过！');
    } else {
      console.log('⚠️  数据迁移完成，但部分表验证失败，请检查日志');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    // 清理连接
    await prisma.$disconnect();
  }
}

// 执行迁移
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 迁移脚本执行完成\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 迁移失败:', error);
      process.exit(1);
    });
}

export { migrateTable, verifyMigration };
