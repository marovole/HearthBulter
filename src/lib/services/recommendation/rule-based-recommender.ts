import type {
  RecommendationRepository,
  RecipeDetailDTO,
} from "@/lib/repositories/interfaces/recommendation-repository";
import type {
  RecommendationRecipeFilter,
  UserPreferenceDTO,
} from "@/lib/repositories/types/recommendation";
import {
  RecipeRecommendation,
  RecommendationContext,
} from "./recommendation-engine";

const MEAT_KEYWORDS = [
  "肉",
  "鸡",
  "牛",
  "猪",
  "羊",
  "鱼",
  "虾",
  "蟹",
  "培根",
  "火腿",
  "鸭",
  "鹅",
  "牛肉",
  "猪肉",
  "鸡肉",
];

export class RuleBasedRecommender {
  constructor(private readonly repository: RecommendationRepository) {}

  async getRecommendations(
    context: RecommendationContext,
    limit: number = 10,
  ): Promise<RecipeRecommendation[]> {
    const candidates = await this.getCandidateRecipes(context, limit);
    const scoredRecipes = await this.scoreRecipes(candidates, context);

    return scoredRecipes.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async getCandidateRecipes(
    context: RecommendationContext,
    limit: number = 10,
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
      limit: limit * 3,
      offset: 0,
    });

    return result.items;
  }

  private async scoreRecipes(
    recipes: RecipeDetailDTO[],
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const userPreference = await this.repository.getUserPreference(
      context.memberId,
    );

    return Promise.all(
      recipes.map(async (recipe) => {
        let score = 0;
        const metadata = {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: 0,
          seasonalMatch: 0,
        };

        const inventoryScore = await this.calculateInventoryScore(
          recipe,
          context.memberId,
        );
        metadata.inventoryMatch = inventoryScore / 30;
        score += inventoryScore;

        const priceScore = this.calculatePriceScore(
          recipe,
          context.budgetLimit,
          userPreference,
        );
        metadata.priceMatch = priceScore / 20;
        score += priceScore;

        const nutritionScore = await this.calculateNutritionScore(
          recipe,
          context.memberId,
        );
        metadata.nutritionMatch = nutritionScore / 30;
        score += nutritionScore;

        const preferenceScore = this.calculatePreferenceScore(
          recipe,
          userPreference,
          context,
        );
        metadata.preferenceMatch = preferenceScore / 15;
        score += preferenceScore;

        const seasonalScore = this.calculateSeasonalScore(
          recipe,
          context.season,
        );
        metadata.seasonalMatch = seasonalScore / 5;
        score += seasonalScore;

        return {
          recipeId: recipe.id,
          score,
          reasons: this.generateReasons(metadata),
          explanation: "",
          metadata,
        };
      }),
    );
  }

  private async calculateInventoryScore(
    recipe: RecipeDetailDTO,
    memberId: string,
  ): Promise<number> {
    const availableIngredients = await this.getAvailableIngredients(memberId);

    const requiredIngredients = this.getIngredientNames(recipe);

    if (requiredIngredients.length === 0) {
      return 0;
    }

    const availableSet = new Set(
      availableIngredients.map((ingredient) => ingredient.toLowerCase()),
    );
    const matchCount = requiredIngredients.filter((ingredient) =>
      availableSet.has(ingredient.toLowerCase()),
    ).length;

    const matchRatio = matchCount / requiredIngredients.length;
    return Math.round(matchRatio * 30);
  }

  private calculatePriceScore(
    recipe: RecipeDetailDTO,
    budgetLimit?: number,
    userPreference?: UserPreferenceDTO | null,
  ): number {
    if (!recipe.estimatedCost) {
      return 10;
    }

    const userCostLevel = userPreference?.costLevel || "MEDIUM";
    const costThresholds = {
      LOW: 20,
      MEDIUM: 50,
      HIGH: 100,
    };

    const threshold =
      costThresholds[userCostLevel as keyof typeof costThresholds];

    if (budgetLimit && recipe.estimatedCost > budgetLimit) {
      return 0;
    }

    if (recipe.estimatedCost <= threshold * 0.5) {
      return 20;
    }
    if (recipe.estimatedCost <= threshold) {
      return 15;
    }
    if (recipe.estimatedCost <= threshold * 1.5) {
      return 10;
    }

    return 5;
  }

  private async calculateNutritionScore(
    recipe: RecipeDetailDTO,
    memberId: string,
  ): Promise<number> {
    const healthGoal = await this.repository.getActiveHealthGoal(memberId);

    if (!healthGoal) {
      return 15;
    }

    let score = 15;

    const calories = recipe.calories ?? 0;
    const protein = recipe.protein ?? 0;
    const carbs = recipe.carbs ?? 0;
    const fat = recipe.fat ?? 0;

    switch (healthGoal.goalType) {
    case "LOSE_WEIGHT":
      if (calories <= 400) score += 10;
      if (carbs <= protein * 2) score += 5;
      break;
    case "GAIN_MUSCLE":
      if (protein >= 25) score += 10;
      if (calories >= 500) score += 5;
      break;
    case "MAINTAIN":
      if (calories >= 300 && calories <= 600) score += 10;
      break;
    case "IMPROVE_HEALTH":
      if (calories <= 500) score += 8;
      if (fat <= 20) score += 7;
      break;
    }

    return Math.min(score, 30);
  }

  private calculatePreferenceScore(
    recipe: RecipeDetailDTO,
    userPreference: UserPreferenceDTO | null,
    context: RecommendationContext,
  ): number {
    if (!userPreference) {
      return 7;
    }

    let score = 7;

    const cuisine = recipe.cuisine ?? recipe.cuisineType ?? undefined;
    if (cuisine && userPreference.preferredCuisines.includes(cuisine)) {
      score += 3;
    }

    const preferredIngredients = userPreference.preferredIngredients;
    const recipeIngredients = this.getIngredientNames(recipe);
    const matchCount = recipeIngredients.filter((ingredient) =>
      preferredIngredients.includes(ingredient),
    ).length;

    if (matchCount > 0) {
      score += Math.min(matchCount * 2, 3);
    }

    const avoidedIngredients = new Set([
      ...userPreference.avoidedIngredients,
      ...(context.excludedIngredients ?? []),
    ]);
    const hasAvoided = recipeIngredients.some((ingredient) =>
      avoidedIngredients.has(ingredient),
    );

    if (hasAvoided) {
      score = Math.max(score - 5, 0);
    }

    if (this.matchesDietaryRestrictions(recipe, context)) {
      score += 2;
    }

    return Math.min(score, 15);
  }

  private calculateSeasonalScore(
    recipe: RecipeDetailDTO,
    currentSeason?: string,
  ): number {
    if (!currentSeason) {
      return 2;
    }

    const seasonalTags = this.extractSeasonTags(recipe);

    if (seasonalTags.includes(currentSeason)) {
      return 5;
    }

    if (seasonalTags.length === 0) {
      return 3;
    }

    return 1;
  }

  private async getAvailableIngredients(memberId: string): Promise<string[]> {
    const snapshot = await this.repository.getInventorySnapshot(memberId);
    return snapshot.items.map((item) => item.ingredientName);
  }

  private matchesDietaryRestrictions(
    recipe: RecipeDetailDTO,
    context: RecommendationContext,
  ): boolean {
    const restrictions = (context.dietaryRestrictions ?? []).map((item) =>
      item.toLowerCase(),
    );

    if (!restrictions.length) return true;

    const ingredientNames = this.getIngredientNames(recipe).map((ingredient) =>
      ingredient.toLowerCase(),
    );

    const hasMeatIngredient = ingredientNames.some((ingredient) =>
      MEAT_KEYWORDS.some((keyword) => ingredient.includes(keyword)),
    );

    const isVegetarian = restrictions.some((item) =>
      ["vegetarian", "素食", "vegan", "纯素"].includes(item),
    );

    if (isVegetarian && hasMeatIngredient) {
      return false;
    }

    return true;
  }

  private generateReasons(metadata: {
    inventoryMatch: number;
    priceMatch: number;
    nutritionMatch: number;
    preferenceMatch: number;
    seasonalMatch: number;
  }): string[] {
    const reasons: string[] = [];

    if (metadata.inventoryMatch > 0.7) {
      reasons.push("现有食材充足");
    }
    if (metadata.priceMatch > 0.7) {
      reasons.push("经济实惠");
    }
    if (metadata.nutritionMatch > 0.7) {
      reasons.push("营养均衡");
    }
    if (metadata.preferenceMatch > 0.7) {
      reasons.push("符合口味");
    }
    if (metadata.seasonalMatch > 0.7) {
      reasons.push("当季食材");
    }

    return reasons.length > 0 ? reasons : ["基础推荐"];
  }

  private getIngredientNames(recipe: RecipeDetailDTO): string[] {
    const detailedIngredients = recipe.ingredientsDetailed?.map(
      (ingredient) => ingredient.food.name,
    );
    const summaryIngredients = recipe.ingredients?.map(
      (ingredient) => ingredient.name,
    );

    return (detailedIngredients ?? summaryIngredients ?? []).filter(
      (ingredient): ingredient is string => Boolean(ingredient),
    );
  }

  private extractSeasonTags(recipe: RecipeDetailDTO): string[] {
    const tags = recipe.tags ?? [];
    const rawTags = recipe.tagsRaw;

    const normalized = new Set<string>();
    tags.forEach((tag) => normalized.add(tag));

    if (typeof rawTags === "string") {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          parsed.forEach((tag) => {
            if (typeof tag === "string") normalized.add(tag);
          });
        }
      } catch {
        rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .forEach((tag) => normalized.add(tag));
      }
    } else if (Array.isArray(rawTags)) {
      rawTags.forEach((tag) => {
        if (typeof tag === "string") normalized.add(tag);
      });
    }

    return Array.from(normalized.values()).filter((tag) =>
      ["SPRING", "SUMMER", "AUTUMN", "WINTER"].includes(tag),
    );
  }
}
