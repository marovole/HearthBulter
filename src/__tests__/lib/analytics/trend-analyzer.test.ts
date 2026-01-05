import { describe, test, expect } from "@jest/globals";
import {
  calculateStatistics,
  calculateMovingAverage,
  calculateLinearRegression,
  predictFutureTrend,
  calculatePeriodComparison,
} from "@/lib/services/analytics/trend-analyzer";

describe("Trend Analyzer", () => {
  describe("calculateStatistics", () => {
    test("should calculate correct statistics", () => {
      const dataPoints = [
        { date: new Date(), value: 70 },
        { date: new Date(), value: 72 },
        { date: new Date(), value: 71 },
        { date: new Date(), value: 73 },
        { date: new Date(), value: 69 },
      ];

      const stats = calculateStatistics(dataPoints);

      expect(stats.mean).toBeCloseTo(71, 1);
      expect(stats.min).toBe(69);
      expect(stats.max).toBe(73);
      expect(stats.median).toBe(71);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    test("should handle empty data", () => {
      const stats = calculateStatistics([]);
      expect(stats.mean).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
    });
  });

  describe("calculateMovingAverage", () => {
    test("should calculate 3-day moving average", () => {
      const dataPoints = [
        { date: new Date("2024-01-01"), value: 10 },
        { date: new Date("2024-01-02"), value: 20 },
        { date: new Date("2024-01-03"), value: 30 },
        { date: new Date("2024-01-04"), value: 40 },
      ];

      const smoothed = calculateMovingAverage(dataPoints, 3);

      expect(smoothed).toHaveLength(2);
      expect(smoothed[0].value).toBe(20); // (10+20+30)/3
      expect(smoothed[1].value).toBe(30); // (20+30+40)/3
    });

    test("should return original data when insufficient points", () => {
      const dataPoints = [
        { date: new Date(), value: 10 },
        { date: new Date(), value: 20 },
      ];

      const smoothed = calculateMovingAverage(dataPoints, 5);
      expect(smoothed).toEqual(dataPoints);
    });
  });

  describe("calculateLinearRegression", () => {
    test("should detect upward trend", () => {
      const dataPoints = [
        { date: new Date("2024-01-01"), value: 10 },
        { date: new Date("2024-01-02"), value: 20 },
        { date: new Date("2024-01-03"), value: 30 },
        { date: new Date("2024-01-04"), value: 40 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      expect(regression.direction).toBe("UP");
      expect(regression.slope).toBeGreaterThan(0);
      expect(regression.rSquared).toBeGreaterThan(0.9); // Strong fit
    });

    test("should detect downward trend", () => {
      const dataPoints = [
        { date: new Date("2024-01-01"), value: 40 },
        { date: new Date("2024-01-02"), value: 30 },
        { date: new Date("2024-01-03"), value: 20 },
        { date: new Date("2024-01-04"), value: 10 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      expect(regression.direction).toBe("DOWN");
      expect(regression.slope).toBeLessThan(0);
    });

    test("should detect stable trend", () => {
      const dataPoints = [
        { date: new Date("2024-01-01"), value: 50 },
        { date: new Date("2024-01-02"), value: 50.001 },
        { date: new Date("2024-01-03"), value: 49.999 },
        { date: new Date("2024-01-04"), value: 50 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      expect(regression.direction).toBe("STABLE");
    });
  });

  describe("predictFutureTrend", () => {
    test("should predict future values", () => {
      const dataPoints = [
        { date: new Date("2024-01-01"), value: 10 },
        { date: new Date("2024-01-02"), value: 20 },
        { date: new Date("2024-01-03"), value: 30 },
      ];

      const predictions = predictFutureTrend(dataPoints, 3);

      expect(predictions).toHaveLength(3);
      expect(predictions[0].value).toBeGreaterThan(30);
      expect(predictions[1].value).toBeGreaterThan(predictions[0].value);
    });

    test("should return empty array for insufficient data", () => {
      const dataPoints = [{ date: new Date(), value: 10 }];
      const predictions = predictFutureTrend(dataPoints, 3);
      expect(predictions).toHaveLength(0);
    });
  });

  describe("calculatePeriodComparison", () => {
    test("should detect increase", () => {
      const current = [
        { date: new Date(), value: 80 },
        { date: new Date(), value: 85 },
        { date: new Date(), value: 90 },
      ];
      const previous = [
        { date: new Date(), value: 70 },
        { date: new Date(), value: 75 },
        { date: new Date(), value: 80 },
      ];

      const comparison = calculatePeriodComparison(current, previous);

      expect(comparison).not.toBeNull();
      expect(comparison?.changeType).toBe("INCREASE");
      expect(comparison?.changePercent).toBeGreaterThan(0);
    });

    test("should detect decrease", () => {
      const current = [
        { date: new Date(), value: 70 },
        { date: new Date(), value: 75 },
      ];
      const previous = [
        { date: new Date(), value: 80 },
        { date: new Date(), value: 85 },
      ];

      const comparison = calculatePeriodComparison(current, previous);

      expect(comparison).not.toBeNull();
      expect(comparison?.changeType).toBe("DECREASE");
    });

    test("should return null for empty data", () => {
      const comparison = calculatePeriodComparison([], []);
      expect(comparison).toBeNull();
    });
  });
});
