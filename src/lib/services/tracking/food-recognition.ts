/**
 * 食物识别服务
 * 负责处理食物照片上传和AI识别
 */

import { db } from '@/lib/db';
import { RecognitionStatus } from '@prisma/client';

export interface RecognitionResult {
  foodName: string;
  confidence: number;
  amount?: number; // 估算的重量（克）
  alternativeMatches?: Array<{
    foodName: string;
    confidence: number;
  }>;
}

/**
 * 上传食物照片
 */
export async function uploadFoodPhoto(data: {
  mealLogId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}) {
  const { mealLogId, fileUrl, fileName, fileSize } = data;

  // 创建照片记录
  const photo = await db.foodPhoto.create({
    data: {
      mealLogId,
      fileUrl,
      fileName,
      fileSize,
      recognitionStatus: RecognitionStatus.PENDING,
    },
  });

  // 异步触发识别任务（实际项目中应该放到队列中）
  recognizeFoodPhoto(photo.id).catch((error) => {
    console.error('Food recognition failed:', error);
  });

  return photo;
}

/**
 * 识别食物照片
 * 注：这是一个占位实现，实际项目中需要集成真实的AI识别服务
 * 可选方案：
 * 1. TensorFlow.js + MobileNet
 * 2. Clarifai Food Model
 * 3. Google Cloud Vision API
 * 4. 自定义训练的模型
 */
export async function recognizeFoodPhoto(photoId: string) {
  try {
    // 更新状态为处理中
    await db.foodPhoto.update({
      where: { id: photoId },
      data: {
        recognitionStatus: RecognitionStatus.PROCESSING,
      },
    });

    // 获取照片信息
    const photo = await db.foodPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // TODO: 实际的识别逻辑
    // 这里是模拟的识别结果
    const result = await mockRecognition(photo.fileUrl);

    // 在数据库中查找匹配的食物
    const matchedFoods = await findMatchingFoods(result.foodName);

    // 构建识别结果
    const recognitionResult: RecognitionResult = {
      foodName: result.foodName,
      confidence: result.confidence,
      amount: result.amount,
      alternativeMatches: matchedFoods.slice(1, 4).map((food) => ({
        foodName: food.name,
        confidence: result.confidence * 0.8, // 备选项的置信度稍低
      })),
    };

    // 更新照片记录
    await db.foodPhoto.update({
      where: { id: photoId },
      data: {
        recognitionStatus: RecognitionStatus.COMPLETED,
        recognitionResult: JSON.stringify(recognitionResult),
        confidence: result.confidence,
      },
    });

    return recognitionResult;
  } catch (error) {
    // 识别失败
    await db.foodPhoto.update({
      where: { id: photoId },
      data: {
        recognitionStatus: RecognitionStatus.FAILED,
        recognitionError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * 模拟食物识别（用于开发测试）
 * 实际项目中需要替换为真实的AI识别服务
 */
async function mockRecognition(imageUrl: string): Promise<{
  foodName: string;
  confidence: number;
  amount?: number;
}> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 模拟识别结果（实际应该调用AI服务）
  const mockFoods = [
    { name: '米饭', confidence: 0.92, amount: 150 },
    { name: '鸡蛋', confidence: 0.88, amount: 50 },
    { name: '番茄炒蛋', confidence: 0.85, amount: 200 },
    { name: '青菜', confidence: 0.80, amount: 100 },
    { name: '鸡胸肉', confidence: 0.87, amount: 120 },
  ];

  // 随机返回一个结果
  return mockFoods[Math.floor(Math.random() * mockFoods.length)];
}

/**
 * 在数据库中查找匹配的食物
 */
async function findMatchingFoods(foodName: string) {
  // 使用模糊搜索
  const foods = await db.food.findMany({
    where: {
      OR: [
        { name: { contains: foodName } },
        { aliases: { contains: foodName } },
      ],
      verified: true,
    },
    take: 5,
  });

  return foods;
}

/**
 * 获取识别结果
 */
export async function getRecognitionResult(photoId: string) {
  const photo = await db.foodPhoto.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    throw new Error('Photo not found');
  }

  if (photo.recognitionStatus !== RecognitionStatus.COMPLETED) {
    return {
      status: photo.recognitionStatus,
      error: photo.recognitionError,
    };
  }

  const result = JSON.parse(photo.recognitionResult || '{}') as RecognitionResult;

  return {
    status: photo.recognitionStatus,
    confidence: photo.confidence,
    result,
  };
}

/**
 * 手动修正识别结果
 */
export async function correctRecognitionResult(
  photoId: string,
  correctedFoodId: string,
  amount: number
) {
  const photo = await db.foodPhoto.findUnique({
    where: { id: photoId },
    include: {
      mealLog: {
        include: {
          foods: true,
        },
      },
    },
  });

  if (!photo) {
    throw new Error('Photo not found');
  }

  // 如果餐饮记录中还没有这个食物，添加它
  const existingFood = photo.mealLog.foods.find((f) => f.foodId === correctedFoodId);

  if (existingFood) {
    // 更新数量
    await db.mealLogFood.update({
      where: { id: existingFood.id },
      data: { amount },
    });
  } else {
    // 添加新食物
    await db.mealLogFood.create({
      data: {
        mealLogId: photo.mealLogId,
        foodId: correctedFoodId,
        amount,
      },
    });
  }

  // 更新照片的识别结果（标记为已修正）
  const correctedFood = await db.food.findUnique({
    where: { id: correctedFoodId },
  });

  if (correctedFood) {
    const result: RecognitionResult = {
      foodName: correctedFood.name,
      confidence: 1.0, // 手动修正的置信度为100%
      amount,
    };

    await db.foodPhoto.update({
      where: { id: photoId },
      data: {
        recognitionResult: JSON.stringify(result),
        confidence: 1.0,
      },
    });
  }

  return { success: true };
}

/**
 * 批量上传照片
 */
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
      })
    )
  );

  return uploadedPhotos;
}

/**
 * 删除食物照片
 */
export async function deleteFoodPhoto(photoId: string) {
  // TODO: 同时删除存储服务中的文件（Vercel Blob）
  return db.foodPhoto.delete({
    where: { id: photoId },
  });
}

/**
 * 获取餐饮记录的所有照片
 */
export async function getMealLogPhotos(mealLogId: string) {
  return db.foodPhoto.findMany({
    where: { mealLogId },
    orderBy: { createdAt: 'asc' },
  });
}

