import { UserItemMatrix } from "./user-item-matrix";

export type SimilarityMetric =
  | "cosine"
  | "pearson"
  | "jaccard"
  | "adjusted_cosine"
  | "euclidean";

interface SimilarityResult {
  id: string;
  similarity: number;
  commonItems: number;
}

export class SimilarityCalculator {
  private similarityCache = new Map<string, Map<string, number>>();
  private cacheExpiry = 60 * 60 * 1000; // 1小时缓存

  /**
   * 计算用户相似度
   */
  calculateUserSimilarity(
    matrix: UserItemMatrix,
    user1Id: string,
    user2Id: string,
    metric: SimilarityMetric = "cosine",
  ): number {
    const cacheKey = `user_${user1Id}_${user2Id}_${metric}`;

    // 检查缓存
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!.get(user2Id) || 0;
    }

    const user1Ratings = matrix.ratings.get(user1Id);
    const user2Ratings = matrix.ratings.get(user2Id);

    if (!user1Ratings || !user2Ratings) {
      return 0;
    }

    let similarity = 0;

    switch (metric) {
    case "cosine":
      similarity = this.cosineSimilarity(user1Ratings, user2Ratings);
      break;
    case "pearson":
      similarity = this.pearsonCorrelation(matrix, user1Id, user2Id);
      break;
    case "jaccard":
      similarity = this.jaccardSimilarity(user1Ratings, user2Ratings);
      break;
    case "adjusted_cosine":
      similarity = this.adjustedCosineSimilarity(matrix, user1Id, user2Id);
      break;
    case "euclidean":
      similarity = this.euclideanSimilarity(user1Ratings, user2Ratings);
      break;
    default:
      similarity = this.cosineSimilarity(user1Ratings, user2Ratings);
    }

    // 缓存结果
    if (!this.similarityCache.has(cacheKey)) {
      this.similarityCache.set(cacheKey, new Map());
    }
    this.similarityCache.get(cacheKey)!.set(user2Id, similarity);

    return similarity;
  }

  /**
   * 计算物品相似度
   */
  calculateItemSimilarity(
    matrix: UserItemMatrix,
    item1Id: string,
    item2Id: string,
    metric: SimilarityMetric = "cosine",
  ): number {
    const cacheKey = `item_${item1Id}_${item2Id}_${metric}`;

    // 检查缓存
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!.get(item2Id) || 0;
    }

    const item1Ratings = this.getItemRatings(matrix, item1Id);
    const item2Ratings = this.getItemRatings(matrix, item2Id);

    if (item1Ratings.size === 0 || item2Ratings.size === 0) {
      return 0;
    }

    let similarity = 0;

    switch (metric) {
    case "cosine":
      similarity = this.cosineSimilarity(item1Ratings, item2Ratings);
      break;
    case "pearson":
      similarity = this.pearsonCorrelationForItems(matrix, item1Id, item2Id);
      break;
    case "jaccard":
      similarity = this.jaccardSimilarity(item1Ratings, item2Ratings);
      break;
    case "adjusted_cosine":
      similarity = this.adjustedCosineSimilarityForItems(
        matrix,
        item1Id,
        item2Id,
      );
      break;
    case "euclidean":
      similarity = this.euclideanSimilarity(item1Ratings, item2Ratings);
      break;
    default:
      similarity = this.cosineSimilarity(item1Ratings, item2Ratings);
    }

    // 缓存结果
    if (!this.similarityCache.has(cacheKey)) {
      this.similarityCache.set(cacheKey, new Map());
    }
    this.similarityCache.get(cacheKey)!.set(item2Id, similarity);

    return similarity;
  }

  /**
   * 批量计算用户相似度
   */
  calculateUserSimilarities(
    matrix: UserItemMatrix,
    targetUserId: string,
    metric: SimilarityMetric = "cosine",
    minCommonItems: number = 3,
  ): SimilarityResult[] {
    const targetRatings = matrix.ratings.get(targetUserId);
    if (!targetRatings) {
      return [];
    }

    const similarities: SimilarityResult[] = [];

    matrix.ratings.forEach((userRatings, userId) => {
      if (userId === targetUserId) return;

      const commonItems = this.getCommonItemCount(targetRatings, userRatings);
      if (commonItems < minCommonItems) return;

      const similarity = this.calculateUserSimilarity(
        matrix,
        targetUserId,
        userId,
        metric,
      );

      similarities.push({
        id: userId,
        similarity,
        commonItems,
      });
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .filter((s) => s.similarity > 0);
  }

  /**
   * 批量计算物品相似度
   */
  calculateItemSimilarities(
    matrix: UserItemMatrix,
    targetItemId: string,
    metric: SimilarityMetric = "cosine",
    minCommonUsers: number = 3,
  ): SimilarityResult[] {
    const targetRatings = this.getItemRatings(matrix, targetItemId);
    if (targetRatings.size === 0) {
      return [];
    }

    const similarities: SimilarityResult[] = [];

    matrix.items.forEach((itemId) => {
      if (itemId === targetItemId) return;

      const itemRatings = this.getItemRatings(matrix, itemId);
      const commonUsers = this.getCommonItemCount(targetRatings, itemRatings);
      if (commonUsers < minCommonUsers) return;

      const similarity = this.calculateItemSimilarity(
        matrix,
        targetItemId,
        itemId,
        metric,
      );

      similarities.push({
        id: itemId,
        similarity,
        commonItems: commonUsers,
      });
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .filter((s) => s.similarity > 0);
  }

  /**
   * 余弦相似度
   */
  private cosineSimilarity(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>,
  ): number {
    const commonItems = this.getCommonItems(ratings1, ratings2);

    if (commonItems.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonItems.forEach((item) => {
      const rating1 = ratings1.get(item)!;
      const rating2 = ratings2.get(item)!;

      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    });

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 皮尔逊相关系数
   */
  private pearsonCorrelation(
    matrix: UserItemMatrix,
    user1Id: string,
    user2Id: string,
  ): number {
    const user1Ratings = matrix.ratings.get(user1Id);
    const user2Ratings = matrix.ratings.get(user2Id);

    if (!user1Ratings || !user2Ratings) {
      return 0;
    }

    const commonItems = this.getCommonItems(user1Ratings, user2Ratings);
    if (commonItems.length < 2) {
      return 0;
    }

    const user1Avg = matrix.userAverages.get(user1Id) || 0;
    const user2Avg = matrix.userAverages.get(user2Id) || 0;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    commonItems.forEach((item) => {
      const rating1 = user1Ratings.get(item)!;
      const rating2 = user2Ratings.get(item)!;

      const diff1 = rating1 - user1Avg;
      const diff2 = rating2 - user2Avg;

      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    });

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  }

  /**
   * 杰卡德相似度
   */
  private jaccardSimilarity(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>,
  ): number {
    const commonItems = this.getCommonItems(ratings1, ratings2);
    const allItems = new Set([...ratings1.keys(), ...ratings2.keys()]);

    return allItems.size === 0 ? 0 : commonItems.length / allItems.size;
  }

  /**
   * 调整余弦相似度（基于用户平均分）
   */
  private adjustedCosineSimilarity(
    matrix: UserItemMatrix,
    user1Id: string,
    user2Id: string,
  ): number {
    const user1Ratings = matrix.ratings.get(user1Id);
    const user2Ratings = matrix.ratings.get(user2Id);

    if (!user1Ratings || !user2Ratings) {
      return 0;
    }

    const commonItems = this.getCommonItems(user1Ratings, user2Ratings);
    if (commonItems.length === 0) {
      return 0;
    }

    const user1Avg = matrix.userAverages.get(user1Id) || 0;
    const user2Avg = matrix.userAverages.get(user2Id) || 0;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    commonItems.forEach((item) => {
      const adjustedRating1 = user1Ratings.get(item)! - user1Avg;
      const adjustedRating2 = user2Ratings.get(item)! - user2Avg;

      numerator += adjustedRating1 * adjustedRating2;
      denominator1 += adjustedRating1 * adjustedRating1;
      denominator2 += adjustedRating2 * adjustedRating2;
    });

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  }

  /**
   * 欧几里得距离相似度
   */
  private euclideanSimilarity(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>,
  ): number {
    const commonItems = this.getCommonItems(ratings1, ratings2);
    if (commonItems.length === 0) {
      return 0;
    }

    let distance = 0;

    commonItems.forEach((item) => {
      const rating1 = ratings1.get(item)!;
      const rating2 = ratings2.get(item)!;

      distance += Math.pow(rating1 - rating2, 2);
    });

    // 转换距离为相似度（距离越小，相似度越高）
    return 1 / (1 + Math.sqrt(distance / commonItems.length));
  }

  /**
   * 物品的皮尔逊相关系数
   */
  private pearsonCorrelationForItems(
    matrix: UserItemMatrix,
    item1Id: string,
    item2Id: string,
  ): number {
    const item1Ratings = this.getItemRatings(matrix, item1Id);
    const item2Ratings = this.getItemRatings(matrix, item2Id);

    if (item1Ratings.size === 0 || item2Ratings.size === 0) {
      return 0;
    }

    const commonUsers = this.getCommonItems(item1Ratings, item2Ratings);
    if (commonUsers.length < 2) {
      return 0;
    }

    const item1Avg = matrix.itemAverages.get(item1Id) || 0;
    const item2Avg = matrix.itemAverages.get(item2Id) || 0;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    commonUsers.forEach((user) => {
      const rating1 = item1Ratings.get(user)!;
      const rating2 = item2Ratings.get(user)!;

      const diff1 = rating1 - item1Avg;
      const diff2 = rating2 - item2Avg;

      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    });

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  }

  /**
   * 物品的调整余弦相似度
   */
  private adjustedCosineSimilarityForItems(
    matrix: UserItemMatrix,
    item1Id: string,
    item2Id: string,
  ): number {
    const item1Ratings = this.getItemRatings(matrix, item1Id);
    const item2Ratings = this.getItemRatings(matrix, item2Id);

    if (item1Ratings.size === 0 || item2Ratings.size === 0) {
      return 0;
    }

    const commonUsers = this.getCommonItems(item1Ratings, item2Ratings);
    if (commonUsers.length === 0) {
      return 0;
    }

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    commonUsers.forEach((user) => {
      const rating1 = item1Ratings.get(user)!;
      const rating2 = item2Ratings.get(user)!;
      const userAvg = matrix.userAverages.get(user) || 0;

      const adjustedRating1 = rating1 - userAvg;
      const adjustedRating2 = rating2 - userAvg;

      numerator += adjustedRating1 * adjustedRating2;
      denominator1 += adjustedRating1 * adjustedRating1;
      denominator2 += adjustedRating2 * adjustedRating2;
    });

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
  }

  /**
   * 获取物品评分
   */
  private getItemRatings(
    matrix: UserItemMatrix,
    itemId: string,
  ): Map<string, number> {
    const itemRatings = new Map<string, number>();

    matrix.ratings.forEach((userRatings, userId) => {
      if (userRatings.has(itemId)) {
        itemRatings.set(userId, userRatings.get(itemId)!);
      }
    });

    return itemRatings;
  }

  /**
   * 获取共同评分的物品
   */
  private getCommonItems(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>,
  ): string[] {
    return Array.from(ratings1.keys()).filter((item) => ratings2.has(item));
  }

  /**
   * 获取共同评分数量
   */
  private getCommonItemCount(
    ratings1: Map<string, number>,
    ratings2: Map<string, number>,
  ): number {
    return this.getCommonItems(ratings1, ratings2).length;
  }

  /**
   * 计算相似度矩阵（用于批量计算）
   */
  calculateSimilarityMatrix(
    matrix: UserItemMatrix,
    type: "user" | "item",
    metric: SimilarityMetric = "cosine",
    minCommonRatings: number = 3,
  ): Map<string, Map<string, number>> {
    const similarityMatrix = new Map<string, Map<string, number>>();
    const ids = type === "user" ? matrix.users : matrix.items;

    ids.forEach((id1) => {
      const similarities = new Map<string, number>();

      ids.forEach((id2) => {
        if (id1 === id2) {
          similarities.set(id2, 1.0);
        } else {
          const similarity =
            type === "user"
              ? this.calculateUserSimilarity(matrix, id1, id2, metric)
              : this.calculateItemSimilarity(matrix, id1, id2, metric);

          // 检查共同评分数量
          const commonCount =
            type === "user"
              ? this.getCommonItemCount(
                matrix.ratings.get(id1) || new Map(),
                matrix.ratings.get(id2) || new Map(),
              )
              : this.getCommonItemCount(
                this.getItemRatings(matrix, id1),
                this.getItemRatings(matrix, id2),
              );

          if (commonCount >= minCommonRatings) {
            similarities.set(id2, similarity);
          }
        }
      });

      similarityMatrix.set(id1, similarities);
    });

    return similarityMatrix;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.similarityCache.clear();
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.similarityCache.size,
      keys: Array.from(this.similarityCache.keys()),
    };
  }

  /**
   * 预计算相似度（用于热门用户/物品）
   */
  async precomputeSimilarities(
    matrix: UserItemMatrix,
    type: "user" | "item",
    topK: number = 50,
    metric: SimilarityMetric = "cosine",
  ): Promise<Map<string, SimilarityResult[]>> {
    const results = new Map<string, SimilarityResult[]>();
    const ids = type === "user" ? matrix.users : matrix.items;

    for (const id of ids) {
      const similarities =
        type === "user"
          ? this.calculateUserSimilarities(matrix, id, metric)
          : this.calculateItemSimilarities(matrix, id, metric);

      results.set(id, similarities.slice(0, topK));
    }

    return results;
  }
}
