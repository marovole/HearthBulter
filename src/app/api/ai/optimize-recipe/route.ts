import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeOptimizer } from "@/lib/services/ai/recipe-optimizer";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { healthRepository } from "@/lib/repositories/health-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexQueryReference } from "@/lib/convex-reference";
import { getDefaultRateLimitConfig, rateLimiter } from "@/lib/services/ai/rate-limiter";
import { sensitiveFilter } from "@/lib/services/sensitive-filter";

// Convex ID type - using string with type assertion
type Id<TableName extends string> = string & { __tableName: TableName };

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      "ai_optimize_recipe",
      getDefaultRateLimitConfig("ai_optimize_recipe")
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": rateLimitResult.retryAfter?.toString() || "3600",
          },
        }
      );
    }

    const body = await request.json();
    const {
      recipeId,
      memberId,
      targetNutrition,
      preferences,
      season,
      optimizationLevel = "moderate",
    } = body;

    if (!recipeId || !memberId) {
      return NextResponse.json({ error: "Recipe ID and Member ID are required" }, { status: 400 });
    }

    // 验证用户权限
    const accessResult = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    // 获取成员健康上下文（包含饮食偏好和过敏信息）
    const healthContext = await healthRepository.getMemberHealthContext(memberId);

    const memberData = {
      allergies: healthContext?.allergies || [],
      dietaryPreference: healthContext?.dietaryPreference
        ? {
            isVegetarian: healthContext.dietaryPreference.isVegetarian,
            isVegan: healthContext.dietaryPreference.isVegan,
            isKeto: healthContext.dietaryPreference.dietType?.toLowerCase().includes("keto"),
            isLowCarb: healthContext.dietaryPreference.dietType?.toLowerCase().includes("low"),
          }
        : undefined,
    };

    // 获取食谱数据（meal）
    const meal = (await convexClient.query(asConvexQueryReference("meals:getMealById"), {
      mealId: recipeId as Id<"meals">,
    })) as {
      _id: string;
      planId: Id<"mealPlans">;
      date: number;
      mealType: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    } | null;

    if (!meal) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // 验证 meal 的 plan 属于该 member
    const plan = (await convexClient.query(asConvexQueryReference("meals:getPlanById"), {
      planId: meal.planId,
    })) as { memberId: string } | null;

    if (!plan || plan.memberId !== memberId) {
      return NextResponse.json({ error: "Recipe not found or access denied" }, { status: 404 });
    }

    // 获取食材列表
    const ingredients = (await convexClient.query(
      asConvexQueryReference("meals:listMealIngredients"),
      {
        mealId: meal._id as Id<"meals">,
      }
    )) as Array<{ _id: string; foodId: Id<"foods">; amount: number }>;

    // 获取食物详情
    const foodIds = ingredients.map((ing) => ing.foodId);
    const foods = (await convexClient.query(asConvexQueryReference("budget:getFoodsByIds"), {
      foodIds,
    })) as Array<{ _id: Id<"foods">; name: string }>;
    const foodMap = new Map(foods.map((f) => [f._id, f]));

    // 转换食谱数据为优化器格式
    const recipeData = {
      id: meal._id,
      name: `Meal ${new Date(meal.date).toISOString().split("T")[0]} ${meal.mealType}`,
      ingredients: ingredients.map((ing) => {
        const food = foodMap.get(ing.foodId);
        return {
          id: ing._id,
          name: food?.name || "Unknown",
          amount: ing.amount,
          unit: "g",
        };
      }),
      nutrition: {
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      },
    };

    // 构建用户偏好
    const memberAllergies = Array.isArray(memberData.allergies) ? memberData.allergies : [];

    const userPreferences = {
      dietary_restrictions: [],
      allergies: memberAllergies
        .map((allergy) => allergy.allergenName)
        .filter((allergen): allergen is string => Boolean(allergen)),
      disliked_ingredients: [],
      preferred_cuisines: [],
      budget_level: "medium" as const,
      cooking_skill: "intermediate" as const,
      ...preferences,
    };

    // 添加饮食偏好限制
    if (memberData.dietaryPreference) {
      const pref = memberData.dietaryPreference;
      if (pref.isVegetarian) userPreferences.dietary_restrictions.push("vegetarian");
      if (pref.isVegan) userPreferences.dietary_restrictions.push("vegan");
      if (pref.isKeto) userPreferences.dietary_restrictions.push("keto");
      if (pref.isLowCarb) userPreferences.dietary_restrictions.push("low_carb");
    }

    // 设置默认营养目标
    const defaultTargetNutrition = targetNutrition || {
      calories: 600, // 单餐目标
      protein: 25,
      carbs: 45,
      fat: 20,
    };

    // 执行食谱优化
    const optimizationResult = await recipeOptimizer.optimizeRecipe(
      recipeData,
      defaultTargetNutrition,
      userPreferences,
      season
    );

    // 保存优化建议到数据库
    const aiAdvice = await healthRepository.saveHealthAdvice({
      memberId,
      type: "RECIPE_OPTIMIZATION",
      content: {
        originalRecipe: recipeData,
        optimization: optimizationResult,
        targetNutrition: defaultTargetNutrition,
        preferences: userPreferences,
      },
      prompt: `Recipe optimization for ${optimizationLevel} level with seasonal considerations`,
      tokens: 0,
    });

    return NextResponse.json({
      adviceId: aiAdvice?.id || "",
      optimization: optimizationResult,
      generatedAt: aiAdvice?.generatedAt || new Date(),
    });
  } catch (error) {
    console.error("Recipe optimization API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET 方法用于获取食材替代建议
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ingredient = searchParams.get("ingredient");
    const reason = searchParams.get("reason") || "general_optimization";
    const memberId = searchParams.get("memberId");

    if (!ingredient || !memberId) {
      return NextResponse.json({ error: "Ingredient and memberId are required" }, { status: 400 });
    }

    // 验证用户权限
    const accessResult = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    // 获取成员健康上下文（包含过敏信息）
    const healthContext = await healthRepository.getMemberHealthContext(memberId);
    const memberAllergies = healthContext?.allergies || [];

    // 构建用户偏好
    const userPreferences = {
      dietary_restrictions: [],
      allergies: memberAllergies
        .map((allergy) => allergy.allergenName)
        .filter((allergen): allergen is string => Boolean(allergen)),
      disliked_ingredients: [],
      preferred_cuisines: [],
      budget_level: "medium" as const,
      cooking_skill: "intermediate" as const,
    };

    // 生成替代建议
    const substitutions = await recipeOptimizer.generateIngredientSubstitutions(
      ingredient,
      reason,
      [], // 可用食材列表
      ["营养均衡", "健康饮食"], // 营养要求
      userPreferences
    );

    return NextResponse.json({ substitutions });
  } catch (error) {
    console.error("Ingredient substitution API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
