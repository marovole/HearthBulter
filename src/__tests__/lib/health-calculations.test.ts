/**
 * Health Calculations Tests
 * Unit tests for health-related calculation functions
 */

import {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateProgress,
  calculateAge,
  calculateAgeGroup,
  calculateCalorieTarget,
  calculateMacroTargets,
  estimateWeeksToTarget,
  ACTIVITY_FACTORS,
} from "@/lib/health-calculations";

describe("Health Calculations", () => {
  describe("calculateBMI", () => {
    it("should calculate BMI correctly for normal values", () => {
      // 70kg, 175cm => BMI = 70 / (1.75^2) = 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("should calculate BMI for overweight range", () => {
      // 90kg, 175cm => BMI = 90 / (1.75^2) = 29.4
      expect(calculateBMI(90, 175)).toBe(29.4);
    });

    it("should calculate BMI for underweight range", () => {
      // 50kg, 175cm => BMI = 50 / (1.75^2) = 16.3
      expect(calculateBMI(50, 175)).toBe(16.3);
    });

    it("should throw error for zero or negative weight", () => {
      expect(() => calculateBMI(0, 175)).toThrow();
      expect(() => calculateBMI(-10, 175)).toThrow();
    });

    it("should throw error for zero or negative height", () => {
      expect(() => calculateBMI(70, 0)).toThrow();
      expect(() => calculateBMI(70, -10)).toThrow();
    });
  });

  describe("calculateBMR", () => {
    it("should calculate BMR correctly for adult male", () => {
      // Weight: 70kg, Height: 175cm, Age: 30, Gender: MALE
      // BMR = 10×70 + 6.25×175 - 5×30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 ≈ 1649
      expect(calculateBMR(70, 175, 30, "MALE")).toBe(1649);
    });

    it("should calculate BMR correctly for adult female", () => {
      // Weight: 60kg, Height: 165cm, Age: 28, Gender: FEMALE
      // BMR = 10×60 + 6.25×165 - 5×28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 ≈ 1330
      expect(calculateBMR(60, 165, 28, "FEMALE")).toBe(1330);
    });

    it("should calculate different BMR for male vs female with same stats", () => {
      const maleBMR = calculateBMR(70, 175, 30, "MALE");
      const femaleBMR = calculateBMR(70, 175, 30, "FEMALE");

      expect(maleBMR).toBeGreaterThan(femaleBMR);
      expect(maleBMR - femaleBMR).toBe(166); // Difference should be 166
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateBMR(0, 175, 30, "MALE")).toThrow();
      expect(() => calculateBMR(70, 0, 30, "MALE")).toThrow();
      expect(() => calculateBMR(70, 175, 0, "MALE")).toThrow();
    });
  });

  describe("calculateTDEE", () => {
    it("should calculate TDEE correctly for sedentary activity", () => {
      const bmr = 1649;
      const tdee = calculateTDEE(bmr, ACTIVITY_FACTORS.SEDENTARY);

      expect(tdee).toBe(1979); // 1649 × 1.2 = 1978.8 ≈ 1979
    });

    it("should calculate TDEE correctly for moderate activity", () => {
      const bmr = 1649;
      const tdee = calculateTDEE(bmr, ACTIVITY_FACTORS.MODERATE);

      expect(tdee).toBe(2556); // 1649 × 1.55 = 2555.95 ≈ 2556
    });

    it("should calculate TDEE correctly for very active", () => {
      const bmr = 1649;
      const tdee = calculateTDEE(bmr, ACTIVITY_FACTORS.VERY_ACTIVE);

      expect(tdee).toBe(3133); // 1649 × 1.9 = 3133.1 ≈ 3133
    });

    it("should throw error for invalid inputs", () => {
      expect(() => calculateTDEE(0, 1.5)).toThrow();
      expect(() => calculateTDEE(1649, 0)).toThrow();
    });
  });

  describe("calculateProgress", () => {
    it("should calculate progress correctly for weight loss goal", () => {
      // Start: 80kg, Current: 75kg, Target: 70kg
      // Progress: (75-80) / (70-80) = -5 / -10 = 50%
      expect(calculateProgress(80, 75, 70)).toBe(50);
    });

    it("should calculate progress correctly for weight gain goal", () => {
      // Start: 60kg, Current: 65kg, Target: 70kg
      // Progress: (65-60) / (70-60) = 5 / 10 = 50%
      expect(calculateProgress(60, 65, 70)).toBe(50);
    });

    it("should return 100% when target is reached", () => {
      expect(calculateProgress(80, 70, 70)).toBe(100);
    });

    it("should return 0% when no progress made", () => {
      expect(calculateProgress(80, 80, 70)).toBe(0);
    });

    it("should cap progress at 100% if exceeded", () => {
      // Overshot target
      expect(calculateProgress(80, 65, 70)).toBe(100);
    });

    it("should return 0 for null values", () => {
      expect(calculateProgress(null, 75, 70)).toBe(0);
      expect(calculateProgress(80, null, 70)).toBe(0);
      expect(calculateProgress(80, 75, null)).toBe(0);
    });

    it("should return 0 when start equals target", () => {
      expect(calculateProgress(70, 70, 70)).toBe(0);
    });
  });

  describe("calculateAge", () => {
    it("should calculate age correctly", () => {
      const birthDate = new Date("1990-01-01");
      const age = calculateAge(birthDate);

      // Age depends on current date, so we check it's reasonable
      expect(age).toBeGreaterThanOrEqual(33);
      expect(age).toBeLessThanOrEqual(35);
    });

    it("should handle birthday not yet occurred this year", () => {
      const today = new Date();
      const nextMonthBirthDate = new Date(
        today.getFullYear() - 30,
        today.getMonth() + 1,
        1,
      );

      const age = calculateAge(nextMonthBirthDate);
      expect(age).toBe(29); // Not 30 yet
    });
  });

  describe("calculateAgeGroup", () => {
    it("should classify child correctly", () => {
      const childBirthDate = new Date();
      childBirthDate.setFullYear(childBirthDate.getFullYear() - 8);

      expect(calculateAgeGroup(childBirthDate)).toBe("CHILD");
    });

    it("should classify teenager correctly", () => {
      const teenBirthDate = new Date();
      teenBirthDate.setFullYear(teenBirthDate.getFullYear() - 15);

      expect(calculateAgeGroup(teenBirthDate)).toBe("TEENAGER");
    });

    it("should classify adult correctly", () => {
      const adultBirthDate = new Date();
      adultBirthDate.setFullYear(adultBirthDate.getFullYear() - 30);

      expect(calculateAgeGroup(adultBirthDate)).toBe("ADULT");
    });

    it("should classify elderly correctly", () => {
      const elderlyBirthDate = new Date();
      elderlyBirthDate.setFullYear(elderlyBirthDate.getFullYear() - 70);

      expect(calculateAgeGroup(elderlyBirthDate)).toBe("ELDERLY");
    });

    it("should handle edge cases correctly", () => {
      const birthDate11 = new Date();
      birthDate11.setFullYear(birthDate11.getFullYear() - 11);
      expect(calculateAgeGroup(birthDate11)).toBe("CHILD");

      const birthDate12 = new Date();
      birthDate12.setFullYear(birthDate12.getFullYear() - 12);
      expect(calculateAgeGroup(birthDate12)).toBe("TEENAGER");

      const birthDate18 = new Date();
      birthDate18.setFullYear(birthDate18.getFullYear() - 18);
      expect(calculateAgeGroup(birthDate18)).toBe("ADULT");

      const birthDate65 = new Date();
      birthDate65.setFullYear(birthDate65.getFullYear() - 65);
      expect(calculateAgeGroup(birthDate65)).toBe("ELDERLY");
    });
  });

  describe("calculateCalorieTarget", () => {
    const tdee = 2500;

    it("should calculate calorie deficit for weight loss", () => {
      expect(calculateCalorieTarget(tdee, "LOSE_WEIGHT")).toBe(2000); // -500
    });

    it("should calculate calorie surplus for muscle gain", () => {
      expect(calculateCalorieTarget(tdee, "GAIN_MUSCLE")).toBe(2800); // +300
    });

    it("should maintain calories for MAINTAIN goal", () => {
      expect(calculateCalorieTarget(tdee, "MAINTAIN")).toBe(2500);
    });

    it("should maintain calories for IMPROVE_HEALTH goal", () => {
      expect(calculateCalorieTarget(tdee, "IMPROVE_HEALTH")).toBe(2500);
    });
  });

  describe("calculateMacroTargets", () => {
    it("should calculate macros correctly for balanced diet", () => {
      const calorieTarget = 2000;
      const macros = calculateMacroTargets(calorieTarget, 0.5, 0.2, 0.3);

      expect(macros.carbs).toBe(250); // 2000 × 0.5 / 4 = 250g
      expect(macros.protein).toBe(100); // 2000 × 0.2 / 4 = 100g
      expect(macros.fat).toBe(67); // 2000 × 0.3 / 9 = 66.67 ≈ 67g
    });

    it("should calculate macros for high protein diet", () => {
      const calorieTarget = 2000;
      const macros = calculateMacroTargets(calorieTarget, 0.4, 0.35, 0.25);

      expect(macros.carbs).toBe(200); // 2000 × 0.4 / 4 = 200g
      expect(macros.protein).toBe(175); // 2000 × 0.35 / 4 = 175g
      expect(macros.fat).toBe(56); // 2000 × 0.25 / 9 = 55.56 ≈ 56g
    });

    it("should throw error if ratios do not sum to 1", () => {
      expect(() => calculateMacroTargets(2000, 0.5, 0.3, 0.3)).toThrow();
      expect(() => calculateMacroTargets(2000, 0.3, 0.3, 0.3)).toThrow();
    });

    it("should accept ratios that sum to very close to 1", () => {
      // Allow small floating point errors
      expect(() => calculateMacroTargets(2000, 0.5, 0.2, 0.3)).not.toThrow();
    });
  });

  describe("estimateWeeksToTarget", () => {
    it("should estimate weeks correctly for 5kg weight loss", () => {
      expect(estimateWeeksToTarget(75, 70, "LOSE_WEIGHT")).toBe(10);
    });

    it("should estimate weeks correctly for 10kg weight loss", () => {
      expect(estimateWeeksToTarget(80, 70, "LOSE_WEIGHT")).toBe(20);
    });

    it("should estimate weeks correctly for 5kg muscle gain", () => {
      expect(estimateWeeksToTarget(65, 70, "GAIN_MUSCLE")).toBe(10);
    });

    it("should round up partial weeks", () => {
      // 3kg difference = 6 weeks, but any remainder rounds up
      expect(estimateWeeksToTarget(73, 70, "LOSE_WEIGHT")).toBe(6);
    });
  });
});
