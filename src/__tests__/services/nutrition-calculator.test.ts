/**
 * 营养计算服务测试
 */

import {
  calculateDailyMacros,
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  calculateIdealWeight,
  getNutrientRecommendations,
  calculateMealMacros,
} from "@/lib/services/health-calculator";

describe("Nutrition Calculator Service", () => {
  describe("calculateDailyMacros", () => {
    it("should calculate macros for weight loss goal", () => {
      const result = calculateDailyMacros({
        weight: 70, // kg
        height: 175, // cm
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "weight_loss",
      });

      expect(result).toHaveProperty("calories");
      expect(result).toHaveProperty("protein");
      expect(result).toHaveProperty("carbs");
      expect(result).toHaveProperty("fat");

      // Weight loss should have calorie deficit
      expect(result.calories).toBeGreaterThan(0);
      expect(result.calories).toBeLessThan(2500);

      // Macros should be in reasonable ranges
      expect(result.protein).toBeGreaterThan(50);
      expect(result.carbs).toBeGreaterThan(50);
      expect(result.fat).toBeGreaterThan(20);
    });

    it("should calculate macros for muscle gain goal", () => {
      const result = calculateDailyMacros({
        weight: 70,
        height: 175,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "muscle_gain",
      });

      // Muscle gain should have calorie surplus
      expect(result.calories).toBeGreaterThan(2000);

      // Higher protein for muscle gain
      expect(result.protein).toBeGreaterThan(100);
    });

    it("should handle different activity levels", () => {
      const sedentary = calculateDailyMacros({
        weight: 70,
        height: 175,
        age: 30,
        gender: "male",
        activityLevel: "sedentary",
        goal: "maintain",
      });

      const active = calculateDailyMacros({
        weight: 70,
        height: 175,
        age: 30,
        gender: "male",
        activityLevel: "very_active",
        goal: "maintain",
      });

      expect(active.calories).toBeGreaterThan(sedentary.calories);
    });

    it("should handle invalid input gracefully", () => {
      expect(() =>
        calculateDailyMacros({
          weight: 0,
          height: 175,
          age: 30,
          gender: "male",
          activityLevel: "moderate",
          goal: "maintain",
        }),
      ).toThrow();

      expect(() =>
        calculateDailyMacros({
          weight: 70,
          height: 0,
          age: 30,
          gender: "male",
          activityLevel: "moderate",
          goal: "maintain",
        }),
      ).toThrow();
    });
  });

  describe("calculateBMR", () => {
    it("should calculate BMR for males using Mifflin-St Jeor equation", () => {
      const bmr = calculateBMR({
        weight: 70,
        height: 175,
        age: 30,
        gender: "male",
      });

      // Mifflin-St Jeor: BMR = 10 * weight + 6.25 * height - 5 * age + 5 (male)
      const expected = 10 * 70 + 6.25 * 175 - 5 * 30 + 5;
      expect(bmr).toBeCloseTo(expected, 0);
    });

    it("should calculate BMR for females", () => {
      const bmr = calculateBMR({
        weight: 60,
        height: 165,
        age: 25,
        gender: "female",
      });

      // Mifflin-St Jeor: BMR = 10 * weight + 6.25 * height - 5 * age - 161 (female)
      const expected = 10 * 60 + 6.25 * 165 - 5 * 25 - 161;
      expect(bmr).toBeCloseTo(expected, 0);
    });
  });

  describe("calculateTDEE", () => {
    it("should calculate TDEE with different activity multipliers", () => {
      const bmr = 1500;

      const sedentary = calculateTDEE(bmr, "sedentary");
      const light = calculateTDEE(bmr, "light");
      const moderate = calculateTDEE(bmr, "moderate");
      const active = calculateTDEE(bmr, "active");
      const veryActive = calculateTDEE(bmr, "very_active");

      expect(sedentary).toBeCloseTo(bmr * 1.2, 0);
      expect(light).toBeCloseTo(bmr * 1.375, 0);
      expect(moderate).toBeCloseTo(bmr * 1.55, 0);
      expect(active).toBeCloseTo(bmr * 1.725, 0);
      expect(veryActive).toBeCloseTo(bmr * 1.9, 0);
    });
  });

  describe("calculateBMI", () => {
    it("should calculate BMI correctly", () => {
      const bmi = calculateBMI(70, 175); // 70kg, 175cm
      expect(bmi).toBeCloseTo(22.86, 2); // 70 / (1.75^2)
    });

    it("should handle edge cases", () => {
      expect(calculateBMI(50, 160)).toBeCloseTo(19.53, 2);
      expect(calculateBMI(90, 180)).toBeCloseTo(27.78, 2);
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateBMI(0, 175)).toThrow();
      expect(() => calculateBMI(70, 0)).toThrow();
      expect(() => calculateBMI(-10, 175)).toThrow();
    });
  });

  describe("calculateIdealWeight", () => {
    it("should calculate ideal weight using Devine formula", () => {
      const maleWeight = calculateIdealWeight(175, "male");
      const femaleWeight = calculateIdealWeight(165, "female");

      // Devine formula: 50kg + 2.3kg per inch over 5ft for males
      // 45.5kg + 2.3kg per inch over 5ft for females
      expect(maleWeight).toBeGreaterThan(60);
      expect(femaleWeight).toBeGreaterThan(45);
      expect(maleWeight).toBeGreaterThan(femaleWeight);
    });
  });

  describe("getNutrientRecommendations", () => {
    it("should provide recommendations based on profile", () => {
      const recommendations = getNutrientRecommendations({
        age: 30,
        gender: "male",
        weight: 70,
        height: 175,
        activityLevel: "moderate",
        goal: "maintain",
      });

      expect(recommendations).toHaveProperty("calories");
      expect(recommendations).toHaveProperty("protein");
      expect(recommendations).toHaveProperty("carbs");
      expect(recommendations).toHaveProperty("fat");
      expect(recommendations).toHaveProperty("fiber");
      expect(recommendations).toHaveProperty("water");

      // Should be within healthy ranges
      expect(recommendations.calories).toBeGreaterThan(1800);
      expect(recommendations.calories).toBeLessThan(3000);
      expect(recommendations.protein).toBeGreaterThan(50);
      expect(recommendations.protein).toBeLessThan(200);
      expect(recommendations.fiber).toBeGreaterThan(25);
      expect(recommendations.fiber).toBeLessThan(40);
    });

    it("should adjust recommendations for different goals", () => {
      const maintain = getNutrientRecommendations({
        age: 30,
        gender: "male",
        weight: 70,
        height: 175,
        activityLevel: "moderate",
        goal: "maintain",
      });

      const weightLoss = getNutrientRecommendations({
        age: 30,
        gender: "male",
        weight: 70,
        height: 175,
        activityLevel: "moderate",
        goal: "weight_loss",
      });

      expect(weightLoss.calories).toBeLessThan(maintain.calories);
      expect(weightLoss.protein).toBeGreaterThanOrEqual(maintain.protein);
    });
  });

  describe("calculateMealMacros", () => {
    it("should distribute daily macros across meals", () => {
      const dailyMacros = {
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
      };

      const mealPlan = calculateMealMacros(dailyMacros, 3);

      expect(mealPlan).toHaveLength(3);

      // Check that totals match daily targets
      const totalCalories = mealPlan.reduce(
        (sum, meal) => sum + meal.calories,
        0,
      );
      const totalProtein = mealPlan.reduce(
        (sum, meal) => sum + meal.protein,
        0,
      );
      const totalCarbs = mealPlan.reduce((sum, meal) => sum + meal.carbs, 0);
      const totalFat = mealPlan.reduce((sum, meal) => sum + meal.fat, 0);

      expect(totalCalories).toBeCloseTo(dailyMacros.calories, 0);
      expect(totalProtein).toBeCloseTo(dailyMacros.protein, 0);
      expect(totalCarbs).toBeCloseTo(dailyMacros.carbs, 0);
      expect(totalFat).toBeCloseTo(dailyMacros.fat, 0);
    });

    it("should handle different meal distributions", () => {
      const dailyMacros = {
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
      };

      const threeMeals = calculateMealMacros(dailyMacros, 3);
      const fiveMeals = calculateMealMacros(dailyMacros, 5);

      expect(threeMeals).toHaveLength(3);
      expect(fiveMeals).toHaveLength(5);

      // Five meals should have smaller portions per meal
      const avgThreeMealCalories = threeMeals[0].calories;
      const avgFiveMealCalories = fiveMeals[0].calories;
      expect(avgFiveMealCalories).toBeLessThan(avgThreeMealCalories);
    });
  });
});
