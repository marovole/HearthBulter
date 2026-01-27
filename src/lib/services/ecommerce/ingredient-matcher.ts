// ============================================================================
// 食材→商品匹配服务
// 将食谱食材智能匹配到 Instacart 商品
// ============================================================================

import { InstacartAdapter, InstacartCartItem } from "./instacart-adapter";
import { PlatformProductInfo, ProductSearchRequest } from "./types";

// ============================================================================
// 类型定义
// ============================================================================

export interface IngredientMatchRequest {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
}

export interface IngredientMatchResult {
  ingredient: IngredientMatchRequest;
  matches: ProductMatch[];
  bestMatch: ProductMatch | null;
  confidence: number;
  matchType: "exact" | "fuzzy" | "category" | "none";
}

export interface ProductMatch {
  product: PlatformProductInfo;
  score: number;
  matchReasons: string[];
}

export interface BatchMatchResult {
  results: IngredientMatchResult[];
  unmatchedCount: number;
  totalConfidence: number;
  cartItems: InstacartCartItem[];
}

// ============================================================================
// 食材映射数据
// ============================================================================

const INGREDIENT_MAPPINGS: Record<string, string[]> = {
  // 蔬菜
  西红柿: ["tomato", "tomatoes", "roma tomato"],
  番茄: ["tomato", "tomatoes", "roma tomato"],
  土豆: ["potato", "potatoes", "russet potato"],
  洋葱: ["onion", "yellow onion", "white onion"],
  大蒜: ["garlic", "garlic cloves", "minced garlic"],
  生姜: ["ginger", "fresh ginger", "ginger root"],
  胡萝卜: ["carrot", "carrots", "baby carrots"],
  青椒: ["green pepper", "bell pepper green"],
  红椒: ["red pepper", "bell pepper red"],
  黄瓜: ["cucumber", "english cucumber"],
  白菜: ["napa cabbage", "chinese cabbage"],
  菠菜: ["spinach", "baby spinach"],
  西兰花: ["broccoli", "broccoli florets"],
  花椰菜: ["cauliflower", "cauliflower florets"],
  芹菜: ["celery", "celery stalks"],
  蘑菇: ["mushroom", "mushrooms", "white mushrooms"],
  豆芽: ["bean sprouts", "mung bean sprouts"],

  // 肉类
  鸡肉: ["chicken", "chicken breast", "chicken thigh"],
  鸡胸肉: ["chicken breast", "boneless chicken breast"],
  鸡腿: ["chicken thigh", "chicken leg"],
  牛肉: ["beef", "ground beef", "beef steak"],
  猪肉: ["pork", "pork loin", "ground pork"],
  五花肉: ["pork belly", "bacon"],
  排骨: ["pork ribs", "spare ribs"],
  羊肉: ["lamb", "lamb chops", "ground lamb"],
  鱼: ["fish", "salmon", "tilapia"],
  三文鱼: ["salmon", "atlantic salmon"],
  虾: ["shrimp", "prawns", "large shrimp"],

  // 蛋奶
  鸡蛋: ["eggs", "large eggs", "organic eggs"],
  牛奶: ["milk", "whole milk", "2% milk"],
  黄油: ["butter", "unsalted butter"],
  奶酪: ["cheese", "cheddar cheese", "mozzarella"],
  酸奶: ["yogurt", "greek yogurt"],

  // 主食
  米饭: ["rice", "white rice", "jasmine rice"],
  面条: ["noodles", "pasta", "spaghetti"],
  面粉: ["flour", "all-purpose flour"],
  面包: ["bread", "white bread", "whole wheat bread"],

  // 调味料
  盐: ["salt", "sea salt", "table salt"],
  糖: ["sugar", "white sugar", "granulated sugar"],
  酱油: ["soy sauce", "low sodium soy sauce"],
  醋: ["vinegar", "rice vinegar", "white vinegar"],
  料酒: ["cooking wine", "shaoxing wine", "rice wine"],
  蚝油: ["oyster sauce"],
  豆瓣酱: ["doubanjiang", "chili bean paste"],
  花椒: ["sichuan peppercorn", "szechuan pepper"],
  八角: ["star anise"],
  桂皮: ["cinnamon", "cinnamon stick"],
  香菜: ["cilantro", "fresh cilantro", "coriander"],
  葱: ["green onion", "scallion", "spring onion"],
  姜: ["ginger", "fresh ginger"],

  // 豆制品
  豆腐: ["tofu", "firm tofu", "silken tofu"],
  豆浆: ["soy milk", "unsweetened soy milk"],

  // 水果
  苹果: ["apple", "apples", "gala apple"],
  香蕉: ["banana", "bananas"],
  橙子: ["orange", "oranges", "navel orange"],
  柠檬: ["lemon", "lemons"],
  葡萄: ["grapes", "red grapes", "green grapes"],
};

const UNIT_CONVERSIONS: Record<string, { instacartUnit: string; multiplier: number }> = {
  克: { instacartUnit: "oz", multiplier: 0.035 },
  g: { instacartUnit: "oz", multiplier: 0.035 },
  千克: { instacartUnit: "lb", multiplier: 2.2 },
  kg: { instacartUnit: "lb", multiplier: 2.2 },
  毫升: { instacartUnit: "fl oz", multiplier: 0.034 },
  ml: { instacartUnit: "fl oz", multiplier: 0.034 },
  升: { instacartUnit: "qt", multiplier: 1.06 },
  l: { instacartUnit: "qt", multiplier: 1.06 },
  个: { instacartUnit: "each", multiplier: 1 },
  只: { instacartUnit: "each", multiplier: 1 },
  根: { instacartUnit: "each", multiplier: 1 },
  片: { instacartUnit: "each", multiplier: 1 },
  勺: { instacartUnit: "tbsp", multiplier: 1 },
  茶匙: { instacartUnit: "tsp", multiplier: 1 },
  汤匙: { instacartUnit: "tbsp", multiplier: 1 },
  杯: { instacartUnit: "cup", multiplier: 1 },
};

// ============================================================================
// 匹配服务实现
// ============================================================================

export class IngredientMatcher {
  private adapter: InstacartAdapter;
  private userCorrections: Map<string, string> = new Map();

  constructor(adapter?: InstacartAdapter) {
    this.adapter = adapter || new InstacartAdapter();
  }

  // --------------------------------------------------------------------------
  // 批量匹配食材
  // --------------------------------------------------------------------------

  async matchIngredients(
    ingredients: IngredientMatchRequest[],
    token: string
  ): Promise<BatchMatchResult> {
    const results: IngredientMatchResult[] = [];
    const cartItems: InstacartCartItem[] = [];
    let unmatchedCount = 0;
    let totalConfidence = 0;

    for (const ingredient of ingredients) {
      const result = await this.matchSingleIngredient(ingredient, token);
      results.push(result);

      if (result.bestMatch) {
        cartItems.push({
          productId: result.bestMatch.product.platformProductId,
          quantity: this.calculateQuantity(ingredient),
          unit: this.convertUnit(ingredient.unit),
        });
        totalConfidence += result.confidence;
      } else {
        unmatchedCount++;
      }
    }

    return {
      results,
      unmatchedCount,
      totalConfidence: results.length > 0 ? totalConfidence / results.length : 0,
      cartItems,
    };
  }

  // --------------------------------------------------------------------------
  // 单个食材匹配
  // --------------------------------------------------------------------------

  async matchSingleIngredient(
    ingredient: IngredientMatchRequest,
    token: string
  ): Promise<IngredientMatchResult> {
    const searchTerms = this.getSearchTerms(ingredient.name);
    const matches: ProductMatch[] = [];

    for (const term of searchTerms) {
      try {
        const searchRequest: ProductSearchRequest = {
          keyword: term,
          pageSize: 5,
          inStock: true,
        };

        const response = await this.adapter.searchProducts(searchRequest, token);

        for (const product of response.products) {
          const score = this.calculateMatchScore(ingredient, product, term);
          if (score > 0.3) {
            matches.push({
              product,
              score,
              matchReasons: this.getMatchReasons(ingredient, product, term),
            });
          }
        }
      } catch (error) {
        console.error(`Search failed for term "${term}":`, error);
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const uniqueMatches = this.deduplicateMatches(matches);
    const bestMatch = uniqueMatches[0] || null;

    return {
      ingredient,
      matches: uniqueMatches.slice(0, 5),
      bestMatch,
      confidence: bestMatch?.score || 0,
      matchType: this.determineMatchType(bestMatch?.score || 0),
    };
  }

  // --------------------------------------------------------------------------
  // 用户纠正映射
  // --------------------------------------------------------------------------

  recordUserCorrection(ingredientName: string, productId: string): void {
    this.userCorrections.set(ingredientName.toLowerCase(), productId);
  }

  getUserCorrection(ingredientName: string): string | undefined {
    return this.userCorrections.get(ingredientName.toLowerCase());
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private getSearchTerms(ingredientName: string): string[] {
    const terms: string[] = [];
    const lowerName = ingredientName.toLowerCase();

    const userCorrection = this.getUserCorrection(lowerName);
    if (userCorrection) {
      terms.push(userCorrection);
    }

    const mappings = INGREDIENT_MAPPINGS[ingredientName] || INGREDIENT_MAPPINGS[lowerName];
    if (mappings) {
      terms.push(...mappings);
    }

    if (terms.length === 0) {
      terms.push(ingredientName);
      if (/[\u4e00-\u9fa5]/.test(ingredientName)) {
        terms.push(this.pinyinFallback(ingredientName));
      }
    }

    return [...new Set(terms)];
  }

  private pinyinFallback(chineseName: string): string {
    return chineseName;
  }

  private calculateMatchScore(
    ingredient: IngredientMatchRequest,
    product: PlatformProductInfo,
    searchTerm: string
  ): number {
    let score = 0;
    const productName = product.name.toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    if (productName === searchLower) {
      score += 0.5;
    } else if (productName.includes(searchLower)) {
      score += 0.3;
    } else if (searchLower.split(" ").some((word) => productName.includes(word))) {
      score += 0.2;
    }

    if (product.isInStock) {
      score += 0.2;
    }

    if (product.rating && product.rating >= 4) {
      score += 0.1;
    }

    if (
      ingredient.category &&
      product.category?.toLowerCase().includes(ingredient.category.toLowerCase())
    ) {
      score += 0.1;
    }

    if (product.reviewCount && product.reviewCount > 100) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  private getMatchReasons(
    ingredient: IngredientMatchRequest,
    product: PlatformProductInfo,
    searchTerm: string
  ): string[] {
    const reasons: string[] = [];
    const productName = product.name.toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    if (productName === searchLower) {
      reasons.push("Exact name match");
    } else if (productName.includes(searchLower)) {
      reasons.push("Name contains search term");
    }

    if (product.isInStock) {
      reasons.push("In stock");
    }

    if (product.rating && product.rating >= 4) {
      reasons.push(`High rating (${product.rating})`);
    }

    return reasons;
  }

  private determineMatchType(score: number): "exact" | "fuzzy" | "category" | "none" {
    if (score >= 0.8) return "exact";
    if (score >= 0.5) return "fuzzy";
    if (score >= 0.3) return "category";
    return "none";
  }

  private deduplicateMatches(matches: ProductMatch[]): ProductMatch[] {
    const seen = new Set<string>();
    return matches.filter((match) => {
      if (seen.has(match.product.platformProductId)) {
        return false;
      }
      seen.add(match.product.platformProductId);
      return true;
    });
  }

  private calculateQuantity(ingredient: IngredientMatchRequest): number {
    const quantity = ingredient.quantity || 1;
    const unit = ingredient.unit?.toLowerCase();

    if (unit && UNIT_CONVERSIONS[unit]) {
      return Math.ceil(quantity * UNIT_CONVERSIONS[unit].multiplier);
    }

    return Math.ceil(quantity);
  }

  private convertUnit(unit?: string): string | undefined {
    if (!unit) return undefined;
    const conversion = UNIT_CONVERSIONS[unit.toLowerCase()];
    return conversion?.instacartUnit;
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const ingredientMatcher = new IngredientMatcher();
