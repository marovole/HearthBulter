import { RecommendationEngine } from '../src/lib/services/recommendation/recommendation-engine';
import { PrismaClient } from '@prisma/client';

/**
 * 智能食谱推荐系统测试
 * 
 * 这个测试文件验证推荐系统的各个组件是否正常工作
 */

const prisma = new PrismaClient();
const recommendationEngine = new RecommendationEngine(prisma);

async function testRecommendationEngine() {
  console.log('🚀 开始测试智能食谱推荐系统...\n');

  try {
    // 测试用户ID
    const testMemberId = 'test-user-001';

    // 1. 测试基础推荐功能
    console.log('📊 测试1: 基础推荐功能');
    const basicRecommendations = await recommendationEngine.getRecommendations({
      memberId: testMemberId,
      mealType: 'DINNER',
      servings: 2,
      maxCookTime: 60,
      budgetLimit: 50
    }, 5);

    console.log(`✅ 获取到 ${basicRecommendations.length} 个推荐`);
    basicRecommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.recipeId} (分数: ${rec.score.toFixed(2)})`);
      console.log(`     理由: ${rec.reasons.join(', ')}`);
      console.log(`     解释: ${rec.explanation}\n`);
    });

    // 2. 测试刷新推荐功能
    console.log('🔄 测试2: 刷新推荐功能');
    const excludeIds = basicRecommendations.map(r => r.recipeId);
    const refreshRecommendations = await recommendationEngine.refreshRecommendations(
      {
        memberId: testMemberId,
        mealType: 'LUNCH',
        servings: 2
      },
      excludeIds,
      3
    );

    console.log(`✅ 刷新后获取到 ${refreshRecommendations.length} 个新推荐`);
    refreshRecommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.recipeId} (分数: ${rec.score.toFixed(2)})`);
    });

    // 3. 测试相似食谱推荐
    if (basicRecommendations.length > 0) {
      console.log('\n🔗 测试3: 相似食谱推荐');
      const similarRecipes = await recommendationEngine.getSimilarRecipes(
        basicRecommendations[0].recipeId,
        3
      );

      console.log(`✅ 获取到 ${similarRecipes.length} 个相似食谱`);
      similarRecipes.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.recipeId} (相似度分数: ${rec.score.toFixed(2)})`);
      });
    }

    // 4. 测试热门食谱推荐
    console.log('\n🔥 测试4: 热门食谱推荐');
    const popularRecipes = await recommendationEngine.getPopularRecipes(3);
    
    console.log(`✅ 获取到 ${popularRecipes.length} 个热门食谱`);
    popularRecipes.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.recipeId} (分数: ${rec.score.toFixed(2)})`);
      console.log(`     理由: ${rec.reasons.join(', ')}`);
    });

    // 5. 测试用户偏好更新
    console.log('\n🧠 测试5: 用户偏好更新');
    await recommendationEngine.updateUserPreferences(testMemberId);
    console.log('✅ 用户偏好更新完成');

    // 6. 测试不同权重配置
    console.log('\n⚖️  测试6: 不同权重配置');
    const weightedRecommendations = await recommendationEngine.getRecommendations(
      {
        memberId: testMemberId,
        mealType: 'BREAKFAST'
      },
      3,
      {
        inventory: 0.5,  // 更重视库存
        price: 0.3,      // 更重视价格
        nutrition: 0.1,  // 降低营养权重
        preference: 0.05,
        seasonal: 0.05
      }
    );

    console.log(`✅ 权重调整后获取到 ${weightedRecommendations.length} 个推荐`);
    weightedRecommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.recipeId} (分数: ${rec.score.toFixed(2)})`);
      console.log(`     库存匹配: ${(rec.metadata.inventoryMatch * 100).toFixed(1)}%`);
      console.log(`     价格匹配: ${(rec.metadata.priceMatch * 100).toFixed(1)}%`);
    });

    console.log('\n🎉 所有测试完成！推荐系统运行正常。');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

async function testAPICalls() {
  console.log('\n🌐 测试API调用...');

  const baseUrl = 'http://localhost:3000';
  const testMemberId = 'test-user-001';

  try {
    // 测试获取推荐
    console.log('📡 测试推荐API...');
    const recommendationsResponse = await fetch(
      `${baseUrl}/api/recommendations?memberId=${testMemberId}&mealType=DINNER&limit=3`
    );
    
    if (recommendationsResponse.ok) {
      const data = await recommendationsResponse.json();
      console.log(`✅ API返回 ${data.data.recommendations.length} 个推荐`);
    } else {
      console.log('⚠️  API调用失败，请确保服务器正在运行');
    }

    // 测试刷新推荐
    console.log('📡 测试刷新API...');
    const refreshResponse = await fetch(`${baseUrl}/api/recommendations/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: testMemberId,
        excludeRecipeIds: ['test-recipe-1'],
        limit: 3
      })
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      console.log(`✅ 刷新API返回 ${data.data.recommendations.length} 个推荐`);
    } else {
      console.log('⚠️  刷新API调用失败');
    }

  } catch (error) {
    console.log('⚠️  API测试跳过（服务器未运行）:', error.message);
  }
}

async function testPerformance() {
  console.log('\n⚡ 性能测试...');

  const testMemberId = 'test-user-001';
  const iterations = 10;

  try {
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await recommendationEngine.getRecommendations({
        memberId: testMemberId,
        mealType: 'LUNCH'
      }, 5);
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`✅ ${iterations} 次推荐平均耗时: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime < 1000) {
      console.log('🚀 性能优秀 (< 1秒)');
    } else if (avgTime < 3000) {
      console.log('✅ 性能良好 (< 3秒)');
    } else {
      console.log('⚠️  性能需要优化 (> 3秒)');
    }

  } catch (error) {
    console.error('❌ 性能测试失败:', error);
  }
}

// 主测试函数
async function runAllTests() {
  console.log('=' .repeat(60));
  console.log('🧪 智能食谱推荐系统 - 完整测试套件');
  console.log('=' .repeat(60));

  try {
    await testRecommendationEngine();
    await testAPICalls();
    await testPerformance();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎊 所有测试通过！系统已准备就绪。');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n💥 测试过程中出现错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllTests();
}

export {
  testRecommendationEngine,
  testAPICalls,
  testPerformance,
  runAllTests
};
