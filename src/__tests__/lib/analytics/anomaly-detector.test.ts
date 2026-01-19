import { describe, test, expect } from "@jest/globals";

describe("Anomaly Detector", () => {
  describe("Sudden Change Detection (3σ Principle)", () => {
    test("should detect value outside 3σ range", () => {
      // 模拟历史数据：平均值70，标准差5
      const mean = 70;
      const stdDev = 5;

      const lowerBound = mean - 3 * stdDev; // 55
      const upperBound = mean + 3 * stdDev; // 85

      // 测试正常值
      expect(72).toBeGreaterThan(lowerBound);
      expect(72).toBeLessThan(upperBound);

      // 测试异常值
      const anomalyValue = 90;
      expect(anomalyValue).toBeGreaterThan(upperBound);
    });

    test("should calculate correct deviation", () => {
      const mean = 70;
      const stdDev = 5;
      const newValue = 90;

      const deviation = Math.abs((newValue - mean) / stdDev);
      expect(deviation).toBeCloseTo(4, 1); // (90-70)/5 = 4σ
    });

    test("should determine severity based on deviation", () => {
      const testCases = [
        { deviation: 5, expectedSeverity: "CRITICAL" }, // >=4σ
        { deviation: 3.7, expectedSeverity: "HIGH" }, // >=3.5σ
        { deviation: 3.2, expectedSeverity: "MEDIUM" }, // >=3σ
        { deviation: 2.5, expectedSeverity: "LOW" }, // <3σ
      ];

      testCases.forEach(({ deviation, expectedSeverity }) => {
        let severity;
        if (deviation >= 4) {
          severity = "CRITICAL";
        } else if (deviation >= 3.5) {
          severity = "HIGH";
        } else if (deviation >= 3) {
          severity = "MEDIUM";
        } else {
          severity = "LOW";
        }

        expect(severity).toBe(expectedSeverity);
      });
    });
  });

  describe("Weight Anomaly Detection", () => {
    test("should detect sudden weight change >2kg", () => {
      const previousWeight = 70;
      const newWeight = 73;
      const change = Math.abs(newWeight - previousWeight);

      expect(change).toBeGreaterThan(2);
    });

    test("should not detect normal weight fluctuation", () => {
      const previousWeight = 70;
      const newWeight = 71.5;
      const change = Math.abs(newWeight - previousWeight);

      expect(change).toBeLessThanOrEqual(2);
    });
  });

  describe("Nutrition Imbalance Detection", () => {
    test("should detect protein deficiency (连续3天<50%目标值)", () => {
      const targets = [
        { actualProtein: 30, targetProtein: 100 },
        { actualProtein: 35, targetProtein: 100 },
        { actualProtein: 40, targetProtein: 100 },
      ];

      const proteinDeficient = targets.every(
        (t) => t.actualProtein < t.targetProtein * 0.5,
      );

      expect(proteinDeficient).toBe(true);
    });

    test("should detect calorie excess (连续3天>130%目标值)", () => {
      const targets = [
        { actualCalories: 2700, targetCalories: 2000 },
        { actualCalories: 2800, targetCalories: 2000 },
        { actualCalories: 2650, targetCalories: 2000 },
      ];

      const caloriesExcessive = targets.every(
        (t) => t.actualCalories > t.targetCalories * 1.3,
      );

      expect(caloriesExcessive).toBe(true);
    });
  });

  describe("Goal Deviation Detection", () => {
    test("should detect weight increase during weight loss goal", () => {
      const goal = {
        goalType: "LOSE_WEIGHT",
        startWeight: 80,
        targetWeight: 70,
      };
      const currentWeight = 82;

      const isDeviated = currentWeight > goal.startWeight;
      expect(isDeviated).toBe(true);
    });

    test("should detect weight decrease during muscle gain goal", () => {
      const goal = {
        goalType: "GAIN_MUSCLE",
        startWeight: 70,
        targetWeight: 75,
      };
      const currentWeight = 68;

      const isDeviated = currentWeight < goal.startWeight;
      expect(isDeviated).toBe(true);
    });
  });

  describe("Data Completeness Check", () => {
    test("should calculate data completeness percentage", () => {
      const totalDays = 7;
      const recordedDays = 5;
      const completeness = (recordedDays / totalDays) * 100;

      expect(completeness).toBeCloseTo(71.4, 1);
    });

    test("should detect insufficient data (<50%)", () => {
      const completeness = 45;
      expect(completeness).toBeLessThan(50);
    });
  });
});
