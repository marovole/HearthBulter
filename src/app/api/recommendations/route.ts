import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

const prisma = new PrismaClient();
const recommendationEngine = new RecommendationEngine(prisma);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 获取推荐参数
    const memberId = searchParams.get('memberId') || 'default-user';
    const mealType = searchParams.get('mealType') as any || undefined;
    const servings = parseInt(searchParams.get('servings') || '2');
    const maxCookTime = parseInt(searchParams.get('maxCookTime') || '60');
    const budgetLimit = parseFloat(searchParams.get('budgetLimit') || '50');
    const dietaryRestrictions = searchParams.get('dietaryRestrictions')?.split(',') || [];
    const excludedIngredients = searchParams.get('excludedIngredients')?.split(',') || [];
    const preferredCuisines = searchParams.get('preferredCuisines')?.split(',') || [];
    const season = searchParams.get('season') as any || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 构建推荐上下文
    const context = {
      memberId,
      mealType,
      servings,
      maxCookTime,
      budgetLimit,
      dietaryRestrictions,
      excludedIngredients,
      preferredCuisines,
      season
    };

    // 获取推荐结果
    const recommendations = await recommendationEngine.getRecommendations(
      context,
      limit
    );

    // 获取推荐的食谱详细信息
    const recipeIds = recommendations.map(r => r.recipeId);
    const recipes = await prisma.recipe.findMany({
      where: {
        id: { in: recipeIds },
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null
      },
      include: {
        ingredients: {
          include: { food: true }
        },
        instructions: true,
        nutrition: true
      }
    });

    // 组合推荐结果和食谱信息
    const enrichedRecommendations = recommendations.map(rec => {
      const recipe = recipes.find(r => r.id === rec.recipeId);
      return {
        ...rec,
        recipe
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        context,
        total: enrichedRecommendations.length
      }
    });

  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'rating':
        // 记录用户评分
        const rating = await prisma.recipeRating.create({
          data: {
            recipeId: data.recipeId,
            memberId: data.memberId,
            rating: data.rating,
            review: data.review,
            isRecommended: data.isRecommended
          }
        });
        return NextResponse.json({ success: true, data: rating });

      case 'favorite':
        // 记录用户收藏
        const favorite = await prisma.recipeFavorite.create({
          data: {
            recipeId: data.recipeId,
            memberId: data.memberId,
            folderName: data.folderName || '默认收藏夹',
            notes: data.notes
          }
        });
        return NextResponse.json({ success: true, data: favorite });

      case 'view':
        // 记录用户浏览
        const view = await prisma.recipeView.create({
          data: {
            recipeId: data.recipeId,
            memberId: data.memberId,
            viewDuration: data.viewDuration || 0,
            viewSource: data.viewSource,
            isCompleted: data.isCompleted || false,
            deviceType: data.deviceType
          }
        });
        return NextResponse.json({ success: true, data: view });

      case 'substitution':
        // 记录食材替换
        const substitution = await prisma.ingredientSubstitution.create({
          data: {
            recipeId: data.recipeId,
            memberId: data.memberId,
            originalIngredientId: data.originalIngredientId,
            substitutedIngredientId: data.substitutedIngredientId,
            substitutionReason: data.substitutionReason,
            quantityRatio: data.quantityRatio || 1.0,
            qualityImpact: data.qualityImpact,
            isSuccessful: data.isSuccessful,
            feedback: data.feedback
          }
        });
        return NextResponse.json({ success: true, data: substitution });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid interaction type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Interaction API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record interaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
