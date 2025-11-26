import { NextRequest, NextResponse } from 'next/server';
import { costOptimizer } from '@/lib/services/budget/cost-optimizer';
import { priceAnalyzer } from '@/lib/services/budget/price-analyzer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      memberId,
      foodIds,
      optimizationType,
      constraints,
    } = body;

    if (!memberId || !foodIds || !Array.isArray(foodIds)) {
      return NextResponse.json(
        { error: '缺少必需参数: memberId, foodIds' },
        { status: 400 }
      );
    }

    if (foodIds.length === 0) {
      return NextResponse.json(
        { error: 'foodIds不能为空' },
        { status: 400 }
      );
    }

    let result;

    switch (optimizationType) {
    case 'shoppingList':
      result = await costOptimizer.optimizeShoppingList(foodIds, {
        nutritionTargets: constraints?.nutritionTargets || {
          calories: 2000,
          protein: 60,
          carbs: 250,
          fat: 65,
        },
        maxCost: constraints?.maxCost,
        minSavings: constraints?.minSavings,
        allowedCategories: constraints?.allowedCategories,
        excludedFoodIds: constraints?.excludedFoodIds,
        preferSeasonal: constraints?.preferSeasonal || false,
        economyMode: constraints?.economyMode || false,
      });
      break;

    case 'multiObjective':
      result = await costOptimizer.multiObjectiveOptimization(
        await costOptimizer.getFoodOptions(foodIds),
        await costOptimizer.findSubstituteOptions(
          await costOptimizer.getFoodOptions(foodIds),
          constraints || {}
        ),
        constraints || {}
      );
      break;

    case 'platformComparison':
      if (foodIds.length === 1) {
        result = await priceAnalyzer.getPlatformComparison(
          foodIds[0],
          constraints?.quantity || 1
        );
      } else {
        result = await priceAnalyzer.optimizeBulkPurchase(foodIds);
      }
      break;

    case 'bulkPurchase':
      result = await priceAnalyzer.optimizeBulkPurchase(foodIds);
      break;

    default:
      result = await costOptimizer.optimizeShoppingList(foodIds, constraints || {});
    }

    return NextResponse.json({
      success: true,
      optimizationType,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('成本优化失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '成本优化失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const foodId = searchParams.get('foodId');
    const type = searchParams.get('type');

    if (!foodId) {
      return NextResponse.json(
        { error: '缺少foodId参数' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
    case 'platform':
      result = await priceAnalyzer.getPlatformComparison(foodId);
      break;
    case 'priceHistory':
      result = await priceAnalyzer.getPriceTrend(foodId);
      break;
    default:
      result = await costOptimizer.getPlatformPriceComparison(foodId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取优化信息失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取优化信息失败' },
      { status: 500 }
    );
  }
}
