/**
 * 宏量营养素计算服务
 * 
 * 提供基于健康目标的宏量营养素计算，包括TDEE计算、目标热量调整和每餐营养分配
 */

import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateAge,
  ACTIVITY_FACTORS,
  type GoalType,
} from '@/lib/health-calculations'

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE'

export interface MemberMacroInput {
  weight: number // kg
  height: number // cm
  birthDate: Date
  gender: 'MALE' | 'FEMALE'
  activityLevel: ActivityLevel
  goalType: GoalType
  carbRatio?: number // 默认值由goalType决定
  proteinRatio?: number
  fatRatio?: number
}

export interface DailyMacroTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealMacroTargets {
  breakfast: DailyMacroTargets
  lunch: DailyMacroTargets
  dinner: DailyMacroTargets
  snack: DailyMacroTargets
}

/**
 * 宏量营养素计算服务类
 */
export class MacroCalculator {
  /**
   * 根据目标类型计算默认宏量比例
   */
  static getDefaultMacroRatios(
    goalType: GoalType
  ): { carbRatio: number; proteinRatio: number; fatRatio: number } {
    switch (goalType) {
      case 'LOSE_WEIGHT':
        // 减重：高蛋白、中等碳水、低脂肪
        return { carbRatio: 0.45, proteinRatio: 0.3, fatRatio: 0.25 }
      case 'GAIN_MUSCLE':
        // 增肌：高蛋白、高碳水、中等脂肪
        return { carbRatio: 0.4, proteinRatio: 0.35, fatRatio: 0.25 }
      case 'MAINTAIN':
      case 'IMPROVE_HEALTH':
      default:
        // 维持/健康：均衡比例
        return { carbRatio: 0.5, proteinRatio: 0.2, fatRatio: 0.3 }
    }
  }

  /**
   * 计算成员的TDEE（每日总能量消耗）
   */
  static calculateMemberTDEE(
    weight: number,
    height: number,
    birthDate: Date,
    gender: 'MALE' | 'FEMALE',
    activityLevel: ActivityLevel
  ): number {
    const age = calculateAge(birthDate)
    const bmr = calculateBMR(weight, height, age, gender)
    const activityFactor = ACTIVITY_FACTORS[activityLevel]
    return calculateTDEE(bmr, activityFactor)
  }

  /**
   * 计算目标热量（根据目标类型调整）
   * 减重：TDEE - 400 kcal
   * 增肌：TDEE + 300 kcal
   * 维持：TDEE
   */
  static calculateTargetCalories(
    tdee: number,
    goalType: GoalType
  ): number {
    switch (goalType) {
      case 'LOSE_WEIGHT':
        return Math.round(tdee - 400)
      case 'GAIN_MUSCLE':
        return Math.round(tdee + 300)
      case 'MAINTAIN':
      case 'IMPROVE_HEALTH':
      default:
        return tdee
    }
  }

  /**
   * 计算每日宏量营养素目标
   */
  static calculateDailyMacroTargets(
    targetCalories: number,
    goalType: GoalType,
    customRatios?: {
      carbRatio?: number
      proteinRatio?: number
      fatRatio?: number
    }
  ): DailyMacroTargets {
    const defaultRatios = this.getDefaultMacroRatios(goalType)
    const carbRatio = customRatios?.carbRatio ?? defaultRatios.carbRatio
    const proteinRatio =
      customRatios?.proteinRatio ?? defaultRatios.proteinRatio
    const fatRatio = customRatios?.fatRatio ?? defaultRatios.fatRatio

    const macros = calculateMacroTargets(
      targetCalories,
      carbRatio,
      proteinRatio,
      fatRatio
    )

    return {
      calories: targetCalories,
      ...macros,
    }
  }

  /**
   * 计算每餐的宏量营养素目标
   * 分配比例：早餐30% / 午餐35% / 晚餐25% / 加餐10%
   * 确保每餐蛋白质≥20g
   */
  static calculateMealMacroTargets(
    dailyTargets: DailyMacroTargets
  ): MealMacroTargets {
    const mealRatios = {
      breakfast: 0.3,
      lunch: 0.35,
      dinner: 0.25,
      snack: 0.1,
    }

    const breakfast = {
      calories: Math.round(dailyTargets.calories * mealRatios.breakfast),
      protein: Math.round(dailyTargets.protein * mealRatios.breakfast),
      carbs: Math.round(dailyTargets.carbs * mealRatios.breakfast),
      fat: Math.round(dailyTargets.fat * mealRatios.breakfast),
    }

    const lunch = {
      calories: Math.round(dailyTargets.calories * mealRatios.lunch),
      protein: Math.round(dailyTargets.protein * mealRatios.lunch),
      carbs: Math.round(dailyTargets.carbs * mealRatios.lunch),
      fat: Math.round(dailyTargets.fat * mealRatios.lunch),
    }

    const dinner = {
      calories: Math.round(dailyTargets.calories * mealRatios.dinner),
      protein: Math.round(dailyTargets.protein * mealRatios.dinner),
      carbs: Math.round(dailyTargets.carbs * mealRatios.dinner),
      fat: Math.round(dailyTargets.fat * mealRatios.dinner),
    }

    const snack = {
      calories: Math.round(dailyTargets.calories * mealRatios.snack),
      protein: Math.round(dailyTargets.protein * mealRatios.snack),
      carbs: Math.round(dailyTargets.carbs * mealRatios.snack),
      fat: Math.round(dailyTargets.fat * mealRatios.snack),
    }

    // 确保每餐蛋白质≥20g
    const minProtein = 20
    const meals = [breakfast, lunch, dinner]
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0)
    const remainingProtein = dailyTargets.protein - totalProtein

    // 如果某餐蛋白质不足，从其他餐调整
    meals.forEach((meal) => {
      if (meal.protein < minProtein) {
        const deficit = minProtein - meal.protein
        meal.protein = minProtein
        // 从snack中扣除（如果snack有足够蛋白质）
        if (snack.protein >= deficit) {
          snack.protein -= deficit
        } else {
          // 如果snack不够，从其他餐扣除
          const otherMeals = meals.filter((m) => m !== meal)
          const deficitPerMeal = Math.ceil(deficit / otherMeals.length)
          otherMeals.forEach((m) => {
            m.protein = Math.max(minProtein, m.protein - deficitPerMeal)
          })
        }
      }
    })

    return { breakfast, lunch, dinner, snack }
  }

  /**
   * 计算完整的宏量营养素目标（包括TDEE、每日目标和每餐目标）
   */
  static calculateFullMacroTargets(
    input: MemberMacroInput
  ): {
    tdee: number
    targetCalories: number
    dailyTargets: DailyMacroTargets
    mealTargets: MealMacroTargets
  } {
    const tdee = this.calculateMemberTDEE(
      input.weight,
      input.height,
      input.birthDate,
      input.gender,
      input.activityLevel
    )

    const targetCalories = this.calculateTargetCalories(tdee, input.goalType)

    const dailyTargets = this.calculateDailyMacroTargets(
      targetCalories,
      input.goalType,
      {
        carbRatio: input.carbRatio,
        proteinRatio: input.proteinRatio,
        fatRatio: input.fatRatio,
      }
    )

    const mealTargets = this.calculateMealMacroTargets(dailyTargets)

    return {
      tdee,
      targetCalories,
      dailyTargets,
      mealTargets,
    }
  }
}
