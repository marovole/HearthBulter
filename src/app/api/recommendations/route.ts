/**
 * ⚠️⚠️⚠️ 严重警告 - 此端点迁移存在多个阻塞性问题 ⚠️⚠️⚠️
 *
 * CodeX Review 发现的 BLOCKER 级别问题：
 *
 * 1. **嵌套关系数据丢失** (BLOCKER)
 *    - `ingredients.include.food` 不会被 Supabase 适配器正确 join
 *    - 推荐引擎依赖 `recipe.ingredients[n].food` 会导致运行时崩溃
 *    - 位置: 所有调用 recommendationEngine 的地方
 *
 * 2. **orderBy 数组格式不支持** (BLOCKER)
 *    - 适配器将数组 `[{key: 'desc'}]` 视为对象，生成无效 SQL
 *    - 导致 500 错误
 *    - 位置: popular 端点的排序查询
 *
 * 3. **上下文过滤器失效** (MAJOR)
 *    - Prisma JSON 操作符（path, string_contains）不支持
 *    - 用户的餐类型/季节/排除过滤器被完全忽略
 *    - 业务逻辑已改变！
 *
 * 4. **RecommendationEngine 架构问题** (MEDIUM)
 *    - 使用 `as any` 类型断言隐藏编译时错误
 *    - 引擎及其依赖类仍期望 PrismaClient 类型
 *
 * **修复方案**（需要架构级别重构）：
 * 1. 增强适配器支持嵌套关系 join
 * 2. 实现 Prisma 风格的 orderBy 数组支持
 * 3. 添加 JSON 操作符支持或使用 Supabase RPC
 * 4. 创建 RecommendationDataSource 接口抽象层
 *
 * **当前状态**: 此端点在生产环境中会崩溃！仅供开发参考。
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdapter } from "@/lib/db/supabase-adapter";
import { RecommendationEngine } from "@/lib/services/recommendation/recommendation-engine";

// 临时使用类型断言，但会导致运行时错误（见上述警告）

// Force dynamic rendering
export const dynamic = "force-dynamic";
const recommendationEngine = new RecommendationEngine(supabaseAdapter as any);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 获取推荐参数
    const memberId = searchParams.get("memberId") || "default-user";
    const mealType = (searchParams.get("mealType") as any) || undefined;
    const servings = parseInt(searchParams.get("servings") || "2");
    const maxCookTime = parseInt(searchParams.get("maxCookTime") || "60");
    const budgetLimit = parseFloat(searchParams.get("budgetLimit") || "50");
    const dietaryRestrictions =
      searchParams.get("dietaryRestrictions")?.split(",") || [];
    const excludedIngredients =
      searchParams.get("excludedIngredients")?.split(",") || [];
    const preferredCuisines =
      searchParams.get("preferredCuisines")?.split(",") || [];
    const season = (searchParams.get("season") as any) || undefined;
    const limit = parseInt(searchParams.get("limit") || "10");

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
      season,
    };

    // 获取推荐结果
    const recommendations = await recommendationEngine.getRecommendations(
      context,
      limit,
    );

    // 获取推荐的食谱详细信息
    const recipeIds = recommendations.map((r) => r.recipeId);

    // 空 ID 数组保护
    if (recipeIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          context,
          total: 0,
        },
      });
    }

    const recipes = await supabaseAdapter.recipe.findMany({
      where: {
        id: { in: recipeIds },
        status: "PUBLISHED",
        isPublic: true,
        deletedAt: null,
      },
      include: {
        ingredients: {
          include: { food: true },
        },
        instructions: true,
        nutrition: true,
      },
    });

    // 组合推荐结果和食谱信息
    const enrichedRecommendations = recommendations.map((rec) => {
      const recipe = recipes.find((r) => r.id === rec.recipeId);
      return {
        ...rec,
        recipe,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        context,
        total: enrichedRecommendations.length,
      },
    });
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
    case "rating":
      // 记录用户评分
      const rating = await supabaseAdapter.recipeRating.create({
        data: {
          recipeId: data.recipeId,
          memberId: data.memberId,
          rating: data.rating,
          review: data.review,
          isRecommended: data.isRecommended,
        },
      });
      return NextResponse.json({ success: true, data: rating });

    case "favorite":
      // 记录用户收藏
      const favorite = await supabaseAdapter.recipeFavorite.create({
        data: {
          recipeId: data.recipeId,
          memberId: data.memberId,
          folderName: data.folderName || "默认收藏夹",
          notes: data.notes,
        },
      });
      return NextResponse.json({ success: true, data: favorite });

    case "view":
      // 记录用户浏览
      const view = await supabaseAdapter.recipeView.create({
        data: {
          recipeId: data.recipeId,
          memberId: data.memberId,
          viewDuration: data.viewDuration || 0,
          viewSource: data.viewSource,
          isCompleted: data.isCompleted || false,
          deviceType: data.deviceType,
        },
      });
      return NextResponse.json({ success: true, data: view });

    case "substitution":
      // 记录食材替换
      const substitution =
          await supabaseAdapter.ingredientSubstitution.create({
            data: {
              recipeId: data.recipeId,
              memberId: data.memberId,
              originalIngredientId: data.originalIngredientId,
              substitutedIngredientId: data.substitutedIngredientId,
              substitutionReason: data.substitutionReason,
              quantityRatio: data.quantityRatio || 1.0,
              qualityImpact: data.qualityImpact,
              isSuccessful: data.isSuccessful,
              feedback: data.feedback,
            },
          });
      return NextResponse.json({ success: true, data: substitution });

    default:
      return NextResponse.json(
        { success: false, error: "Invalid interaction type" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Interaction API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record interaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
