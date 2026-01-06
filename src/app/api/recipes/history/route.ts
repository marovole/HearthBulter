import { NextRequest, NextResponse } from "next/server";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

/**
 * GET /api/recipes/history - 获取食谱浏览历史
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    const skip = (page - 1) * limit;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const supabase = SupabaseClientManager.getInstance();

    // 获取浏览历史
    const {
      data: views,
      error: viewsError,
      count,
    } = await supabase
      .from("recipe_views")
      .select(
        `
        id,
        viewedAt,
        viewDuration,
        source,
        recipe:recipes!inner(
          id,
          name,
          description,
          servings,
          prepTime,
          cookTime,
          difficulty,
          cuisine,
          tags,
          imageUrl,
          createdAt,
          updatedAt
        )
      `,
        { count: "exact" },
      )
      .eq("memberId", memberId)
      .gte("viewedAt", startDate.toISOString())
      .order("viewedAt", { ascending: false })
      .range(skip, skip + limit - 1);

    if (viewsError) {
      console.error("查询浏览历史失败:", viewsError);
      return NextResponse.json(
        { error: "Failed to fetch recipe history" },
        { status: 500 },
      );
    }

    const total = count || 0;

    // 如果有浏览记录，查询对应的ingredients
    let viewsWithIngredients = views || [];
    if (views && views.length > 0) {
      const recipeIds = views.map((view: any) => view.recipe.id);

      // 查询所有相关的ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select(
          `
          id,
          recipeId,
          amount,
          unit,
          notes,
          food:foods!inner(
            id,
            name,
            nameEn,
            calories,
            protein,
            carbs,
            fat,
            category
          )
        `,
        )
        .in("recipeId", recipeIds);

      if (ingredientsError) {
        console.error("查询食材失败:", ingredientsError);
      } else {
        // 按recipeId分组ingredients
        const ingredientsMap = new Map<string, any[]>();
        ingredients?.forEach((ing: any) => {
          if (!ingredientsMap.has(ing.recipeId)) {
            ingredientsMap.set(ing.recipeId, []);
          }
          ingredientsMap.get(ing.recipeId)!.push(ing);
        });

        // 组装数据
        viewsWithIngredients = views.map((view: any) => ({
          ...view,
          recipe: {
            ...view.recipe,
            ingredients: ingredientsMap.get(view.recipe.id) || [],
          },
        }));
      }
    }

    return NextResponse.json({
      success: true,
      views: viewsWithIngredients.map((view: any) => ({
        id: view.id,
        viewedAt: view.viewedAt,
        viewDuration: view.viewDuration,
        source: view.source,
        recipe: view.recipe,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting recipe history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recipes/history - 记录食谱浏览
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { memberId, recipeId, viewDuration, source } = await request.json();

    // 验证必需参数
    if (!memberId || !recipeId) {
      return NextResponse.json(
        { error: "Missing required parameters: memberId and recipeId" },
        { status: 400 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 检查食谱是否存在
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", recipeId)
      .maybeSingle();

    if (recipeError) {
      console.error("查询食谱失败:", recipeError);
      return NextResponse.json(
        { error: "Failed to check recipe" },
        { status: 500 },
      );
    }

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 创建浏览记录
    const { data: view, error: viewError } = await supabase
      .from("recipe_views")
      .insert({
        memberId,
        recipeId,
        viewDuration: viewDuration || null,
        source: source || "direct",
      })
      .select()
      .single();

    if (viewError) {
      console.error("创建浏览记录失败:", viewError);
      return NextResponse.json(
        { error: "Failed to record view" },
        { status: 500 },
      );
    }

    // 更新食谱浏览计数
    await updateRecipeViewCount(recipeId);

    return NextResponse.json({
      success: true,
      view,
    });
  } catch (error) {
    console.error("Error recording recipe view:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * 更新食谱浏览计数
 * Migrated from Prisma to Supabase
 */
async function updateRecipeViewCount(recipeId: string) {
  const supabase = SupabaseClientManager.getInstance();

  // 查询浏览总数
  const { count, error: countError } = await supabase
    .from("recipe_views")
    .select("*", { count: "exact", head: true })
    .eq("recipeId", recipeId);

  if (countError) {
    console.error("查询浏览计数失败:", countError);
    return;
  }

  // 更新食谱的viewCount
  const { error: updateError } = await supabase
    .from("recipes")
    .update({ viewCount: count || 0 })
    .eq("id", recipeId);

  if (updateError) {
    console.error("更新食谱浏览计数失败:", updateError);
  }
}
