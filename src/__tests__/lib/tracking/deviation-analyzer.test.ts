import { 
  analyzeNutritionDeviations,
  calculateTrendDirection,
  detectAnomalyPatterns,
  generateDeviationReport,
  getDeviationSeverity 
} from '@/lib/services/tracking/deviation-analyzer';

describe('Deviation Analyzer', () => {
  const mockNutritionGoals = {
    calories: 2000,
    protein: 120,
    carbs: 250,
    fat: 65
  };

  const mockWeeklyData = [
    { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65 },
    { date: '2024-01-02', calories: 1800, protein: 100, carbs: 240, fat: 60 },
    { date: '2024-01-03', calories: 1600, protein: 80, carbs: 220, fat: 55 },
    { date: '2024-01-04', calories: 1400, protein: 60, carbs: 200, fat: 50 },
    { date: '2024-01-05', calories: 1200, protein: 40, carbs: 180, fat: 45 },
    { date: '2024-01-06', calories: 1000, protein: 20, carbs: 160, fat: 40 },
    { date: '2024-01-07', calories: 800, protein: 10, carbs: 140, fat: 35 }
  ];

  describe('analyzeNutritionDeviations', () => {
    it('should detect consistent protein deficiency', () => {
      const deviations = analyzeNutritionDeviations(mockWeeklyData, mockNutritionGoals);

      const proteinDeviation = deviations.find(d => d.nutrient === 'protein');
      expect(proteinDeviation).toBeDefined();
      expect(proteinDeviation?.type).toBe('DEFICIENCY');
      expect(proteinDeviation?.severity).toBe('HIGH');
      expect(proteinDeviation?.days).toBe(7);
      expect(proteinDeviation?.averageDeviation).toBeLessThan(-50);
    });

    it('should detect calorie deficiency trend', () => {
      const deviations = analyzeNutritionDeviations(mockWeeklyData, mockNutritionGoals);

      const calorieDeviation = deviations.find(d => d.nutrient === 'calories');
      expect(calorieDeviation).toBeDefined();
      expect(calorieDeviation?.type).toBe('DEFICIENCY');
      expect(calorieDeviation?.trend).toBe('WORSENING');
    });

    it('should handle normal nutrition data', () => {
      const normalData = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65 },
        { date: '2024-01-02', calories: 2100, protein: 125, carbs: 260, fat: 68 },
        { date: '2024-01-03', calories: 1900, protein: 115, carbs: 240, fat: 62 }
      ];

      const deviations = analyzeNutritionDeviations(normalData, mockNutritionGoals);

      expect(deviations).toHaveLength(0);
    });

    it('should detect excess nutrition', () => {
      const excessData = [
        { date: '2024-01-01', calories: 2500, protein: 150, carbs: 300, fat: 80 },
        { date: '2024-01-02', calories: 2600, protein: 160, carbs: 320, fat: 85 },
        { date: '2024-01-03', calories: 2400, protein: 140, carbs: 310, fat: 75 }
      ];

      const deviations = analyzeNutritionDeviations(excessData, mockNutritionGoals);

      expect(deviations.length).toBeGreaterThan(0);
      expect(deviations[0].type).toBe('EXCESS');
    });

    it('should handle insufficient data', () => {
      const insufficientData = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65 }
      ];

      const deviations = analyzeNutritionDeviations(insufficientData, mockNutritionGoals);

      expect(deviations).toHaveLength(0);
    });
  });

  describe('calculateTrendDirection', () => {
    it('should detect worsening trend', () => {
      const values = [100, 90, 80, 70, 60];
      const trend = calculateTrendDirection(values);

      expect(trend.direction).toBe('WORSENING');
      expect(trend.slope).toBeLessThan(0);
      expect(trend.strength).toBeGreaterThan(0.8);
    });

    it('should detect improving trend', () => {
      const values = [60, 70, 80, 90, 100];
      const trend = calculateTrendDirection(values);

      expect(trend.direction).toBe('IMPROVING');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.strength).toBeGreaterThan(0.8);
    });

    it('should detect stable trend', () => {
      const values = [100, 102, 98, 101, 99];
      const trend = calculateTrendDirection(values);

      expect(trend.direction).toBe('STABLE');
      expect(Math.abs(trend.slope)).toBeLessThan(5);
    });

    it('should handle insufficient data points', () => {
      const values = [100, 90];
      const trend = calculateTrendDirection(values);

      expect(trend.direction).toBe('STABLE');
      expect(trend.strength).toBe(0);
    });

    it('should handle empty data', () => {
      const trend = calculateTrendDirection([]);

      expect(trend.direction).toBe('STABLE');
      expect(trend.slope).toBe(0);
      expect(trend.strength).toBe(0);
    });
  });

  describe('detectAnomalyPatterns', () => {
    it('should detect weekend overeating pattern', () => {
      const dataWithWeekendPattern = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65 }, // Monday
        { date: '2024-01-02', calories: 2000, protein: 120, carbs: 250, fat: 65 }, // Tuesday
        { date: '2024-01-03', calories: 2000, protein: 120, carbs: 250, fat: 65 }, // Wednesday
        { date: '2024-01-04', calories: 2000, protein: 120, carbs: 250, fat: 65 }, // Thursday
        { date: '2024-01-05', calories: 2000, protein: 120, carbs: 250, fat: 65 }, // Friday
        { date: '2024-01-06', calories: 2800, protein: 140, carbs: 350, fat: 90 }, // Saturday
        { date: '2024-01-07', calories: 3000, protein: 150, carbs: 380, fat: 100 } // Sunday
      ];

      const patterns = detectAnomalyPatterns(dataWithWeekendPattern);

      expect(patterns).toContainEqual({
        type: 'WEEKEND_OVEREATING',
        description: expect.stringContaining('周末'),
        severity: 'MODERATE',
        frequency: 2
      });
    });

    it('should detect meal skipping pattern', () => {
      const mealSkippingData = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65, mealsCount: 3 },
        { date: '2024-01-02', calories: 1200, protein: 80, carbs: 150, fat: 40, mealsCount: 2 },
        { date: '2024-01-03', calories: 2000, protein: 120, carbs: 250, fat: 65, mealsCount: 3 },
        { date: '2024-01-04', calories: 1000, protein: 60, carbs: 120, fat: 30, mealsCount: 1 },
        { date: '2024-01-05', calories: 2000, protein: 120, carbs: 250, fat: 65, mealsCount: 3 }
      ];

      const patterns = detectAnomalyPatterns(mealSkippingData);

      expect(patterns).toContainEqual({
        type: 'MEAL_SKIPPING',
        description: expect.stringContaining('漏餐'),
        severity: 'HIGH',
        frequency: 2
      });
    });

    it('should detect binge eating pattern', () => {
      const bingeEatingData = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65 },
        { date: '2024-01-02', calories: 1800, protein: 100, carbs: 240, fat: 60 },
        { date: '2024-01-03', calories: 4000, protein: 180, carbs: 500, fat: 120 }, // Binge
        { date: '2024-01-04', calories: 1600, protein: 90, carbs: 220, fat: 50 },
        { date: '2024-01-05', calories: 4200, protein: 200, carbs: 550, fat: 130 } // Binge
      ];

      const patterns = detectAnomalyPatterns(bingeEatingData);

      expect(patterns).toContainEqual({
        type: 'BINGE_EATING',
        description: expect.stringContaining('暴饮暴食'),
        severity: 'HIGH',
        frequency: 2
      });
    });

    it('should return no patterns for normal data', () => {
      const normalData = [
        { date: '2024-01-01', calories: 2000, protein: 120, carbs: 250, fat: 65, mealsCount: 3 },
        { date: '2024-01-02', calories: 2100, protein: 125, carbs: 260, fat: 68, mealsCount: 3 },
        { date: '2024-01-03', calories: 1900, protein: 115, carbs: 240, fat: 62, mealsCount: 3 }
      ];

      const patterns = detectAnomalyPatterns(normalData);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('generateDeviationReport', () => {
    it('should generate comprehensive deviation report', () => {
      const deviations = analyzeNutritionDeviations(mockWeeklyData, mockNutritionGoals);
      const patterns = detectAnomalyPatterns(mockWeeklyData);

      const report = generateDeviationReport(deviations, patterns, mockWeeklyData);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('deviations');
      expect(report).toHaveProperty('patterns');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('weeklyStats');

      expect(report.summary.totalDeviations).toBeGreaterThan(0);
      expect(report.summary.severityBreakdown).toHaveProperty('HIGH');
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide specific recommendations based on deviations', () => {
      const deviations = [
        {
          nutrient: 'protein',
          type: 'DEFICIENCY',
          severity: 'HIGH',
          days: 5,
          averageDeviation: -40
        }
      ];

      const report = generateDeviationReport(deviations, [], mockWeeklyData);

      const proteinRecommendations = report.recommendations.filter(r => 
        r.nutrient === 'protein'
      );

      expect(proteinRecommendations.length).toBeGreaterThan(0);
      expect(proteinRecommendations[0].action).toContain('增加蛋白质');
    });

    it('should handle no deviations', () => {
      const report = generateDeviationReport([], [], mockWeeklyData);

      expect(report.summary.totalDeviations).toBe(0);
      expect(report.deviations).toHaveLength(0);
      expect(report.patterns).toHaveLength(0);
      expect(report.recommendations).toContainEqual({
        type: 'MAINTENANCE',
        description: expect.stringContaining('保持'),
        priority: 'LOW'
      });
    });
  });

  describe('getDeviationSeverity', () => {
    it('should classify high severity deviations', () => {
      expect(getDeviationSeverity(-60)).toBe('HIGH');
      expect(getDeviationSeverity(80)).toBe('HIGH');
    });

    it('should classify medium severity deviations', () => {
      expect(getDeviationSeverity(-40)).toBe('MEDIUM');
      expect(getDeviationSeverity(50)).toBe('MEDIUM');
    });

    it('should classify low severity deviations', () => {
      expect(getDeviationSeverity(-20)).toBe('LOW');
      expect(getDeviationSeverity(25)).toBe('LOW');
    });

    it('should classify normal range', () => {
      expect(getDeviationSeverity(-10)).toBe('NORMAL');
      expect(getDeviationSeverity(10)).toBe('NORMAL');
      expect(getDeviationSeverity(0)).toBe('NORMAL');
    });
  });
});
