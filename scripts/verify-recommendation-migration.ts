#!/usr/bin/env ts-node

/**
 * 推荐系统迁移验证脚本
 * 用于验证推荐系统相关表结构和索引是否正确创建
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  success: boolean;
  tableExists: boolean;
  indexesExist: string[];
  missingIndexes: string[];
  foreignKeysExist: string[];
  missingForeignKeys: string[];
  error?: string;
}

async function verifyTable(tableName: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: false,
    tableExists: false,
    indexesExist: [],
    missingIndexes: [],
    foreignKeysExist: [],
    missingForeignKeys: [],
  };

  try {
    // 检查表是否存在
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists;
    ` as [{ exists: boolean }];

    result.tableExists = tableCheck[0].exists;

    if (!result.tableExists) {
      result.error = `Table ${tableName} does not exist`;
      return result;
    }

    // 检查索引
    const indexCheck = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = ${tableName};
    ` as [{ indexname: string }[]];

    result.indexesExist = indexCheck.map(idx => idx.indexname);

    // 检查外键约束
    const foreignKeyCheck = await prisma.$queryRaw`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
      AND tc.constraint_type = 'FOREIGN KEY';
    ` as [{ constraint_name: string }[]];

    result.foreignKeysExist = foreignKeyCheck.map(fk => fk.constraint_name);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

async function verifyRecommendationMigration(): Promise<void> {
  console.log('🔍 开始验证推荐系统迁移...\n');

  const expectedTables = [
    'recipes',
    'recipe_ingredients', 
    'recipe_instructions',
    'recipe_ratings',
    'recipe_favorites',
    'recipe_views',
    'ingredient_substitutions',
    'user_preferences'
  ];

  const expectedIndexes: Record<string, string[]> = {
    recipes: [
      'recipes_category_idx',
      'recipes_difficulty_idx', 
      'recipes_status_idx',
      'recipes_averageRating_idx',
      'recipes_viewCount_idx',
      'recipes_createdAt_idx'
    ],
    recipe_ingredients: [
      'recipe_ingredients_recipeId_idx',
      'recipe_ingredients_foodId_idx'
    ],
    recipe_instructions: [
      'recipe_instructions_recipeId_stepNumber_key',
      'recipe_instructions_recipeId_idx'
    ],
    recipe_ratings: [
      'recipe_ratings_recipeId_memberId_key',
      'recipe_ratings_recipeId_idx',
      'recipe_ratings_memberId_idx',
      'recipe_ratings_rating_idx',
      'recipe_ratings_ratedAt_idx'
    ],
    recipe_favorites: [
      'recipe_favorites_recipeId_memberId_key',
      'recipe_favorites_recipeId_idx',
      'recipe_favorites_memberId_idx',
      'recipe_favorites_favoritedAt_idx'
    ],
    recipe_views: [
      'recipe_views_recipeId_idx',
      'recipe_views_memberId_idx',
      'recipe_views_viewedAt_idx'
    ],
    ingredient_substitutions: [
      'ingredient_substitutions_originalIngredientId_idx',
      'ingredient_substitutions_substituteFoodId_idx',
      'ingredient_substitutions_substitutionType_idx'
    ],
    user_preferences: [
      'user_preferences_memberId_key',
      'user_preferences_memberId_idx',
      'user_preferences_dietType_idx',
      'user_preferences_costLevel_idx'
    ]
  };

  const expectedForeignKeys: Record<string, string[]> = {
    recipe_ingredients: [
      'recipe_ingredients_recipeId_fkey',
      'recipe_ingredients_foodId_fkey'
    ],
    recipe_instructions: [
      'recipe_instructions_recipeId_fkey'
    ],
    recipe_ratings: [
      'recipe_ratings_recipeId_fkey',
      'recipe_ratings_memberId_fkey'
    ],
    recipe_favorites: [
      'recipe_favorites_recipeId_fkey',
      'recipe_favorites_memberId_fkey'
    ],
    recipe_views: [
      'recipe_views_recipeId_fkey',
      'recipe_views_memberId_fkey'
    ],
    ingredient_substitutions: [
      'ingredient_substitutions_originalIngredientId_fkey',
      'ingredient_substitutions_substituteFoodId_fkey'
    ],
    user_preferences: [
      'user_preferences_memberId_fkey'
    ]
  };

  let allSuccess = true;

  for (const tableName of expectedTables) {
    console.log(`📋 检查表: ${tableName}`);
    
    const result = await verifyTable(tableName);
    
    if (!result.tableExists) {
      console.log(`  ❌ 表不存在: ${result.error}`);
      allSuccess = false;
      continue;
    }

    console.log(`  ✅ 表存在`);

    // 检查索引
    const expectedIndexesForTable = expectedIndexes[tableName] || [];
    const missingIndexes = expectedIndexesForTable.filter(
      idx => !result.indexesExist.includes(idx)
    );

    if (missingIndexes.length === 0) {
      console.log(`  ✅ 所有预期索引都存在`);
    } else {
      console.log(`  ❌ 缺少索引: ${missingIndexes.join(', ')}`);
      allSuccess = false;
    }

    // 检查外键
    const expectedForeignKeysForTable = expectedForeignKeys[tableName] || [];
    const missingForeignKeys = expectedForeignKeysForTable.filter(
      fk => !result.foreignKeysExist.includes(fk)
    );

    if (missingForeignKeys.length === 0) {
      console.log(`  ✅ 所有预期外键都存在`);
    } else {
      console.log(`  ❌ 缺少外键: ${missingForeignKeys.join(', ')}`);
      allSuccess = false;
    }

    console.log('');
  }

  // 检查枚举类型
  console.log('🔍 检查枚举类型...');
  const expectedEnums = [
    'Difficulty',
    'RecipeCategory', 
    'RecipeStatus',
    'CostLevel',
    'SubstitutionType',
    'SpiceLevel',
    'SweetnessLevel',
    'SaltinessLevel',
    'DietaryType'
  ];

  for (const enumName of expectedEnums) {
    try {
      const enumCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_type 
          WHERE typname = ${enumName}
        ) as exists;
      ` as [{ exists: boolean }];

      if (enumCheck[0].exists) {
        console.log(`  ✅ 枚举 ${enumName} 存在`);
      } else {
        console.log(`  ❌ 枚举 ${enumName} 不存在`);
        allSuccess = false;
      }
    } catch (error) {
      console.log(`  ❌ 检查枚举 ${enumName} 时出错: ${error}`);
      allSuccess = false;
    }
  }

  console.log('\n📊 验证结果:');
  if (allSuccess) {
    console.log('🎉 推荐系统迁移验证成功！所有表结构、索引和外键都正确创建。');
  } else {
    console.log('❌ 推荐系统迁移验证失败！存在缺失的表结构、索引或外键。');
    process.exit(1);
  }
}

// 主函数
async function main(): Promise<void> {
  try {
    await verifyRecommendationMigration();
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { verifyRecommendationMigration, verifyTable };
