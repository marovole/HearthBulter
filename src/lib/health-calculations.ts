/**
 * Health Calculations Library
 * 健康数据计算工具函数
 */

/**
 * Calculate BMI (Body Mass Index)
 * BMI = weight (kg) / height (m)^2
 */
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    throw new Error("Weight and height must be positive numbers");
  }

  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: "MALE" | "FEMALE",
): number {
  if (weight <= 0 || height <= 0 || age <= 0) {
    throw new Error("Weight, height, and age must be positive numbers");
  }

  const bmr =
    gender === "MALE"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  return Math.round(bmr);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Factor
 */
export function calculateTDEE(bmr: number, activityFactor: number): number {
  if (bmr <= 0 || activityFactor <= 0) {
    throw new Error("BMR and activity factor must be positive numbers");
  }

  return Math.round(bmr * activityFactor);
}

/**
 * Activity Factor Mappings
 */
export const ACTIVITY_FACTORS = {
  SEDENTARY: 1.2, // 久坐 - Little or no exercise
  LIGHT: 1.375, // 轻度活动 - Light exercise 1-3 days/week
  MODERATE: 1.55, // 中度活动 - Moderate exercise 3-5 days/week
  ACTIVE: 1.725, // 高度活动 - Hard exercise 6-7 days/week
  VERY_ACTIVE: 1.9, // 非常活跃 - Very hard exercise, physical job
} as const;

/**
 * Calculate progress towards weight goal
 * Returns progress percentage (0-100)
 */
export function calculateProgress(
  startWeight: number | null,
  currentWeight: number | null,
  targetWeight: number | null,
): number {
  if (!startWeight || !currentWeight || !targetWeight) {
    return 0;
  }

  const totalChange = targetWeight - startWeight;
  const currentChange = currentWeight - startWeight;

  if (totalChange === 0) {
    return 0;
  }

  const progress = (currentChange / totalChange) * 100;

  // Clamp between 0-100
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Determine age group based on age
 */
export function calculateAgeGroup(
  birthDate: Date,
): "CHILD" | "TEENAGER" | "ADULT" | "ELDERLY" {
  const age = calculateAge(birthDate);

  if (age < 12) return "CHILD";
  if (age < 18) return "TEENAGER";
  if (age < 65) return "ADULT";
  return "ELDERLY";
}

/**
 * Calculate daily calorie target based on goal type
 * Returns recommended daily calorie intake
 */
export function calculateCalorieTarget(
  tdee: number,
  goalType: "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "IMPROVE_HEALTH",
): number {
  switch (goalType) {
    case "LOSE_WEIGHT":
      // 500 calorie deficit for ~0.5kg loss per week
      return Math.round(tdee - 500);
    case "GAIN_MUSCLE":
      // 300 calorie surplus for muscle gain
      return Math.round(tdee + 300);
    case "MAINTAIN":
    case "IMPROVE_HEALTH":
      return tdee;
    default:
      return tdee;
  }
}

/**
 * Calculate macronutrient targets in grams
 */
export function calculateMacroTargets(
  calorieTarget: number,
  carbRatio: number,
  proteinRatio: number,
  fatRatio: number,
): {
  carbs: number;
  protein: number;
  fat: number;
} {
  // Validate ratios sum to 1 (or 100%)
  const totalRatio = carbRatio + proteinRatio + fatRatio;
  if (Math.abs(totalRatio - 1) > 0.01) {
    throw new Error("Macronutrient ratios must sum to 1 (100%)");
  }

  // Calories per gram: Carbs=4, Protein=4, Fat=9
  const carbCalories = calorieTarget * carbRatio;
  const proteinCalories = calorieTarget * proteinRatio;
  const fatCalories = calorieTarget * fatRatio;

  return {
    carbs: Math.round(carbCalories / 4),
    protein: Math.round(proteinCalories / 4),
    fat: Math.round(fatCalories / 9),
  };
}

/**
 * Estimate weeks to reach target weight
 * Assumes safe weight loss/gain rate of 0.5-1kg per week
 */
export function estimateWeeksToTarget(
  currentWeight: number,
  targetWeight: number,
  goalType: "LOSE_WEIGHT" | "GAIN_MUSCLE",
): number {
  const weightDifference = Math.abs(targetWeight - currentWeight);

  // Safe rate: 0.5kg per week
  const weeksNeeded = weightDifference / 0.5;

  return Math.ceil(weeksNeeded);
}
