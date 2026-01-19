import { convexTracking } from "@/lib/convex-tracking";
import type { Id } from "../../../../convex/_generated/dataModel";

interface FoodPhotoDoc {
  _id: Id<"foodPhotos">;
  mealLogId: Id<"mealLogs">;
  fileUrl: string;
  recognitionStatus: string;
  recognitionResult?: string;
  recognitionError?: string;
  confidence?: number;
  deletedAt?: number;
}

interface MealLogFoodDoc {
  _id: Id<"mealLogFoods">;
  foodId: Id<"foods">;
  amount: number;
}

interface MealLogDoc {
  _id: Id<"mealLogs">;
  foods: MealLogFoodDoc[];
}

interface FoodDoc {
  _id: Id<"foods">;
  name: string;
}

export interface RecognitionResult {
  foodName: string;
  confidence: number;
  amount?: number;
  alternativeMatches?: Array<{
    foodName: string;
    confidence: number;
  }>;
}

export async function uploadFoodPhoto(data: {
  mealLogId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}) {
  const { mealLogId, fileUrl, fileName, fileSize } = data;

  const photoId = await convexTracking.createFoodPhoto({
    mealLogId,
    fileUrl,
    fileName,
    fileSize,
    recognitionStatus: "PENDING",
  });

  recognizeFoodPhoto(photoId as string).catch((error) => {
    console.error("Food recognition failed:", error);
  });

  return convexTracking.getFoodPhotoById(
    photoId as string,
  ) as Promise<FoodPhotoDoc | null>;
}

export async function recognizeFoodPhoto(photoId: string) {
  try {
    await convexTracking.updateFoodPhoto(photoId, {
      recognitionStatus: "PROCESSING",
    });

    const photo = (await convexTracking.getFoodPhotoById(
      photoId,
    )) as FoodPhotoDoc | null;
    if (!photo) {
      throw new Error("Photo not found");
    }

    const result = await mockRecognition(photo.fileUrl);

    const matchedFoods = await findMatchingFoods(result.foodName);

    const recognitionResult: RecognitionResult = {
      foodName: result.foodName,
      confidence: result.confidence,
      amount: result.amount,
      alternativeMatches: matchedFoods.slice(1, 4).map((food) => ({
        foodName: food.name,
        confidence: result.confidence * 0.8,
      })),
    };

    await convexTracking.updateFoodPhoto(photoId, {
      recognitionStatus: "COMPLETED",
      recognitionResult: JSON.stringify(recognitionResult),
      confidence: result.confidence,
    });

    return recognitionResult;
  } catch (error) {
    await convexTracking.updateFoodPhoto(photoId, {
      recognitionStatus: "FAILED",
      recognitionError:
        error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function mockRecognition(imageUrl: string): Promise<{
  foodName: string;
  confidence: number;
  amount?: number;
}> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mockFoods = [
    { name: "米饭", confidence: 0.92, amount: 150 },
    { name: "鸡蛋", confidence: 0.88, amount: 50 },
    { name: "番茄炒蛋", confidence: 0.85, amount: 200 },
    { name: "青菜", confidence: 0.8, amount: 100 },
    { name: "鸡胸肉", confidence: 0.87, amount: 120 },
  ];

  const selected = mockFoods[Math.floor(Math.random() * mockFoods.length)];

  if (!selected) {
    return { foodName: "未知食物", confidence: 0.5, amount: 100 };
  }

  return {
    foodName: selected.name,
    confidence: selected.confidence,
    amount: selected.amount,
  };
}

async function findMatchingFoods(
  foodName: string,
): Promise<Array<{ name: string; _id: string }>> {
  const foods = (await convexTracking.getFoodsByIds([])) as FoodDoc[];
  return foods
    .filter(
      (food) => food.name.includes(foodName) || foodName.includes(food.name),
    )
    .slice(0, 5)
    .map((food) => ({ name: food.name, _id: food._id as string }));
}

export async function getRecognitionResult(photoId: string) {
  const photo = (await convexTracking.getFoodPhotoById(
    photoId,
  )) as FoodPhotoDoc | null;

  if (!photo) {
    throw new Error("Photo not found");
  }

  if (photo.recognitionStatus !== "COMPLETED") {
    return {
      status: photo.recognitionStatus,
      error: photo.recognitionError,
    };
  }

  const result = JSON.parse(
    photo.recognitionResult || "{}",
  ) as RecognitionResult;

  return {
    status: photo.recognitionStatus,
    confidence: photo.confidence,
    result,
  };
}

export async function correctRecognitionResult(
  photoId: string,
  correctedFoodId: string,
  amount: number,
) {
  const photo = (await convexTracking.getFoodPhotoById(
    photoId,
  )) as FoodPhotoDoc | null;
  if (!photo) {
    throw new Error("Photo not found");
  }

  const mealLog = (await convexTracking.getMealLogById(
    photo.mealLogId as string,
  )) as MealLogDoc | null;
  if (!mealLog) {
    throw new Error("Meal log not found");
  }

  const existingFood = mealLog.foods.find(
    (food) => food.foodId === correctedFoodId,
  );

  if (existingFood) {
    await convexTracking.addMealLogFood(
      photo.mealLogId as string,
      correctedFoodId,
      amount,
    );
  } else {
    await convexTracking.addMealLogFood(
      photo.mealLogId as string,
      correctedFoodId,
      amount,
    );
  }

  const correctedFood = mealLog.foods.find((f) => f._id === correctedFoodId);
  if (correctedFood) {
    const result: RecognitionResult = {
      foodName: correctedFood.foodId as string,
      confidence: 1.0,
      amount,
    };

    await convexTracking.updateFoodPhoto(photoId, {
      recognitionResult: JSON.stringify(result),
      confidence: 1.0,
    });
  }

  return { success: true };
}

export async function uploadMultiplePhotos(data: {
  mealLogId: string;
  photos: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }>;
}) {
  const { mealLogId, photos } = data;

  const uploadedPhotos = await Promise.all(
    photos.map((photo) =>
      uploadFoodPhoto({
        mealLogId,
        fileUrl: photo.fileUrl,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
      }),
    ),
  );

  return uploadedPhotos;
}

export async function deleteFoodPhoto(photoId: string) {
  await convexTracking.deleteFoodPhoto(photoId);
}

export async function getMealLogPhotos(mealLogId: string) {
  return convexTracking.getMealLogPhotos(mealLogId);
}
