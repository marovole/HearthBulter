/**
 * Convex Food Repository 实现
 *
 * 基于 Convex 实现食材数据访问层，替代 Neon SQL 实现
 *
 * 映射关系：
 *   findById        → budget.getFoodById
 *   searchFoods     → tracking.searchFoods (搜索) + budget.getFoodsByCategory (分类) + 客户端分页
 *   findPopular     → budget.getPopularFoods
 *   listByCategory  → budget.getFoodsByCategory + 客户端切片
 *   countByCategory → budget.getFoodsByCategory → .length
 *
 * @module convex-food-repository
 */

import type { FoodCategory } from "@/lib/types/meal";
import type {
  FoodRecord,
  FoodRepository,
  FoodSearchQuery,
  FoodSearchResult,
} from "@/lib/repositories/interfaces/food-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// ─── Convex 文档类型 ──────────────────────────────────────────

type FoodDoc = Doc<"foods">;

// ─── 映射函数 ─────────────────────────────────────────────────

function mapFoodDoc(doc: FoodDoc): FoodRecord {
  return {
    id: doc._id as string,
    name: doc.name,
    nameEn: doc.nameEn ?? null,
    aliases: Array.isArray(doc.aliases) ? doc.aliases : [],
    calories: doc.calories,
    protein: doc.protein,
    carbs: doc.carbs,
    fat: doc.fat,
    fiber: doc.fiber ?? null,
    category: doc.category as FoodCategory,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    source: doc.source as "USDA" | "LOCAL" | "USER_SUBMITTED",
    verified: doc.verified,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

// ─── Repository 实现 ──────────────────────────────────────────

export class ConvexFoodRepository implements FoodRepository {
  async findById(id: string): Promise<FoodRecord | null> {
    const doc = await convexClient.query<FoodDoc | null>(api.budget.getFoodById, {
      foodId: id as Id<"foods">,
    });

    if (!doc) return null;
    return mapFoodDoc(doc);
  }

  async searchFoods(params: FoodSearchQuery): Promise<FoodSearchResult> {
    const { query, category, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    if (!query && !category) {
      return { foods: [], total: 0, page, limit };
    }

    let allFoods: FoodDoc[];

    if (query) {
      // 搜索关键词 → tracking.searchFoods（substring 匹配 + alias 匹配）
      const searchLimit = 200; // 宽裕取回，客户端再分页
      const results = await convexClient.query<FoodDoc[]>(api.tracking.searchFoods, {
        query,
        limit: searchLimit,
      });

      if (category) {
        allFoods = results.filter((f) => f.category === category);
      } else {
        allFoods = results;
      }
    } else {
      // 仅分类过滤 → budget.getFoodsByCategory
      allFoods = await convexClient.query<FoodDoc[]>(api.budget.getFoodsByCategory, {
        category,
        limit: 1000,
      });
    }

    // 按名称排序 + 客户端分页
    allFoods.sort((a, b) => a.name.localeCompare(b.name));

    const total = allFoods.length;
    const paged = allFoods.slice(offset, offset + limit);

    return {
      foods: paged.map(mapFoodDoc),
      total,
      page,
      limit,
    };
  }

  async findPopular(limit: number): Promise<FoodRecord[]> {
    const docs = await convexClient.query<FoodDoc[]>(api.budget.getPopularFoods, { limit });

    return docs.map(mapFoodDoc);
  }

  async listByCategory(category: FoodCategory, from: number, to: number): Promise<FoodRecord[]> {
    const docs = await convexClient.query<FoodDoc[]>(api.budget.getFoodsByCategory, {
      category,
      limit: 1000,
    });

    // 按名称排序 + 切片分页
    docs.sort((a, b) => a.name.localeCompare(b.name));
    const sliced = docs.slice(from, to + 1);

    return sliced.map(mapFoodDoc);
  }

  async countByCategory(category: FoodCategory): Promise<number> {
    const docs = await convexClient.query<FoodDoc[]>(api.budget.getFoodsByCategory, {
      category,
      limit: 1000,
    });

    return docs.length;
  }
}
