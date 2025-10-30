import { callOpenAIJSON, RECOMMENDED_MODELS } from './openai-client';
import { getActivePrompt, renderPrompt, validatePromptParameters } from './prompt-templates';
import { Food, MealIngredient, MealPlan } from '@/lib/types/meal';

// 食谱优化结果类型
export interface RecipeOptimizationResult {
  analysis: {
    nutrition_score: number; // 0-100
    gap_analysis: {
      calories_gap: number;
      protein_gap: number;
      carbs_gap: number;
      fat_gap: number;
      micronutrient_gaps: string[];
    };
    strengths: string[];
    weaknesses: string[];
  };
  optimizations: {
    ingredient_substitutions: IngredientSubstitution[];
    portion_adjustments: PortionAdjustment[];
    cooking_method_suggestions: string[];
    seasonal_alternatives: SeasonalAlternative[];
  };
  improved_recipe: {
    name: string;
    ingredients: OptimizedIngredient[];
    instructions: string[];
    nutrition_facts: NutritionFacts;
  };
}

// 食材替代建议
export interface IngredientSubstitution {
  original_ingredient: string;
  substitute_ingredient: string;
  reason: string;
  nutritional_impact: {
    similar_nutrients: string[];
    improved_aspects: string[];
    potential_drawbacks: string[];
  };
  availability_score: number; // 0-100, 季节性和普遍性
  cost_difference: 'cheaper' | 'similar' | 'expensive';
}

// 份量调整建议
export interface PortionAdjustment {
  ingredient: string;
  current_amount: number;
  recommended_amount: number;
  unit: string;
  reason: string;
  nutritional_impact: string;
}

// 季节性替代
export interface SeasonalAlternative {
  original: string;
  seasonal_alternative: string;
  season: string;
  nutritional_comparison: string;
  reason: string;
}

// 优化后的食材
export interface OptimizedIngredient {
  name: string;
  amount: number;
  unit: string;
  nutritional_value?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// 营养事实
export interface NutritionFacts {
  serving_size: string;
  calories: number;
  macronutrients: {
    protein: { amount: number; unit: string; daily_value?: number };
    carbohydrates: { amount: number; unit: string; daily_value?: number };
    fat: { amount: number; unit: string; daily_value?: number };
    fiber: { amount: number; unit: string; daily_value?: number };
    sugar: { amount: number; unit: string; daily_value?: number };
  };
  micronutrients: Array<{
    name: string;
    amount: number;
    unit: string;
    daily_value?: number;
  }>;
}

// 用户偏好和限制
export interface UserPreferences {
  dietary_restrictions: string[];
  allergies: string[];
  disliked_ingredients: string[];
  preferred_cuisines: string[];
  budget_level: 'low' | 'medium' | 'high';
  cooking_skill: 'beginner' | 'intermediate' | 'advanced';
}

// 食谱优化器主类
export class RecipeOptimizer {
  private static instance: RecipeOptimizer;

  static getInstance(): RecipeOptimizer {
    if (!RecipeOptimizer.instance) {
      RecipeOptimizer.instance = new RecipeOptimizer();
    }
    return RecipeOptimizer.instance;
  }

  /**
   * 分析食谱与健康目标的差距
   */
  async analyzeRecipeGap(
    recipe: any, // Meal or MealPlan
    targetNutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
    userPreferences: UserPreferences
  ): Promise<{
    nutrition_score: number;
    gaps: {
      calories_gap: number;
      protein_gap: number;
      carbs_gap: number;
      fat_gap: number;
      micronutrient_gaps: string[];
    };
    strengths: string[];
    weaknesses: string[];
  }> {
    // 计算食谱的实际营养成分
    const actualNutrition = await this.calculateRecipeNutrition(recipe);

    // 计算差距
    const gaps = {
      calories_gap: actualNutrition.calories - targetNutrition.calories,
      protein_gap: actualNutrition.protein - targetNutrition.protein,
      carbs_gap: actualNutrition.carbs - targetNutrition.carbs,
      fat_gap: actualNutrition.fat - targetNutrition.fat,
      micronutrient_gaps: this.identifyMicronutrientGaps(actualNutrition, userPreferences),
    };

    // 评估营养均衡度
    const nutrition_score = this.calculateNutritionScore(actualNutrition, targetNutrition, userPreferences);

    // 识别优势和劣势
    const { strengths, weaknesses } = this.analyzeStrengthsAndWeaknesses(actualNutrition, targetNutrition, userPreferences);

    return {
      nutrition_score,
      gaps,
      strengths,
      weaknesses,
    };
  }

  /**
   * 生成智能食材替换建议
   */
  async generateIngredientSubstitutions(
    ingredient: string,
    reason: string,
    availableIngredients: string[],
    nutritionalRequirements: string[],
    userPreferences: UserPreferences
  ): Promise<IngredientSubstitution[]> {
    const prompt = getActivePrompt('recipe_optimization', 'ingredient_substitution');
    if (!prompt) {
      throw new Error('Ingredient substitution prompt template not found');
    }

    const variables = {
      original_ingredient: ingredient,
      reason: reason,
      available_ingredients: availableIngredients.join(', '),
      nutrition_requirements: nutritionalRequirements.join(', '),
    };

    const validation = validatePromptParameters(prompt, variables);
    if (!validation.valid) {
      throw new Error(`Missing prompt parameters: ${validation.missing.join(', ')}`);
    }

    const renderedPrompt = renderPrompt(prompt, variables);

    try {
      const result = await callOpenAIJSON(
        renderedPrompt,
        RECOMMENDED_MODELS.FREE[0], // 使用免费模型
        1500
      );

      return this.processSubstitutionResults(result, userPreferences);
    } catch (error) {
      console.error('Ingredient substitution failed:', error);
      return this.generateFallbackSubstitutions(ingredient, reason, availableIngredients);
    }
  }

  /**
   * 考虑季节性和食材可得性
   */
  async optimizeForSeasonality(
    recipe: any,
    currentSeason: string,
    location: string = 'china'
  ): Promise<SeasonalAlternative[]> {
    const seasonalAlternatives: SeasonalAlternative[] = [];

    // 获取食谱中的主要食材
    const ingredients = this.extractIngredients(recipe);

    for (const ingredient of ingredients) {
      const alternatives = await this.findSeasonalAlternatives(ingredient, currentSeason, location);
      seasonalAlternatives.push(...alternatives);
    }

    return seasonalAlternatives;
  }

  /**
   * 实现营养均衡度评分
   */
  calculateNutritionBalanceScore(
    nutrition: NutritionFacts,
    targetNutrition: any,
    userPreferences: UserPreferences
  ): number {
    let score = 100;

    // 宏量营养素均衡性评分
    const macroBalance = this.evaluateMacroBalance(nutrition.macronutrients, targetNutrition);
    score -= (1 - macroBalance) * 20;

    // 微量营养素丰富度评分
    const micronutrientScore = this.evaluateMicronutrientDiversity(nutrition.micronutrients);
    score -= (1 - micronutrientScore) * 15;

    // 膳食纤维评分
    const fiberScore = this.evaluateFiberContent(nutrition.macronutrients.fiber);
    score -= (1 - fiberScore) * 10;

    // 糖分控制评分
    const sugarScore = this.evaluateSugarContent(nutrition.macronutrients.sugar, nutrition.calories);
    score -= (1 - sugarScore) * 10;

    // 饮食偏好匹配度评分
    const preferenceScore = this.evaluatePreferenceMatch(nutrition, userPreferences);
    score -= (1 - preferenceScore) * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 用户反馈学习机制
   */
  async learnFromUserFeedback(
    originalRecipe: any,
    optimizedRecipe: any,
    userFeedback: {
      rating: number; // 1-5
      liked_changes: string[];
      disliked_changes: string[];
      comments: string;
    }
  ): Promise<void> {
    // 存储反馈用于后续优化
    const feedback = {
      original_recipe_id: originalRecipe.id,
      optimized_recipe_id: optimizedRecipe.id,
      feedback: userFeedback,
      timestamp: new Date().toISOString(),
    };

    // 这里可以存储到数据库或缓存中
    // 用于后续的个性化推荐学习

    console.log('User feedback recorded:', feedback);
  }

  /**
   * 执行完整的食谱优化
   */
  async optimizeRecipe(
    recipe: any,
    targetNutrition: any,
    userPreferences: UserPreferences,
    currentSeason?: string
  ): Promise<RecipeOptimizationResult> {
    // 1. 分析现有食谱
    const analysis = await this.analyzeRecipeGap(recipe, targetNutrition, userPreferences);

    // 2. 生成优化建议
    const optimizations = await this.generateOptimizations(recipe, analysis, userPreferences, currentSeason);

    // 3. 创建优化后的食谱
    const improved_recipe = await this.createOptimizedRecipe(recipe, optimizations);

    return {
      analysis,
      optimizations,
      improved_recipe,
    };
  }

  // 私有辅助方法

  private async calculateRecipeNutrition(recipe: any): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    micronutrients: any[];
  }> {
    // 这里应该从数据库查询食材营养数据并计算总和
    // 简化为示例数据
    return {
      calories: 650,
      protein: 35,
      carbs: 60,
      fat: 25,
      micronutrients: [
        { name: '维生素C', amount: 45, unit: 'mg' },
        { name: '钙', amount: 320, unit: 'mg' },
      ],
    };
  }

  private identifyMicronutrientGaps(actual: any, preferences: UserPreferences): string[] {
    const gaps: string[] = [];

    // 检查常见微量营养素缺口
    const commonNutrients = ['维生素A', '维生素C', '钙', '铁', '锌'];
    const actualNutrients = actual.micronutrients.map((m: any) => m.name);

    commonNutrients.forEach(nutrient => {
      if (!actualNutrients.includes(nutrient)) {
        gaps.push(nutrient);
      }
    });

    return gaps;
  }

  private calculateNutritionScore(actual: any, target: any, preferences: UserPreferences): number {
    // 简化的营养评分算法
    let score = 100;

    // 热量差距惩罚
    const calorieGap = Math.abs(actual.calories - target.calories) / target.calories;
    score -= calorieGap * 30;

    // 宏量营养素差距惩罚
    const macroGap = (
      Math.abs(actual.protein - target.protein) / target.protein +
      Math.abs(actual.carbs - target.carbs) / target.carbs +
      Math.abs(actual.fat - target.fat) / target.fat
    ) / 3;
    score -= macroGap * 40;

    return Math.max(0, Math.min(100, score));
  }

  private analyzeStrengthsAndWeaknesses(actual: any, target: any, preferences: UserPreferences): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // 蛋白质分析
    if (actual.protein >= target.protein * 0.9) {
      strengths.push('蛋白质含量充足');
    } else {
      weaknesses.push('蛋白质含量不足');
    }

    // 碳水化合物分析
    if (actual.carbs <= target.carbs * 1.2) {
      strengths.push('碳水化合物控制良好');
    } else {
      weaknesses.push('碳水化合物偏高');
    }

    return { strengths, weaknesses };
  }

  private async generateOptimizations(
    recipe: any,
    analysis: any,
    preferences: UserPreferences,
    season?: string
  ): Promise<any> {
    // 生成食材替代建议
    const ingredient_substitutions = await this.generateSubstitutionsForRecipe(recipe, analysis);

    // 生成份量调整建议
    const portion_adjustments = this.generatePortionAdjustments(analysis);

    // 烹饪方法建议
    const cooking_method_suggestions = this.generateCookingSuggestions(recipe, analysis);

    // 季节性替代
    const seasonal_alternatives = season ? await this.optimizeForSeasonality(recipe, season) : [];

    return {
      ingredient_substitutions,
      portion_adjustments,
      cooking_method_suggestions,
      seasonal_alternatives,
    };
  }

  private async generateSubstitutionsForRecipe(recipe: any, analysis: any): Promise<IngredientSubstitution[]> {
    const substitutions: IngredientSubstitution[] = [];
    const ingredients = this.extractIngredients(recipe);

    for (const ingredient of ingredients) {
      if (analysis.gaps.micronutrient_gaps.length > 0) {
        // 为营养缺口生成替代建议
        const subs = await this.generateIngredientSubstitutions(
          ingredient,
          '补充营养缺口',
          [], // 可用食材列表
          analysis.gaps.micronutrient_gaps,
          {} as UserPreferences
        );
        substitutions.push(...subs.slice(0, 2)); // 每个食材最多2个替代建议
      }
    }

    return substitutions;
  }

  private generatePortionAdjustments(analysis: any): PortionAdjustment[] {
    const adjustments: PortionAdjustment[] = [];

    // 根据营养差距调整份量
    if (analysis.gaps.protein_gap < 0) {
      adjustments.push({
        ingredient: '瘦肉/鱼类',
        current_amount: 100,
        recommended_amount: 150,
        unit: 'g',
        reason: '增加蛋白质摄入',
        nutritional_impact: '蛋白质增加15g',
      });
    }

    if (analysis.gaps.carbs_gap > 0) {
      adjustments.push({
        ingredient: '主食',
        current_amount: 150,
        recommended_amount: 120,
        unit: 'g',
        reason: '控制碳水化合物摄入',
        nutritional_impact: '碳水化合物减少30g',
      });
    }

    return adjustments;
  }

  private generateCookingSuggestions(recipe: any, analysis: any): string[] {
    const suggestions: string[] = [];

    if (analysis.gaps.fat_gap > 0) {
      suggestions.push('使用蒸、煮、炖等低油烹饪方法');
      suggestions.push('减少油炸，改用烤箱或空气炸锅');
    }

    if (analysis.weaknesses.includes('蛋白质含量不足')) {
      suggestions.push('增加豆类或坚果作为配菜');
    }

    return suggestions;
  }

  private async createOptimizedRecipe(recipe: any, optimizations: any): Promise<any> {
    // 创建优化后的食谱版本
    return {
      name: `${recipe.name} (优化版)`,
      ingredients: recipe.ingredients, // 这里应该应用优化建议
      instructions: recipe.instructions,
      nutrition_facts: {} as NutritionFacts, // 重新计算营养事实
    };
  }

  private extractIngredients(recipe: any): string[] {
    // 从食谱中提取食材名称
    return recipe.ingredients?.map((ing: any) => ing.name) || [];
  }

  private async findSeasonalAlternatives(
    ingredient: string,
    season: string,
    location: string
  ): Promise<SeasonalAlternative[]> {
    // 简化的季节性替代逻辑
    const seasonalMap: Record<string, Record<string, string[]>> = {
      spring: {
        spinach: ['春笋', '春菜'],
        strawberry: ['草莓'],
      },
      summer: {
        tomato: ['西红柿', '黄瓜'],
        watermelon: ['西瓜'],
      },
      autumn: {
        pumpkin: ['南瓜', '栗子'],
        apple: ['苹果'],
      },
      winter: {
        cabbage: ['大白菜', '萝卜'],
        citrus: ['橙子', '柚子'],
      },
    };

    const alternatives = seasonalMap[season]?.[ingredient] || [];
    return alternatives.map(alt => ({
      original: ingredient,
      seasonal_alternative: alt,
      season,
      nutritional_comparison: '营养价值相似',
      reason: '当季食材更新鲜，价格更合理',
    }));
  }

  private processSubstitutionResults(result: any, preferences: UserPreferences): IngredientSubstitution[] {
    // 处理AI返回的替代建议
    return result.substitutions || [];
  }

  private generateFallbackSubstitutions(
    ingredient: string,
    reason: string,
    available: string[]
  ): IngredientSubstitution[] {
    // 备用替代逻辑
    const commonSubstitutions: Record<string, IngredientSubstitution[]> = {
      '猪肉': [{
        original_ingredient: '猪肉',
        substitute_ingredient: '鸡胸肉',
        reason: '降低脂肪含量',
        nutritional_impact: {
          similar_nutrients: ['蛋白质'],
          improved_aspects: ['脂肪含量更低'],
          potential_drawbacks: ['口感稍干'],
        },
        availability_score: 90,
        cost_difference: 'similar',
      }],
    };

    return commonSubstitutions[ingredient] || [];
  }

  private evaluateMacroBalance(macros: any, target: any): number {
    // 宏量营养素比例均衡度评估
    const total = macros.protein.amount + macros.carbohydrates.amount + macros.fat.amount;
    const actual = {
      protein: (macros.protein.amount / total) * 100,
      carbs: (macros.carbohydrates.amount / total) * 100,
      fat: (macros.fat.amount / total) * 100,
    };

    // 与目标比例比较
    const proteinDiff = Math.abs(actual.protein - (target.protein_percent || 20));
    const carbsDiff = Math.abs(actual.carbs - (target.carbs_percent || 50));
    const fatDiff = Math.abs(actual.fat - (target.fat_percent || 30));

    const avgDiff = (proteinDiff + carbsDiff + fatDiff) / 3;
    return Math.max(0, 1 - avgDiff / 50); // 差异越大评分越低
  }

  private evaluateMicronutrientDiversity(micronutrients: any[]): number {
    const essential = ['维生素A', '维生素C', '钙', '铁', '锌'];
    const present = micronutrients.filter(m => essential.includes(m.name)).length;
    return present / essential.length;
  }

  private evaluateFiberContent(fiber: any): number {
    const amount = fiber.amount;
    // 推荐每日纤维25-30g，这里按餐评估
    return Math.min(1, amount / 8); // 假设每餐目标8g纤维
  }

  private evaluateSugarContent(sugar: any, calories: number): number {
    const sugarCalories = sugar.amount * 4;
    const sugarPercent = (sugarCalories / calories) * 100;
    // 糖分应<10%总热量
    return sugarPercent <= 10 ? 1 : Math.max(0, 1 - (sugarPercent - 10) / 20);
  }

  private evaluatePreferenceMatch(nutrition: NutritionFacts, preferences: UserPreferences): number {
    let score = 1;

    // 检查饮食限制
    if (preferences.dietary_restrictions.includes('low_sodium') && nutrition.macronutrients.sugar.amount > 5) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }
}

// 导出单例实例
export const recipeOptimizer = RecipeOptimizer.getInstance();
