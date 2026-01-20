import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const photoId = body?.photoId as string | undefined;
    const foodId = body?.foodId as string | undefined;
    const amount = body?.amount as number | undefined;

    if (!photoId || !foodId || !amount) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const photo = await convexClient.query<Doc<"foodPhotos"> | null>(
      asConvexQueryReference("tracking:getFoodPhotoById"),
      { id: photoId as Id<"foodPhotos"> }
    );
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

    const food = await convexClient.query<Doc<"foods"> | null>(api.budget.getFoodById, {
      foodId: foodId as Id<"foods">,
    });
    if (!food) {
      return NextResponse.json({ error: "未找到食物" }, { status: 404 });
    }

    const ratio = amount / 100;
    const foodWithOptionalFields = food as Doc<"foods"> & {
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    const nutrition = {
      calories: food.calories * ratio,
      protein: food.protein * ratio,
      carbs: food.carbs * ratio,
      fat: food.fat * ratio,
      fiber: (foodWithOptionalFields.fiber ?? 0) * ratio,
      sugar: (foodWithOptionalFields.sugar ?? 0) * ratio,
      sodium: (foodWithOptionalFields.sodium ?? 0) * ratio,
    };

    await convexClient.mutation(api.tracking.deleteMealLogFoods, {
      mealLogId: photo.mealLogId,
    });

    await convexClient.mutation(api.tracking.addMealLogFood, {
      mealLogId: photo.mealLogId,
      foodId: foodId as Id<"foods">,
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

    await convexClient.mutation(asConvexMutationReference("tracking:updateFoodPhoto"), {
      id: photoId as Id<"foodPhotos">,
      recognitionStatus: "COMPLETED",
      recognitionResult: JSON.stringify({
        foodName: food.name,
        confidence: 1,
        amount,
      }),
      confidence: 1,
    });

    return NextResponse.json({
      success: true,
      name: food.name,
      nutrition,
    });
  } catch (error) {
    console.error("修正识别结果失败:", error);
    return NextResponse.json({ error: "修正识别结果失败" }, { status: 500 });
  }
}
