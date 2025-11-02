/**
 * 健康计算服务
 *
 * 提供基础的健康指标计算功能
 */

export interface MacroGoals {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

export interface UserProfile {
  weight: number;      // kg
  height: number;      // cm
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'weight_loss' | 'muscle_gain' | 'maintain';
}

export interface NutrientRecommendations extends MacroGoals {
  fiber: number;    // grams
  water: number;    // liters
  sodium?: number;  // mg
}

export interface MealMacro {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * 计算基础代谢率 (BMR) - Mifflin-St Jeor 公式
 */
export function calculateBMR(profile: Pick<UserProfile, 'weight' | 'height' | 'age' | 'gender'>): number {
  const { weight, height, age, gender } = profile;

  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * 计算每日总能量消耗 (TDEE)
 */
export function calculateTDEE(bmr: number, activityLevel: UserProfile['activityLevel']): number {
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  return bmr * activityMultipliers[activityLevel];
}

/**
 * 计算身体质量指数 (BMI)
 */
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    throw new Error('Weight and height must be positive numbers');
  }

  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * 计算理想体重 - Devine 公式
 */
export function calculateIdealWeight(height: number, gender: 'male' | 'female'): number {
  const heightInInches = (height * 0.393701) - 60; // Convert to inches and subtract 5 feet

  if (gender === 'male') {
    return 50 + 2.3 * heightInInches;
  } else {
    return 45.5 + 2.3 * heightInInches;
  }
}

/**
 * 计算每日宏量营养素目标
 */
export function calculateDailyMacros(profile: UserProfile): MacroGoals {
  // Input validation
  if (profile.weight <= 0 || profile.height <= 0 || profile.age <= 0) {
    throw new Error('Weight, height, and age must be positive numbers');
  }

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  let targetCalories = tdee;

  // 根据目标调整卡路里
  switch (profile.goal) {
    case 'weight_loss':
      targetCalories = tdee * 0.85; // 15% deficit
      break;
    case 'muscle_gain':
      targetCalories = tdee * 1.1; // 10% surplus
      break;
    case 'maintain':
    default:
      targetCalories = tdee;
  }

  // 蛋白质需求 (g/kg body weight)
  let proteinPerKg = 1.2; // maintenance
  if (profile.goal === 'muscle_gain') {
    proteinPerKg = 1.8;
  } else if (profile.goal === 'weight_loss') {
    proteinPerKg = 1.6;
  }

  const protein = profile.weight * proteinPerKg;

  // 脂肪占总卡路里的 20-35%
  let fatPercentage = 0.25;
  if (profile.goal === 'weight_loss') {
    fatPercentage = 0.30;
  } else if (profile.goal === 'muscle_gain') {
    fatPercentage = 0.20;
  }

  const fatCalories = targetCalories * fatPercentage;
  const fat = fatCalories / 9; // 9 calories per gram of fat

  // 碳水化合物填充剩余卡路里
  const proteinCalories = protein * 4; // 4 calories per gram of protein
  const carbsCalories = targetCalories - proteinCalories - fatCalories;
  const carbs = carbsCalories / 4; // 4 calories per gram of carb

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
}

/**
 * 获取营养素推荐摄入量
 */
export function getNutrientRecommendations(profile: UserProfile): NutrientRecommendations {
  const macros = calculateDailyMacros(profile);

  // 纤维推荐 (14g per 1000 calories)
  const fiber = Math.max(25, Math.round((macros.calories / 1000) * 14));

  // 水分推荐 (30-35ml per kg body weight)
  const water = Math.round((profile.weight * 0.032) * 10) / 10; // Round to 1 decimal place

  // 钠推荐 (WHO: <2000mg per day)
  const sodium = profile.goal === 'weight_loss' ? 1500 : 2000;

  return {
    ...macros,
    fiber,
    water,
    sodium
  };
}

/**
 * 将每日宏量营养素分配到各餐
 */
export function calculateMealMacros(dailyMacros: MacroGoals, mealCount: number): MealMacro[] {
  const meals: MealMacro[] = [];

  // 默认分配比例
  let distributions: number[];

  switch (mealCount) {
    case 3:
      distributions = [0.35, 0.35, 0.30]; // 早餐、午餐、晚餐
      break;
    case 4:
      distributions = [0.25, 0.30, 0.30, 0.15]; // 早餐、午餐、晚餐、加餐
      break;
    case 5:
      distributions = [0.20, 0.25, 0.30, 0.15, 0.10]; // 早餐、上午加餐、午餐、下午加餐、晚餐
      break;
    default:
      // 平均分配
      const equalShare = 1 / mealCount;
      distributions = Array(mealCount).fill(equalShare);
  }

  for (let i = 0; i < mealCount; i++) {
    const distribution = distributions[i];
    meals.push({
      calories: Math.round(dailyMacros.calories * distribution),
      protein: Math.round(dailyMacros.protein * distribution),
      carbs: Math.round(dailyMacros.carbs * distribution),
      fat: Math.round(dailyMacros.fat * distribution)
    });
  }

  // 调整最后一餐以匹配总量
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

  if (meals.length > 0) {
    meals[meals.length - 1].calories += dailyMacros.calories - totalCalories;
    meals[meals.length - 1].protein += dailyMacros.protein - totalProtein;
    meals[meals.length - 1].carbs += dailyMacros.carbs - totalCarbs;
    meals[meals.length - 1].fat += dailyMacros.fat - totalFat;
  }

  return meals;
}