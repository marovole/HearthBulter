#!/usr/bin/env tsx
/**
 * 测试 Recipe RPC 函数的正确性和性能
 * - update_recipe_favorite_count
 * - update_recipe_average_rating
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 辅助函数：生成测试 UUID
function generateTestId(prefix?: string): string {
  return randomUUID();
}

async function testUpdateRecipeFavoriteCount() {
  console.log('🧪 测试 1: update_recipe_favorite_count\n');
  console.log('=' .repeat(60) + '\n');

  const testRecipeId = generateTestId('recipe');
  const testFamilyId = generateTestId('family');
  const testUserId1 = generateTestId('user');
  const testUserId2 = generateTestId('user');

  try {
    // 0. 创建测试 users（必须先创建，因为 families 依赖 users）
    console.log('📝 步骤 0: 创建测试用户...');
    const { error: usersError } = await supabase.from('users').insert([
      {
        id: testUserId1,
        email: `test-user-1-${Date.now()}@test.com`,
        name: 'Test User 1',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testUserId2,
        email: `test-user-2-${Date.now()}@test.com`,
        name: 'Test User 2',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (usersError) {
      console.error('❌ 创建 users 失败:', usersError);
      return false;
    }
    console.log('✅ 用户创建成功\n');

    // 1. 创建测试 family
    console.log('📝 步骤 1: 创建测试家庭...');
    const { error: familyError } = await supabase.from('families').insert({
      id: testFamilyId,
      name: 'Test Family',
      creatorId: testUserId1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (familyError) {
      console.error('❌ 创建 family 失败:', familyError);
      return false;
    }
    console.log('✅ 家庭创建成功\n');

    // 2. 创建测试 family members
    console.log('📝 步骤 2: 创建家庭成员...');
    const { error: membersError } = await supabase.from('family_members').insert([
      {
        id: testUserId1,
        familyId: testFamilyId,
        userId: testUserId1,
        name: 'Test User 1',
        gender: 'MALE',
        birthDate: new Date('1990-01-01').toISOString(),
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testUserId2,
        familyId: testFamilyId,
        userId: testUserId2,
        name: 'Test User 2',
        gender: 'MALE',
        birthDate: new Date('1992-01-01').toISOString(),
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (membersError) {
      console.error('❌ 创建 members 失败:', membersError);
      return false;
    }
    console.log('✅ 家庭成员创建成功\n');

    // 3. 创建测试食谱
    console.log('📝 步骤 3: 创建测试食谱...');
    const { error: recipeError } = await supabase
      .from('recipes')
      .insert({
        id: testRecipeId,
        name: 'RPC Test Recipe',
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        servings: 4,
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 10,
        category: 'MAIN_DISH',
        favoriteCount: 0,
        updatedAt: new Date().toISOString(),
      });

    if (recipeError) {
      console.error('❌ 创建食谱失败:', recipeError);
      return false;
    }
    console.log('✅ 食谱创建成功\n');

    // 4. 测试初始状态（无收藏）
    console.log('📝 步骤 4: 测试初始状态（无收藏）...');
    let startTime = Date.now();
    const { data: initialData, error: initialError } = await supabase.rpc(
      'update_recipe_favorite_count',
      { p_recipe_id: testRecipeId }
    );
    let duration = Date.now() - startTime;

    if (initialError) {
      console.error('❌ 调用 RPC 失败:', initialError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', initialData);

    if (initialData.success && initialData.favoriteCount === 0) {
      console.log('✅ 初始收藏数正确 (0)\n');
    } else {
      console.error('❌ 初始收藏数不正确\n');
      return false;
    }

    // 5. 添加第一个收藏
    console.log('📝 步骤 5: 添加第一个收藏...');
    const { error: fav1Error } = await supabase
      .from('recipe_favorites')
      .insert({
        id: generateTestId(),
        recipeId: testRecipeId,
        memberId: testUserId1,
        notes: 'Test favorite 1',
        favoritedAt: new Date().toISOString(),
      });

    if (fav1Error) {
      console.error('❌ 添加收藏失败:', fav1Error);
      return false;
    }
    console.log('✅ 收藏添加成功\n');

    // 6. 测试单个收藏
    console.log('📝 步骤 6: 测试单个收藏...');
    startTime = Date.now();
    const { data: oneFavData, error: oneFavError } = await supabase.rpc(
      'update_recipe_favorite_count',
      { p_recipe_id: testRecipeId }
    );
    duration = Date.now() - startTime;

    if (oneFavError) {
      console.error('❌ 调用 RPC 失败:', oneFavError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', oneFavData);

    if (oneFavData.success && oneFavData.favoriteCount === 1) {
      console.log('✅ 收藏数正确 (1)\n');
    } else {
      console.error('❌ 收藏数不正确\n');
      return false;
    }

    // 7. 添加第二个收藏
    console.log('📝 步骤 7: 添加第二个收藏...');
    const { error: fav2Error } = await supabase
      .from('recipe_favorites')
      .insert({
        id: generateTestId(),
        recipeId: testRecipeId,
        memberId: testUserId2,
        notes: 'Test favorite 2',
        favoritedAt: new Date().toISOString(),
      });

    if (fav2Error) {
      console.error('❌ 添加收藏失败:', fav2Error);
      return false;
    }
    console.log('✅ 收藏添加成功\n');

    // 8. 测试多个收藏
    console.log('📝 步骤 8: 测试多个收藏...');
    startTime = Date.now();
    const { data: twoFavData, error: twoFavError } = await supabase.rpc(
      'update_recipe_favorite_count',
      { p_recipe_id: testRecipeId }
    );
    duration = Date.now() - startTime;

    if (twoFavError) {
      console.error('❌ 调用 RPC 失败:', twoFavError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', twoFavData);

    if (twoFavData.success && twoFavData.favoriteCount === 2) {
      console.log('✅ 收藏数正确 (2)\n');
    } else {
      console.error('❌ 收藏数不正确\n');
      return false;
    }

    // 9. 验证数据库中的值
    console.log('📝 步骤 9: 验证数据库中的值...');
    const { data: recipeData, error: recipeCheckError } = await supabase
      .from('recipes')
      .select('favoriteCount')
      .eq('id', testRecipeId)
      .single();

    if (recipeCheckError) {
      console.error('❌ 查询食谱失败:', recipeCheckError);
      return false;
    }

    if (recipeData.favoriteCount === 2) {
      console.log('✅ 数据库中的收藏数正确 (2)\n');
    } else {
      console.error(`❌ 数据库中的收藏数不正确: ${recipeData.favoriteCount}\n`);
      return false;
    }

    // 10. 清理测试数据
    console.log('🧹 清理测试数据...');
    await supabase.from('recipe_favorites').delete().eq('recipeId', testRecipeId);
    await supabase.from('recipes').delete().eq('id', testRecipeId);
    await supabase.from('family_members').delete().in('id', [testUserId1, testUserId2]);
    await supabase.from('families').delete().eq('id', testFamilyId);
    await supabase.from('users').delete().in('id', [testUserId1, testUserId2]);
    console.log('✅ 清理完成\n');

    return true;

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    // 尝试清理
    await supabase.from('recipe_favorites').delete().eq('recipeId', testRecipeId);
    await supabase.from('recipes').delete().eq('id', testRecipeId);
    await supabase.from('family_members').delete().in('id', [testUserId1, testUserId2]);
    await supabase.from('families').delete().eq('id', testFamilyId);
    await supabase.from('users').delete().in('id', [testUserId1, testUserId2]);
    return false;
  }
}

async function testUpdateRecipeAverageRating() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试 2: update_recipe_average_rating\n');
  console.log('=' .repeat(60) + '\n');

  const testRecipeId = generateTestId('recipe');
  const testFamilyId = generateTestId('family');
  const testMemberId1 = generateTestId('member');
  const testMemberId2 = generateTestId('member');
  const testMemberId3 = generateTestId('member');

  try {
    // 0. 创建测试 users
    console.log('📝 步骤 0: 创建测试用户...');
    const { error: usersError } = await supabase.from('users').insert([
      {
        id: testMemberId1,
        email: `test-member-1-${Date.now()}@test.com`,
        name: 'Test Member 1',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testMemberId2,
        email: `test-member-2-${Date.now()}@test.com`,
        name: 'Test Member 2',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testMemberId3,
        email: `test-member-3-${Date.now()}@test.com`,
        name: 'Test Member 3',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (usersError) {
      console.error('❌ 创建 users 失败:', usersError);
      return false;
    }
    console.log('✅ 用户创建成功\n');

    // 1. 创建测试 family
    console.log('📝 步骤 1: 创建测试家庭...');
    const { error: familyError } = await supabase.from('families').insert({
      id: testFamilyId,
      name: 'Test Family',
      creatorId: testMemberId1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (familyError) {
      console.error('❌ 创建 family 失败:', familyError);
      return false;
    }
    console.log('✅ 家庭创建成功\n');

    // 2. 创建测试 family members
    console.log('📝 步骤 2: 创建家庭成员...');
    const { error: membersError } = await supabase.from('family_members').insert([
      {
        id: testMemberId1,
        familyId: testFamilyId,
        userId: testMemberId1,
        name: 'Test Member 1',
        gender: 'MALE',
        birthDate: new Date('1990-01-01').toISOString(),
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testMemberId2,
        familyId: testFamilyId,
        userId: testMemberId2,
        name: 'Test Member 2',
        gender: 'MALE',
        birthDate: new Date('1992-01-01').toISOString(),
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: testMemberId3,
        familyId: testFamilyId,
        userId: testMemberId3,
        name: 'Test Member 3',
        gender: 'MALE',
        birthDate: new Date('1994-01-01').toISOString(),
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (membersError) {
      console.error('❌ 创建 members 失败:', membersError);
      return false;
    }
    console.log('✅ 家庭成员创建成功\n');

    // 3. 创建测试食谱
    console.log('📝 步骤 3: 创建测试食谱...');
    const { error: recipeError } = await supabase
      .from('recipes')
      .insert({
        id: testRecipeId,
        name: 'RPC Test Recipe for Rating',
        prepTime: 15,
        cookTime: 25,
        totalTime: 40,
        servings: 2,
        calories: 450,
        protein: 20,
        carbs: 50,
        fat: 15,
        category: 'DESSERT',
        averageRating: 0,
        ratingCount: 0,
        updatedAt: new Date().toISOString(),
      });

    if (recipeError) {
      console.error('❌ 创建食谱失败:', recipeError);
      return false;
    }
    console.log('✅ 食谱创建成功\n');

    // 2. 测试初始状态（无评分）
    console.log('📝 步骤 2: 测试初始状态（无评分）...');
    let startTime = Date.now();
    const { data: initialData, error: initialError } = await supabase.rpc(
      'update_recipe_average_rating',
      { p_recipe_id: testRecipeId }
    );
    let duration = Date.now() - startTime;

    if (initialError) {
      console.error('❌ 调用 RPC 失败:', initialError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', initialData);

    if (initialData.success && initialData.averageRating === 0 && initialData.ratingCount === 0) {
      console.log('✅ 初始评分正确 (平均: 0, 数量: 0)\n');
    } else {
      console.error('❌ 初始评分不正确\n');
      return false;
    }

    // 3. 添加第一个评分 (5星)
    console.log('📝 步骤 3: 添加第一个评分 (5星)...');
    const { error: rating1Error } = await supabase
      .from('recipe_ratings')
      .insert({
        id: generateTestId(),
        recipeId: testRecipeId,
        memberId: testMemberId1,
        rating: 5,
        comment: 'Excellent recipe!',
        ratedAt: new Date().toISOString(),
      });

    if (rating1Error) {
      console.error('❌ 添加评分失败:', rating1Error);
      return false;
    }
    console.log('✅ 评分添加成功\n');

    // 4. 测试单个评分
    console.log('📝 步骤 4: 测试单个评分...');
    startTime = Date.now();
    const { data: oneRatingData, error: oneRatingError } = await supabase.rpc(
      'update_recipe_average_rating',
      { p_recipe_id: testRecipeId }
    );
    duration = Date.now() - startTime;

    if (oneRatingError) {
      console.error('❌ 调用 RPC 失败:', oneRatingError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', oneRatingData);

    if (oneRatingData.success && oneRatingData.averageRating === 5 && oneRatingData.ratingCount === 1) {
      console.log('✅ 评分正确 (平均: 5.0, 数量: 1)\n');
    } else {
      console.error('❌ 评分不正确\n');
      return false;
    }

    // 5. 添加第二个评分 (3星)
    console.log('📝 步骤 5: 添加第二个评分 (3星)...');
    const { error: rating2Error } = await supabase
      .from('recipe_ratings')
      .insert({
        id: generateTestId(),
        recipeId: testRecipeId,
        memberId: testMemberId2,
        rating: 3,
        comment: 'Good but could be better',
        ratedAt: new Date().toISOString(),
      });

    if (rating2Error) {
      console.error('❌ 添加评分失败:', rating2Error);
      return false;
    }
    console.log('✅ 评分添加成功\n');

    // 6. 测试两个评分（应该是 4.0）
    console.log('📝 步骤 6: 测试两个评分...');
    startTime = Date.now();
    const { data: twoRatingData, error: twoRatingError } = await supabase.rpc(
      'update_recipe_average_rating',
      { p_recipe_id: testRecipeId }
    );
    duration = Date.now() - startTime;

    if (twoRatingError) {
      console.error('❌ 调用 RPC 失败:', twoRatingError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', twoRatingData);

    // (5 + 3) / 2 = 4.0
    const expectedAvg = 4.0;
    if (twoRatingData.success &&
        Math.abs(twoRatingData.averageRating - expectedAvg) < 0.01 &&
        twoRatingData.ratingCount === 2) {
      console.log(`✅ 评分正确 (平均: ${twoRatingData.averageRating}, 数量: 2)\n`);
    } else {
      console.error('❌ 评分不正确\n');
      return false;
    }

    // 7. 添加第三个评分 (4星)
    console.log('📝 步骤 7: 添加第三个评分 (4星)...');
    const { error: rating3Error } = await supabase
      .from('recipe_ratings')
      .insert({
        id: generateTestId(),
        recipeId: testRecipeId,
        memberId: testMemberId3,
        rating: 4,
        comment: 'Pretty good',
        ratedAt: new Date().toISOString(),
      });

    if (rating3Error) {
      console.error('❌ 添加评分失败:', rating3Error);
      return false;
    }
    console.log('✅ 评分添加成功\n');

    // 8. 测试三个评分（应该是 4.0）
    console.log('📝 步骤 8: 测试三个评分...');
    startTime = Date.now();
    const { data: threeRatingData, error: threeRatingError } = await supabase.rpc(
      'update_recipe_average_rating',
      { p_recipe_id: testRecipeId }
    );
    duration = Date.now() - startTime;

    if (threeRatingError) {
      console.error('❌ 调用 RPC 失败:', threeRatingError);
      return false;
    }

    console.log(`✅ RPC 调用成功 (${duration}ms)`);
    console.log('   返回结果:', threeRatingData);

    // (5 + 3 + 4) / 3 = 4.0
    const expectedAvg3 = 4.0;
    if (threeRatingData.success &&
        Math.abs(threeRatingData.averageRating - expectedAvg3) < 0.01 &&
        threeRatingData.ratingCount === 3) {
      console.log(`✅ 评分正确 (平均: ${threeRatingData.averageRating}, 数量: 3)\n`);
    } else {
      console.error('❌ 评分不正确\n');
      return false;
    }

    // 9. 验证数据库中的值
    console.log('📝 步骤 9: 验证数据库中的值...');
    const { data: recipeData, error: recipeCheckError } = await supabase
      .from('recipes')
      .select('averageRating, ratingCount')
      .eq('id', testRecipeId)
      .single();

    if (recipeCheckError) {
      console.error('❌ 查询食谱失败:', recipeCheckError);
      return false;
    }

    if (Math.abs(recipeData.averageRating - expectedAvg3) < 0.01 &&
        recipeData.ratingCount === 3) {
      console.log(`✅ 数据库中的评分正确 (平均: ${recipeData.averageRating}, 数量: ${recipeData.ratingCount})\n`);
    } else {
      console.error(`❌ 数据库中的评分不正确: 平均=${recipeData.averageRating}, 数量=${recipeData.ratingCount}\n`);
      return false;
    }

    // 10. 清理测试数据
    console.log('🧹 清理测试数据...');
    await supabase.from('recipe_ratings').delete().eq('recipeId', testRecipeId);
    await supabase.from('recipes').delete().eq('id', testRecipeId);
    await supabase.from('family_members').delete().in('id', [testMemberId1, testMemberId2, testMemberId3]);
    await supabase.from('families').delete().eq('id', testFamilyId);
    await supabase.from('users').delete().in('id', [testMemberId1, testMemberId2, testMemberId3]);
    console.log('✅ 清理完成\n');

    return true;

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    // 尝试清理
    await supabase.from('recipe_ratings').delete().eq('recipeId', testRecipeId);
    await supabase.from('recipes').delete().eq('id', testRecipeId);
    await supabase.from('family_members').delete().in('id', [testMemberId1, testMemberId2, testMemberId3]);
    await supabase.from('families').delete().eq('id', testFamilyId);
    await supabase.from('users').delete().in('id', [testMemberId1, testMemberId2, testMemberId3]);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Recipe RPC 函数测试套件');
  console.log('='.repeat(60) + '\n');

  console.log('环境配置:');
  console.log(`  Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`  Service Key: ${process.env.SUPABASE_SERVICE_KEY ? '已配置' : '❌ 未配置'}\n`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    process.exit(1);
  }

  const results: { name: string; passed: boolean }[] = [];

  // 运行测试
  const test1Passed = await testUpdateRecipeFavoriteCount();
  results.push({ name: 'update_recipe_favorite_count', passed: test1Passed });

  const test2Passed = await testUpdateRecipeAverageRating();
  results.push({ name: 'update_recipe_average_rating', passed: test2Passed });

  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60) + '\n');

  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.name}`);
  });

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  console.log('\n' + '-'.repeat(60));
  console.log(`总计: ${passedCount}/${results.length} 测试通过`);
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

main();
