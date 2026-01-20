import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

const MOCK_FOODS = [
  { name: "米饭", confidence: 0.92, amount: 150 },
  { name: "鸡蛋", confidence: 0.88, amount: 50 },
  { name: "番茄炒蛋", confidence: 0.85, amount: 200 },
  { name: "青菜", confidence: 0.8, amount: 100 },
  { name: "鸡胸肉", confidence: 0.87, amount: 120 },
];

export async function POST(request: NextRequest) {
  let photoId: string | undefined;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    photoId = body?.photoId as string | undefined;

    if (!photoId) {
      return NextResponse.json({ error: "缺少photoId" }, { status: 400 });
    }

    const photo = await convexClient.query<
      | (Record<string, unknown> & {
          _id: string;
          mealLogId: Id<"mealLogs">;
        })
      | null
    >(asConvexQueryReference("tracking:getFoodPhotoById"), {
      id: photoId as Id<"foodPhotos">,
    });

    if (!photo) {
      return NextResponse.json({ error: "未找到照片记录" }, { status: 404 });
    }

    const mealLog = await convexClient.query<
      | (Record<string, unknown> & {
          _id: string;
          memberId: Id<"familyMembers">;
        })
      | null
    >(api.tracking.getMealLogById, {
      id: photo.mealLogId,
    });

    if (!mealLog) {
      return NextResponse.json({ error: "未找到餐食记录" }, { status: 404 });
    }

    const access = await memberRepository.verifyMemberAccess(mealLog.memberId, session.user.id);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限访问该记录" }, { status: 403 });
    }

    await convexClient.mutation(asConvexMutationReference("tracking:updateFoodPhoto"), {
      id: photoId as Id<"foodPhotos">,
      recognitionStatus: "PROCESSING",
    });

    const mockResult = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];

    if (!mockResult) {
      throw new Error("识别结果生成失败");
    }

    const matchedFoods = await convexClient.query<Doc<"foods">[]>(
      asConvexQueryReference("tracking:searchFoods"),
      {
        query: mockResult.name,
        limit: 5,
      }
    );

    const recognitionResult = {
      foodName: mockResult.name,
      confidence: mockResult.confidence,
      amount: mockResult.amount,
      alternativeMatches: matchedFoods.slice(1, 4).map((food) => ({
        foodName: food.name,
        confidence: mockResult.confidence * 0.8,
      })),
    };

    await convexClient.mutation(asConvexMutationReference("tracking:updateFoodPhoto"), {
      id: photoId as Id<"foodPhotos">,
      recognitionStatus: "COMPLETED",
      recognitionResult: JSON.stringify(recognitionResult),
      confidence: mockResult.confidence,
    });

    const primaryFood = matchedFoods[0] || null;
    const amount = mockResult.amount ?? 100;

    let nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    if (primaryFood) {
      const ratio = amount / 100;
      const foodWithOptionalFields = primaryFood as Doc<"foods"> & {
        fiber?: number;
        sugar?: number;
        sodium?: number;
      };
      nutrition = {
        calories: primaryFood.calories * ratio,
        protein: primaryFood.protein * ratio,
        carbs: primaryFood.carbs * ratio,
        fat: primaryFood.fat * ratio,
        fiber: (foodWithOptionalFields.fiber ?? 0) * ratio,
        sugar: (foodWithOptionalFields.sugar ?? 0) * ratio,
        sodium: (foodWithOptionalFields.sodium ?? 0) * ratio,
      };

      await convexClient.mutation(api.tracking.deleteMealLogFoods, {
        mealLogId: photo.mealLogId,
      });

      await convexClient.mutation(api.tracking.addMealLogFood, {
        mealLogId: photo.mealLogId,
        foodId: primaryFood._id as Id<"foods">,
        amount,
      });

      await convexClient.mutation(api.tracking.updateMealLog, {
        id: photo.mealLogId,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        sodium: nutrition.sodium,
      });
    }

    const alternatives = await Promise.all(
      recognitionResult.alternativeMatches.map(async (match) => {
        const foods = await convexClient.query<Doc<"foods">[]>(
          asConvexQueryReference("tracking:searchFoods"),
          {
            query: match.foodName,
            limit: 1,
          }
        );

        const food = foods[0] ?? null;

        return food
          ? {
              id: food._id,
              name: food.name,
              confidence: Math.round(match.confidence * 100),
            }
          : null;
      })
    );

    return NextResponse.json({
      photoId,
      mealLogId: photo.mealLogId,
      foodId: primaryFood?._id ?? null,
      name: primaryFood?.name ?? mockResult.name,
      confidence: Math.round(mockResult.confidence * 100),
      estimatedAmount: amount,
      nutrition,
      alternatives: alternatives.filter(
        (item): item is { id: Id<"foods">; name: string; confidence: number } => item !== null
      ),
    });
  } catch (error) {
    if (photoId) {
      await convexClient.mutation(asConvexMutationReference("tracking:updateFoodPhoto"), {
        id: photoId as Id<"foodPhotos">,
        recognitionStatus: "FAILED",
        recognitionError: error instanceof Error ? error.message : "识别失败",
      });
    }

    console.error("食物识别失败:", error);
    return NextResponse.json({ error: "食物识别失败" }, { status: 500 });
  }
}
