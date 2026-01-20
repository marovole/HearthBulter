import type {
  RecommendationRepository,
  RecipeDetailDTO,
  RecipeFavoriteDetailDTO,
  RecipeRatingDetailDTO,
} from "@/lib/repositories/interfaces/recommendation-repository";
import type {
  RecommendationRecipeFilter,
  UserPreferenceDTO,
  HealthGoalDTO,
  RecipeSummaryDTO,
} from "@/lib/repositories/types/recommendation";
import {
  RecipeRecommendation,
  RecommendationContext,
} from "./recommendation-engine";

interface RecipeFeatures {
  recipeId: string;
  ingredients: string[];
  nutritionProfile: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  cookingTime: number;
  difficulty: string;
  category: string;
  tags: string[];
  costLevel: "LOW" | "MEDIUM" | "HIGH";
}

interface UserProfile {
  preferredIngredients: string[];
  avoidedIngredients: string[];
  nutritionPreferences: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
    maxFat?: number;
  };
  cookingPreferences: {
    maxTime?: number;
    preferredDifficulty?: string;
    preferredCategories?: string[];
  };
  costPreference: "LOW" | "MEDIUM" | "HIGH";
}

type RecipeSource = RecipeDetailDTO | RecipeSummaryDTO;

export class ContentFilter {
  private featureCache = new Map<string, RecipeFeatures>();
  private profileCache = new Map<string, UserProfile>();

  constructor(private readonly repository: RecommendationRepository) {}

  async getRecommendations(
    context: RecommendationContext,
    limit: number = 10,
  ): Promise<RecipeRecommendation[]> {
    const userProfile = await this.getUserProfile(context.memberId);
    const candidateRecipes = await this.getCandidateRecipes(context, limit * 3);
    const recipeFeatures = await this.extractRecipeFeatures(candidateRecipes);

    const recommendations = recipeFeatures.map((features) => {
      const score = this.calculateContentSimilarity(
        features,
        userProfile,
        context,
      );

      return {
        recipeId: features.recipeId,
        score,
        reasons: this.generateContentReasons(features, userProfile, score),
        explanation: this.generateContentExplanation(features, userProfile),
        metadata: {
          inventoryMatch: 0,
          priceMatch: this.calculatePriceMatch(features, userProfile),
          nutritionMatch: this.calculateNutritionMatch(features, userProfile),
          preferenceMatch: score / 100,
          seasonalMatch: 0,
        },
      };
    });

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async getSimilarRecipes(
    targetRecipe: RecipeDetailDTO,
    limit: number = 5,
  ): Promise<RecipeRecommendation[]> {
    const targetFeatures = await this.extractSingleRecipeFeatures(targetRecipe);

    const similarRecipes = await this.repository.getSimilarRecipes(
      targetRecipe.id,
      limit * 2,
    );

    const recommendations = await Promise.all(
      similarRecipes.map(async (recipe) => {
        const features = await this.extractSingleRecipeFeatures(recipe);
        const similarity = this.calculateRecipeSimilarity(
          targetFeatures,
          features,
        );

        return {
          recipeId: recipe.id,
          score: similarity * 100,
          reasons: ["相似食谱"],
          explanation: `与《${targetRecipe.name}》食材和制作方法相似。`,
          metadata: {
            inventoryMatch: 0,
            priceMatch: 0,
            nutritionMatch: 0,
            preferenceMatch: similarity,
            seasonalMatch: 0,
          },
        };
      }),
    );

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async getUserProfile(memberId: string): Promise<UserProfile> {
    if (this.profileCache.has(memberId)) {
      return this.profileCache.get(memberId)!;
    }

    const [userPreference, healthGoal, behavior] = await Promise.all([
      this.repository.getUserPreference(memberId),
      this.repository.getActiveHealthGoal(memberId),
      this.repository.getDetailedRecipeBehavior(memberId, {
        limit: 20,
        minRating: 4,
      }),
    ]);

    const learnedPreferences = this.learnFromUserBehavior(
      behavior.ratings,
      behavior.favorites,
    );

    const profile: UserProfile = {
      preferredIngredients: [
        ...(userPreference?.preferredIngredients ?? []),
        ...learnedPreferences.preferredIngredients,
      ],
      avoidedIngredients: userPreference?.avoidedIngredients ?? [],
      nutritionPreferences: this.buildNutritionPreferences(
        healthGoal,
        userPreference,
      ),
      cookingPreferences: {
        maxTime: userPreference?.maxCookTimeMinutes ?? undefined,
        preferredDifficulty: undefined,
        preferredCategories: learnedPreferences.preferredCategories,
      },
      costPreference: userPreference?.costLevel || "MEDIUM",
    };

    this.profileCache.set(memberId, profile);

    return profile;
  }

  private learnFromUserBehavior(
    ratings: RecipeRatingDetailDTO[],
    favorites: RecipeFavoriteDetailDTO[],
  ) {
    const allRecipes = [
      ...ratings.map((rating) => rating.recipe),
      ...favorites.map((favorite) => favorite.recipe),
    ];

    const ingredientCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();

    allRecipes.forEach((recipe) => {
      recipe.ingredientsDetailed?.forEach((ingredient) => {
        ingredientCount.set(
          ingredient.food.name,
          (ingredientCount.get(ingredient.food.name) || 0) + 1,
        );
      });

      if (recipe.category) {
        categoryCount.set(
          recipe.category,
          (categoryCount.get(recipe.category) || 0) + 1,
        );
      }
    });

    const preferredIngredients = Array.from(ingredientCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ingredient]) => ingredient);

    const preferredCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return {
      preferredIngredients,
      preferredCategories,
    };
  }

  private buildNutritionPreferences(
    healthGoal: HealthGoalDTO | null,
    userPreference: UserPreferenceDTO | null,
  ) {
    const preferences: {
      maxCalories?: number;
      minProtein?: number;
      maxCarbs?: number;
      maxFat?: number;
    } = {};

    if (healthGoal) {
      switch (healthGoal.goalType) {
      case "LOSE_WEIGHT":
        preferences.maxCalories = 400;
        break;
      case "GAIN_MUSCLE":
        preferences.minProtein = 25;
        preferences.maxCalories = 800;
        break;
      case "MAINTAIN":
        preferences.maxCalories = 600;
        preferences.minProtein = 15;
        break;
      case "IMPROVE_HEALTH":
        preferences.maxFat = 20;
        preferences.maxCalories = 500;
        break;
      }
    }

    if (userPreference) {
      if (userPreference.costLevel === "LOW") {
        preferences.maxCalories = Math.min(
          preferences.maxCalories ?? 9999,
          500,
        );
      }
    }

    return preferences;
  }

  private async getCandidateRecipes(
    context: RecommendationContext,
    limit: number,
  ): Promise<RecipeDetailDTO[]> {
    const filters: RecommendationRecipeFilter = {
      memberId: context.memberId,
      mealTypes: context.mealType ? [context.mealType] : undefined,
      maxCookTimeMinutes: context.maxCookTime,
      season: context.season,
      dietaryRestrictions: context.dietaryRestrictions,
      budgetLimit: context.budgetLimit,
      excludeRecipeIds: context.excludeRecipeIds,
    };

    const result = await this.repository.listDetailedCandidateRecipes(filters, {
      limit,
      offset: 0,
    });

    return result.items;
  }

  private async extractRecipeFeatures(
    recipes: RecipeDetailDTO[],
  ): Promise<RecipeFeatures[]> {
    return Promise.all(
      recipes.map((recipe) => this.extractSingleRecipeFeatures(recipe)),
    );
  }

  private async extractSingleRecipeFeatures(
    recipe: RecipeSource,
  ): Promise<RecipeFeatures> {
    if (this.featureCache.has(recipe.id)) {
      return this.featureCache.get(recipe.id)!;
    }

    const ingredients = this.extractIngredientNames(recipe);
    const nutritionProfile = this.extractNutritionProfile(recipe);

    const features: RecipeFeatures = {
      recipeId: recipe.id,
      ingredients,
      nutritionProfile,
      cookingTime: this.resolveCookingTime(recipe),
      difficulty: recipe.difficulty ?? "MEDIUM",
      category: (recipe as RecipeDetailDTO).category ?? "UNKNOWN",
      tags: this.normalizeTags(recipe),
      costLevel: this.resolveCostLevel(recipe),
    };

    this.featureCache.set(recipe.id, features);

    return features;
  }

  private calculateContentSimilarity(
    features: RecipeFeatures,
    profile: UserProfile,
    context: RecommendationContext,
  ): number {
    let score = 0;

    const ingredientScore = this.calculateIngredientMatch(
      features.ingredients,
      profile,
    );
    score += ingredientScore * 0.4;

    const nutritionScore = this.calculateNutritionMatch(features, profile);
    score += nutritionScore * 0.25;

    const cookingScore = this.calculateCookingMatch(features, profile, context);
    score += cookingScore * 0.2;

    const categoryScore = this.calculateCategoryMatch(features, profile);
    score += categoryScore * 0.15;

    return Math.round(score);
  }

  private calculateIngredientMatch(
    ingredients: string[],
    profile: UserProfile,
  ): number {
    if (ingredients.length === 0) return 0;

    let matchScore = 0;
    let penaltyScore = 0;

    const preferredMatches = ingredients.filter((ingredient) =>
      profile.preferredIngredients.includes(ingredient),
    ).length;

    matchScore += (preferredMatches / ingredients.length) * 50;

    const avoidedMatches = ingredients.filter((ingredient) =>
      profile.avoidedIngredients.includes(ingredient),
    ).length;

    penaltyScore = (avoidedMatches / ingredients.length) * 100;

    return Math.max(0, matchScore - penaltyScore);
  }

  private calculateNutritionMatch(
    features: RecipeFeatures,
    profile: UserProfile,
  ): number {
    const { nutritionProfile } = features;
    const { nutritionPreferences } = profile;

    let score = 50;

    if (
      nutritionPreferences.maxCalories &&
      nutritionProfile.calories > nutritionPreferences.maxCalories
    ) {
      score -= 30;
    }

    if (
      nutritionPreferences.minProtein &&
      nutritionProfile.protein < nutritionPreferences.minProtein
    ) {
      score -= 20;
    }

    if (
      nutritionPreferences.maxCarbs &&
      nutritionProfile.carbs > nutritionPreferences.maxCarbs
    ) {
      score -= 15;
    }

    if (
      nutritionPreferences.maxFat &&
      nutritionProfile.fat > nutritionPreferences.maxFat
    ) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateCookingMatch(
    features: RecipeFeatures,
    profile: UserProfile,
    context: RecommendationContext,
  ): number {
    let score = 30;

    if (profile.cookingPreferences.maxTime) {
      if (features.cookingTime <= profile.cookingPreferences.maxTime) {
        score += 30;
      } else if (
        features.cookingTime <=
        profile.cookingPreferences.maxTime * 1.5
      ) {
        score += 15;
      } else {
        score -= 20;
      }
    }

    if (profile.cookingPreferences.preferredDifficulty) {
      const difficultyOrder = ["EASY", "MEDIUM", "HARD"];
      const preferredIndex = difficultyOrder.indexOf(
        profile.cookingPreferences.preferredDifficulty,
      );
      const recipeIndex = difficultyOrder.indexOf(features.difficulty);

      if (preferredIndex === recipeIndex) {
        score += 20;
      } else if (Math.abs(preferredIndex - recipeIndex) === 1) {
        score += 10;
      }
    }

    if (context.maxCookTime && features.cookingTime <= context.maxCookTime) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateCategoryMatch(
    features: RecipeFeatures,
    profile: UserProfile,
  ): number {
    if (!profile.cookingPreferences.preferredCategories) {
      return 50;
    }

    return profile.cookingPreferences.preferredCategories.includes(
      features.category,
    )
      ? 100
      : 30;
  }

  private calculatePriceMatch(
    features: RecipeFeatures,
    profile: UserProfile,
  ): number {
    const costScores = {
      LOW: { LOW: 100, MEDIUM: 60, HIGH: 20 },
      MEDIUM: { LOW: 80, MEDIUM: 100, HIGH: 60 },
      HIGH: { LOW: 40, MEDIUM: 70, HIGH: 100 },
    };

    return costScores[profile.costPreference][features.costLevel] / 100;
  }

  private calculateRecipeSimilarity(
    recipe1: RecipeFeatures,
    recipe2: RecipeFeatures,
  ): number {
    const ingredientSimilarity = this.calculateJaccardSimilarity(
      new Set(recipe1.ingredients),
      new Set(recipe2.ingredients),
    );

    const nutritionSimilarity = this.calculateNutritionSimilarity(
      recipe1.nutritionProfile,
      recipe2.nutritionProfile,
    );

    return ingredientSimilarity * 0.7 + nutritionSimilarity * 0.3;
  }

  private calculateJaccardSimilarity(
    set1: Set<string>,
    set2: Set<string>,
  ): number {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private calculateNutritionSimilarity(
    nutrition1: RecipeFeatures["nutritionProfile"],
    nutrition2: RecipeFeatures["nutritionProfile"],
  ): number {
    const normalize = (value: number, max: number) => Math.min(value / max, 1);

    const normalized1 = {
      calories: normalize(nutrition1.calories, 1000),
      protein: normalize(nutrition1.protein, 50),
      carbs: normalize(nutrition1.carbs, 100),
      fat: normalize(nutrition1.fat, 50),
    };

    const normalized2 = {
      calories: normalize(nutrition2.calories, 1000),
      protein: normalize(nutrition2.protein, 50),
      carbs: normalize(nutrition2.carbs, 100),
      fat: normalize(nutrition2.fat, 50),
    };

    const distance = Math.sqrt(
      Math.pow(normalized1.calories - normalized2.calories, 2) +
        Math.pow(normalized1.protein - normalized2.protein, 2) +
        Math.pow(normalized1.carbs - normalized2.carbs, 2) +
        Math.pow(normalized1.fat - normalized2.fat, 2),
    );

    return Math.max(0, 1 - distance);
  }

  private generateContentReasons(
    features: RecipeFeatures,
    profile: UserProfile,
    score: number,
  ): string[] {
    const reasons: string[] = [];

    if (score >= 80) {
      reasons.push("高度匹配您的偏好");
    } else if (score >= 60) {
      reasons.push("比较符合您的口味");
    }

    const ingredientMatches = features.ingredients.filter((ingredient) =>
      profile.preferredIngredients.includes(ingredient),
    ).length;

    if (ingredientMatches > 0) {
      reasons.push(`包含${ingredientMatches}种您喜欢的食材`);
    }

    if (
      profile.cookingPreferences.preferredCategories?.includes(
        features.category,
      )
    ) {
      reasons.push("您偏好的菜系");
    }

    return reasons;
  }

  private generateContentExplanation(
    features: RecipeFeatures,
    profile: UserProfile,
  ): string {
    const explanations: string[] = [];

    const ingredientMatches = features.ingredients.filter((ingredient) =>
      profile.preferredIngredients.includes(ingredient),
    );

    if (ingredientMatches.length > 0) {
      explanations.push(
        `这道菜使用了您喜欢的${ingredientMatches.slice(0, 3).join("、")}等食材`,
      );
    }

    if (features.cookingTime <= 30) {
      explanations.push("制作时间较短，适合快节奏生活");
    }

    if (features.difficulty === "EASY") {
      explanations.push("难度简单，适合厨房新手");
    }

    return explanations.length > 0
      ? `${explanations.join("，")}。`
      : "基于您的偏好分析推荐。";
  }

  private extractIngredientNames(recipe: RecipeSource): string[] {
    if ((recipe as RecipeDetailDTO).ingredientsDetailed?.length) {
      return (recipe as RecipeDetailDTO)
        .ingredientsDetailed!.map((ingredient) => ingredient.food.name)
        .filter(Boolean);
    }

    return (recipe.ingredients ?? [])
      .map((ingredient: { name: string }) => ingredient.name)
      .filter(Boolean);
  }

  private extractNutritionProfile(recipe: RecipeSource) {
    return {
      calories:
        recipe.caloriesPerServing ?? (recipe as RecipeDetailDTO).calories ?? 0,
      protein:
        recipe.proteinPerServing ?? (recipe as RecipeDetailDTO).protein ?? 0,
      carbs: recipe.carbsPerServing ?? (recipe as RecipeDetailDTO).carbs ?? 0,
      fat: recipe.fatPerServing ?? (recipe as RecipeDetailDTO).fat ?? 0,
    };
  }

  private resolveCookingTime(recipe: RecipeSource): number {
    const detail = recipe as RecipeDetailDTO;
    if (detail.totalTime) return detail.totalTime;

    const prepTime = recipe.prepTimeMinutes ?? 0;
    const cookTime = recipe.cookTimeMinutes ?? 0;
    return prepTime + cookTime;
  }

  private resolveCostLevel(recipe: RecipeSource): "LOW" | "MEDIUM" | "HIGH" {
    const detail = recipe as RecipeDetailDTO;
    if (detail.costLevel) return detail.costLevel;

    const estimatedCost = recipe.estimatedCost ?? 0;
    if (estimatedCost <= 20) return "LOW";
    if (estimatedCost <= 50) return "MEDIUM";
    return "HIGH";
  }

  private normalizeTags(recipe: RecipeSource): string[] {
    if (recipe.tags && recipe.tags.length) {
      return recipe.tags;
    }

    const rawTags = (recipe as RecipeDetailDTO).tagsRaw;
    if (!rawTags) return [];

    if (Array.isArray(rawTags)) {
      return rawTags.filter((tag): tag is string => typeof tag === "string");
    }

    if (typeof rawTags === "string") {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          return parsed.filter((tag): tag is string => typeof tag === "string");
        }
      } catch {
        return rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    return [];
  }
}
