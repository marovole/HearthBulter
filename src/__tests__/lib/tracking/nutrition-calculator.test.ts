import { 
  calculateDailyNutrition, 
  calculateNutritionProgress, 
  calculateWeeklyAverage,
  detectNutritionDeficiencies,
  calculateRemainingMealsNutrition 
} from '@/lib/services/tracking/nutrition-calculator';

describe('Nutrition Calculator', () => {
  const mockFoodDatabase = {
    'food1': {
      id: 'food1',
      name: '鸡胸肉',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      unit: '100g'
    },
    'food2': {
      id: 'food2',
      name: '米饭',
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      unit: '100g'
    },
    'food3': {
      id: 'food3',
      name: '西兰花',
      calories: 34,
      protein: 2.8,
      carbs: 7,
      fat: 0.4,
      unit: '100g'
    }
  };

  const mockNutritionGoals = {
    calories: 2000,
    protein: 120,
    carbs: 250,
    fat: 65
  };

  describe('calculateDailyNutrition', () => {
    it('should calculate total nutrition for multiple meals', () => {
      const meals = [
        {
          mealType: 'BREAKFAST',
          foods: [
            { foodId: 'food1', amount: 100 },
            { foodId: 'food2', amount: 150 }
          ]
        },
        {
          mealType: 'LUNCH',
          foods: [
            { foodId: 'food1', amount: 150 },
            { foodId: 'food3', amount: 200 }
          ]
        }
      ];

      const result = calculateDailyNutrition(meals, mockFoodDatabase);

      expect(result).toEqual({
        calories: 580.5, // (165 + 195) + (247.5 + 68)
        protein: 109.05, // (31 + 4.05) + (46.5 + 5.6)
        carbs: 68.5, // (0 + 42) + (0 + 14)
        fat: 11.1, // (3.6 + 0.45) + (5.4 + 0.8)
        mealsCount: 2
      });
    });

    it('should handle empty meals array', () => {
      const result = calculateDailyNutrition([], mockFoodDatabase);
      
      expect(result).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealsCount: 0
      });
    });

    it('should handle meals with no foods', () => {
      const meals = [
        { mealType: 'BREAKFAST', foods: [] },
        { mealType: 'LUNCH', foods: [] }
      ];

      const result = calculateDailyNutrition(meals, mockFoodDatabase);
      
      expect(result.mealsCount).toBe(0);
      expect(result.calories).toBe(0);
    });

    it('should throw error for unknown food', () => {
      const meals = [
        {
          mealType: 'BREAKFAST',
          foods: [{ foodId: 'unknown', amount: 100 }]
        }
      ];

      expect(() => {
        calculateDailyNutrition(meals, mockFoodDatabase);
      }).toThrow('Food not found: unknown');
    });
  });

  describe('calculateNutritionProgress', () => {
    it('should calculate progress percentages correctly', () => {
      const current = {
        calories: 1500,
        protein: 90,
        carbs: 200,
        fat: 40
      };

      const progress = calculateNutritionProgress(current, mockNutritionGoals);

      expect(progress).toEqual({
        calories: { current: 1500, target: 2000, percentage: 75, status: 'ON_TRACK' },
        protein: { current: 90, target: 120, percentage: 75, status: 'ON_TRACK' },
        carbs: { current: 200, target: 250, percentage: 80, status: 'ON_TRACK' },
        fat: { current: 40, target: 65, percentage: 61.5, status: 'ON_TRACK' }
      });
    });

    it('should detect exceeded nutrition', () => {
      const current = {
        calories: 2200,
        protein: 140,
        carbs: 300,
        fat: 80
      };

      const progress = calculateNutritionProgress(current, mockNutritionGoals);

      expect(progress.calories.status).toBe('EXCEEDED');
      expect(progress.protein.status).toBe('EXCEEDED');
      expect(progress.carbs.status).toBe('EXCEEDED');
      expect(progress.fat.status).toBe('EXCEEDED');
    });

    it('should detect deficient nutrition', () => {
      const current = {
        calories: 1000,
        protein: 40,
        carbs: 100,
        fat: 20
      };

      const progress = calculateNutritionProgress(current, mockNutritionGoals);

      expect(progress.calories.status).toBe('DEFICIENT');
      expect(progress.protein.status).toBe('DEFICIENT');
      expect(progress.carbs.status).toBe('DEFICIENT');
      expect(progress.fat.status).toBe('DEFICIENT');
    });

    it('should handle zero targets', () => {
      const current = {
        calories: 1000,
        protein: 40,
        carbs: 100,
        fat: 20
      };

      const zeroGoals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };

      const progress = calculateNutritionProgress(current, zeroGoals);

      expect(progress.calories.percentage).toBe(0);
      expect(progress.protein.percentage).toBe(0);
      expect(progress.carbs.percentage).toBe(0);
      expect(progress.fat.percentage).toBe(0);
    });
  });

  describe('calculateWeeklyAverage', () => {
    it('should calculate 7-day average correctly', () => {
      const dailyData = [
        { calories: 2000, protein: 120, carbs: 250, fat: 65 },
        { calories: 1800, protein: 110, carbs: 240, fat: 60 },
        { calories: 2200, protein: 130, carbs: 260, fat: 70 },
        { calories: 1900, protein: 115, carbs: 245, fat: 62 },
        { calories: 2100, protein: 125, carbs: 255, fat: 68 },
        { calories: 2000, protein: 120, carbs: 250, fat: 65 },
        { calories: 2000, protein: 120, carbs: 250, fat: 65 }
      ];

      const average = calculateWeeklyAverage(dailyData);

      expect(average).toEqual({
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
        daysCount: 7
      });
    });

    it('should handle partial week data', () => {
      const dailyData = [
        { calories: 2000, protein: 120, carbs: 250, fat: 65 },
        { calories: 1800, protein: 110, carbs: 240, fat: 60 },
        { calories: 2200, protein: 130, carbs: 260, fat: 70 }
      ];

      const average = calculateWeeklyAverage(dailyData);

      expect(average.daysCount).toBe(3);
      expect(average.calories).toBe(2000);
      expect(average.protein).toBe(120);
    });

    it('should handle empty data', () => {
      const average = calculateWeeklyAverage([]);

      expect(average).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        daysCount: 0
      });
    });
  });

  describe('detectNutritionDeficiencies', () => {
    it('should detect severe deficiencies', () => {
      const current = {
        calories: 1000,
        protein: 40,
        carbs: 100,
        fat: 20
      };

      const deficiencies = detectNutritionDeficiencies(current, mockNutritionGoals);

      expect(deficiencies).toHaveLength(4);
      expect(deficiencies[0]).toEqual({
        nutrient: 'calories',
        severity: 'SEVERE',
        currentPercent: 50,
        recommendation: expect.stringContaining('严重不足')
      });
    });

    it('should detect moderate deficiencies', () => {
      const current = {
        calories: 1400,
        protein: 72,
        carbs: 150,
        fat: 39
      };

      const deficiencies = detectNutritionDeficiencies(current, mockNutritionGoals);

      expect(deficiencies).toHaveLength(4);
      expect(deficiencies[0].severity).toBe('MODERATE');
    });

    it('should return no deficiencies for adequate nutrition', () => {
      const current = {
        calories: 1800,
        protein: 108,
        carbs: 225,
        fat: 58.5
      };

      const deficiencies = detectNutritionDeficiencies(current, mockNutritionGoals);

      expect(deficiencies).toHaveLength(0);
    });

    it('should provide specific recommendations', () => {
      const current = {
        calories: 1000,
        protein: 40,
        carbs: 100,
        fat: 20
      };

      const deficiencies = detectNutritionDeficiencies(current, mockNutritionGoals);

      const proteinDeficiency = deficiencies.find(d => d.nutrient === 'protein');
      expect(proteinDeficiency?.recommendation).toContain('鸡胸肉');
      expect(proteinDeficiency?.recommendation).toContain('鸡蛋');

      const carbDeficiency = deficiencies.find(d => d.nutrient === 'carbs');
      expect(carbDeficiency?.recommendation).toContain('米饭');
      expect(carbDeficiency?.recommendation).toContain('面条');
    });
  });

  describe('calculateRemainingMealsNutrition', () => {
    it('should calculate nutrition needed for remaining meals', () => {
      const current = {
        calories: 1200,
        protein: 60,
        carbs: 120,
        fat: 30
      };

      const remaining = calculateRemainingMealsNutrition(current, mockNutritionGoals, ['DINNER']);

      expect(remaining).toEqual({
        meals: ['DINNER'],
        totalNeeded: {
          calories: 800,
          protein: 60,
          carbs: 130,
          fat: 35
        },
        perMealAverage: {
          calories: 800,
          protein: 60,
          carbs: 130,
          fat: 35
        }
      });
    });

    it('should distribute nutrition across multiple remaining meals', () => {
      const current = {
        calories: 800,
        protein: 40,
        carbs: 80,
        fat: 20
      };

      const remaining = calculateRemainingMealsNutrition(
        current, 
        mockNutritionGoals, 
        ['LUNCH', 'DINNER']
      );

      expect(remaining.perMealAverage).toEqual({
        calories: 600,
        protein: 40,
        carbs: 85,
        fat: 22.5
      });
    });

    it('should handle no remaining meals', () => {
      const current = {
        calories: 1200,
        protein: 60,
        carbs: 120,
        fat: 30
      };

      const remaining = calculateRemainingMealsNutrition(current, mockNutritionGoals, []);

      expect(remaining.meals).toHaveLength(0);
      expect(remaining.totalNeeded.calories).toBe(800);
      expect(remaining.perMealAverage.calories).toBe(0);
    });

    it('should handle exceeded nutrition', () => {
      const current = {
        calories: 2200,
        protein: 140,
        carbs: 300,
        fat: 80
      };

      const remaining = calculateRemainingMealsNutrition(current, mockNutritionGoals, ['DINNER']);

      expect(remaining.totalNeeded.calories).toBe(-200);
      expect(remaining.totalNeeded.protein).toBe(-20);
    });
  });
});
