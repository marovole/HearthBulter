import { NextRequest, NextResponse } from 'next/server';
import { savingsRecommender } from '@/lib/services/budget/savings-recommender';
import { economicMode } from '@/lib/services/budget/economic-mode';
import { spendingAnalyzer } from '@/lib/services/budget/spending-analyzer';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
    case 'savings':
      result = await savingsRecommender.getSavingsRecommendations(memberId);
      break;

    case 'economy':
      const economyConfig = {
        enabled: true,
        dailyBudgetLimit: 50,
        prioritizeSeasonal: true,
        allowSubstitutes: true,
      };
      result = await economicMode.generateEconomicMealPlan(memberId, economyConfig, 7);
      break;

    case 'alerts':
      result = await spendingAnalyzer.generateBudgetAlerts(memberId);
      break;

    default:
      // 获取所有节省建议
      const [savings, economy, alerts] = await Promise.all([
        savingsRecommender.getSavingsRecommendations(memberId),
        economicMode.generateEconomicMealPlan(memberId, {
          enabled: true,
          dailyBudgetLimit: 50,
          prioritizeSeasonal: true,
          allowSubstitutes: true,
        }, 7),
        spendingAnalyzer.generateBudgetAlerts(memberId),
      ]);

      result = {
        savings,
        economy,
        alerts,
        summary: {
          promotionsCount: savings.promotions.length,
          groupBuysCount: savings.groupBuys.length,
          seasonalAlternativesCount: savings.seasonalAlternatives.length,
          bulkPurchasesCount: savings.bulkPurchases.length,
          couponsCount: savings.coupons.length,
          economyDaysCount: economy.length,
          alertsCount: alerts.length,
        },
      };
    }

    return NextResponse.json({
      memberId,
      type: type || 'all',
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('获取节省建议失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取节省建议失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, action, config } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
    case 'generateEconomyRecipes':
      const budgetConstraint = config?.budgetConstraint || 50;
      const recipes = await savingsRecommender.generateEconomyRecipes(memberId, budgetConstraint);
      result = { recipes };
      break;

    case 'applyRealTimeSavings':
      const currentCart = config?.currentCart || [];
      const economicConfig = config?.economicConfig || {
        enabled: true,
        prioritizeSeasonal: true,
        allowSubstitutes: true,
      };
      const optimization = await economicMode.applyRealTimeSavings(memberId, currentCart, economicConfig);
      result = optimization;
      break;

    case 'generateEconomicShoppingList':
      const mealPlanIds = config?.mealPlanIds || [];
      const shoppingList = await economicMode.generateEconomicShoppingList(memberId, mealPlanIds, economicConfig);
      result = shoppingList;
      break;

    case 'saveSavingsRecommendation':
      const recommendation = config?.recommendation;
      if (!recommendation) {
        return NextResponse.json(
          { error: '缺少recommendation参数' },
          { status: 400 }
        );
      }
      const saved = await savingsRecommender.saveSavingsRecommendation(memberId, recommendation);
      result = saved;
      break;

    default:
      return NextResponse.json(
        { error: '不支持的操作类型' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      memberId,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('执行节省建议操作失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '执行节省建议操作失败' },
      { status: 500 }
    );
  }
}
