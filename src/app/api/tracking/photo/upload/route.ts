import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { FileStorageService } from "@/lib/services/file-storage-service";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference } from "@/lib/convex-reference";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const mealTypeParam = formData.get("mealType")?.toString() || "SNACK";
    const dateParam = formData.get("date")?.toString();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少图片文件" }, { status: 400 });
    }

    if (
      !FileStorageService.validateFileType(file.type, [
        "image/jpeg",
        "image/png",
        "image/webp",
      ])
    ) {
      return NextResponse.json({ error: "不支持的图片格式" }, { status: 400 });
    }

    if (!FileStorageService.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "图片大小不能超过10MB" },
        { status: 400 },
      );
    }

    const members = await convexClient.query<Array<{ _id: string }>>(
      api.members.listByClerkId,
      { clerkId: session.user.id },
    );
    const member = members[0];

    if (!member) {
      return NextResponse.json({ error: "未找到关联的成员" }, { status: 404 });
    }

    const mealType = MEAL_TYPES.includes(
      mealTypeParam as (typeof MEAL_TYPES)[number],
    )
      ? (mealTypeParam as (typeof MEAL_TYPES)[number])
      : "SNACK";

    const mealLogId = await convexClient.mutation<Id<"mealLogs">>(
      api.tracking.createMealLog,
      {
        memberId: member._id as Id<"familyMembers">,
        date: (dateParam ? new Date(dateParam) : new Date()).getTime(),
        mealType,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    );

    const uploadResult = await FileStorageService.uploadFile(
      file,
      file.name,
      member._id,
      { contentType: file.type },
    );

    const photoId = await convexClient.mutation<Id<"foodPhotos">>(
      asConvexMutationReference("tracking:createFoodPhoto"),
      {
        mealLogId,
        storageId: uploadResult.storageId,
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileSize: file.size,
        recognitionStatus: "PENDING",
      },
    );

    return NextResponse.json({
      imageUrl: uploadResult.url,
      photoId: photoId as string,
      mealLogId: mealLogId as string,
    });
  } catch (error) {
    console.error("上传食物照片失败:", error);
    return NextResponse.json({ error: "上传食物照片失败" }, { status: 500 });
  }
}
