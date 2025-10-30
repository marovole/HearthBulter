/**
 * 快速模板管理服务
 * 负责管理用户的餐饮模板、智能推荐和模板使用统计
 */

import { db } from '@/lib/db';
import { MealType } from '@prisma/client';
import { calculateNutritionFromFoods } from './meal-tracker';

/**
 * 创建快速模板
 */
export async function createQuickTemplate(data: {
  memberId: string;
  name: string;
  description?: string;
  mealType: MealType;
  foods: Array<{ foodId: string; amount: number }>;
}) {
  const { memberId, name, description, mealType, foods } = data;

  // 计算模板的营养成分
  const nutrition = await calculateNutritionFromFoods(foods);

  // 创建模板
  const template = await db.quickTemplate.create({
    data: {
      memberId,
      name,
      description,
      mealType,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      foods: {
        create: foods.map((food) => ({
          foodId: food.foodId,
          amount: food.amount,
        })),
      },
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
  });

  return template;
}

/**
 * 从餐饮记录创建模板
 */
export async function createTemplateFromMealLog(
  mealLogId: string,
  templateName: string,
  description?: string
) {
  const mealLog = await db.mealLog.findUnique({
    where: { id: mealLogId },
    include: {
      foods: true,
    },
  });

  if (!mealLog) {
    throw new Error('Meal log not found');
  }

  return createQuickTemplate({
    memberId: mealLog.memberId,
    name: templateName,
    description,
    mealType: mealLog.mealType,
    foods: mealLog.foods.map((f) => ({
      foodId: f.foodId,
      amount: f.amount,
    })),
  });
}

/**
 * 获取成员的模板列表
 */
export async function getQuickTemplates(
  memberId: string,
  mealType?: MealType
) {
  const where: any = {
    memberId,
    deletedAt: null,
  };

  if (mealType) {
    where.mealType = mealType;
  }

  return db.quickTemplate.findMany({
    where,
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
    orderBy: {
      score: 'desc', // 按推荐分数排序
    },
  });
}

/**
 * 获取智能推荐的模板
 */
export async function getRecommendedTemplates(
  memberId: string,
  mealType: MealType,
  limit: number = 3
) {
  const currentHour = new Date().getHours();

  // 根据时间推荐合适的餐食类型
  let recommendedMealType = mealType;
  if (!mealType) {
    if (currentHour >= 6 && currentHour < 10) {
      recommendedMealType = MealType.BREAKFAST;
    } else if (currentHour >= 11 && currentHour < 14) {
      recommendedMealType = MealType.LUNCH;
    } else if (currentHour >= 17 && currentHour < 21) {
      recommendedMealType = MealType.DINNER;
    } else {
      recommendedMealType = MealType.SNACK;
    }
  }

  // 更新所有模板的推荐分数
  await updateTemplateScores(memberId);

  // 获取推荐的模板
  const templates = await db.quickTemplate.findMany({
    where: {
      memberId,
      mealType: recommendedMealType,
      deletedAt: null,
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
    orderBy: {
      score: 'desc',
    },
    take: limit,
  });

  return templates;
}

/**
 * 更新模板推荐分数
 * 分数基于：使用频率、最近使用时间、营养均衡度等
 */
async function updateTemplateScores(memberId: string) {
  const templates = await db.quickTemplate.findMany({
    where: {
      memberId,
      deletedAt: null,
    },
  });

  const now = new Date();

  for (const template of templates) {
    let score = 0;

    // 使用频率分数（0-50分）
    const frequencyScore = Math.min(template.useCount * 5, 50);
    score += frequencyScore;

    // 最近使用时间分数（0-30分）
    if (template.lastUsed) {
      const daysSinceLastUse = Math.floor(
        (now.getTime() - template.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastUse <= 7) {
        score += 30; // 最近一周使用过
      } else if (daysSinceLastUse <= 30) {
        score += 20; // 最近一月使用过
      } else if (daysSinceLastUse <= 90) {
        score += 10; // 最近三月使用过
      }
    }

    // 营养均衡度分数（0-20分）
    // 简单的启发式：蛋白质应占15-25%，碳水40-60%，脂肪20-35%
    const proteinRatio = (template.protein * 4) / template.calories;
    const carbsRatio = (template.carbs * 4) / template.calories;
    const fatRatio = (template.fat * 9) / template.calories;

    let balanceScore = 0;
    if (proteinRatio >= 0.15 && proteinRatio <= 0.25) balanceScore += 7;
    if (carbsRatio >= 0.4 && carbsRatio <= 0.6) balanceScore += 7;
    if (fatRatio >= 0.2 && fatRatio <= 0.35) balanceScore += 6;

    score += balanceScore;

    // 更新分数
    await db.quickTemplate.update({
      where: { id: template.id },
      data: { score },
    });
  }
}

/**
 * 使用模板（记录使用并更新统计）
 */
export async function useTemplate(templateId: string) {
  const template = await db.quickTemplate.findUnique({
    where: { id: templateId },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // 更新使用统计
  await db.quickTemplate.update({
    where: { id: templateId },
    data: {
      useCount: { increment: 1 },
      lastUsed: new Date(),
    },
  });

  return template;
}

/**
 * 更新模板
 */
export async function updateQuickTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    foods?: Array<{ foodId: string; amount: number }>;
  }
) {
  const { name, description, foods } = data;

  let nutrition;
  if (foods) {
    nutrition = await calculateNutritionFromFoods(foods);

    // 删除旧的食物关联
    await db.templateFood.deleteMany({
      where: { templateId },
    });
  }

  const template = await db.quickTemplate.update({
    where: { id: templateId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(nutrition && {
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      }),
      ...(foods && {
        foods: {
          create: foods.map((food) => ({
            foodId: food.foodId,
            amount: food.amount,
          })),
        },
      }),
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
  });

  return template;
}

/**
 * 删除模板（软删除）
 */
export async function deleteQuickTemplate(templateId: string) {
  return db.quickTemplate.update({
    where: { id: templateId },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * 自动从历史记录创建推荐模板
 * 分析用户最常吃的组合，自动生成模板
 */
export async function autoGenerateTemplates(memberId: string) {
  // 获取最近30天的餐饮记录
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const mealLogs = await db.mealLog.findMany({
    where: {
      memberId,
      date: { gte: thirtyDaysAgo },
      deletedAt: null,
    },
    include: {
      foods: true,
    },
  });

  // 按餐食类型分组
  const mealTypeGroups = new Map<MealType, any[]>();
  mealLogs.forEach((log) => {
    const existing = mealTypeGroups.get(log.mealType) || [];
    existing.push(log);
    mealTypeGroups.set(log.mealType, existing);
  });

  const generatedTemplates = [];

  // 为每个餐食类型分析最常见的组合
  for (const [mealType, logs] of mealTypeGroups.entries()) {
    // 统计食物组合出现频率
    const combinationFrequency = new Map<string, {
      count: number;
      foods: Array<{ foodId: string; totalAmount: number; avgAmount: number }>;
    }>();

    logs.forEach((log) => {
      // 将食物ID排序后作为组合的key
      const foodIds = log.foods.map((f) => f.foodId).sort().join(',');
      
      const existing = combinationFrequency.get(foodIds);
      if (existing) {
        existing.count++;
        log.foods.forEach((f) => {
          const foodStat = existing.foods.find((fs) => fs.foodId === f.foodId);
          if (foodStat) {
            foodStat.totalAmount += f.amount;
            foodStat.avgAmount = foodStat.totalAmount / existing.count;
          }
        });
      } else {
        combinationFrequency.set(foodIds, {
          count: 1,
          foods: log.foods.map((f) => ({
            foodId: f.foodId,
            totalAmount: f.amount,
            avgAmount: f.amount,
          })),
        });
      }
    });

    // 找出最常见的组合（出现次数>=3次）
    const topCombinations = Array.from(combinationFrequency.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2); // 每个餐食类型最多生成2个模板

    // 为每个高频组合创建模板
    for (const [_, data] of topCombinations) {
      const mealTypeName = {
        [MealType.BREAKFAST]: '早餐',
        [MealType.LUNCH]: '午餐',
        [MealType.DINNER]: '晚餐',
        [MealType.SNACK]: '加餐',
      }[mealType];

      const templateName = `常吃${mealTypeName} (${data.count}次)`;

      try {
        const template = await createQuickTemplate({
          memberId,
          name: templateName,
          description: `根据您最近${data.count}次的记录自动生成`,
          mealType,
          foods: data.foods.map((f) => ({
            foodId: f.foodId,
            amount: Math.round(f.avgAmount),
          })),
        });

        generatedTemplates.push(template);
      } catch (error) {
        console.error('Failed to create template:', error);
      }
    }
  }

  return generatedTemplates;
}

