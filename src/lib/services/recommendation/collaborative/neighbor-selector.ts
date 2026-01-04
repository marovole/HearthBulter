import { UserItemMatrix } from "./user-item-matrix";
import {
  SimilarityCalculator,
  SimilarityResult,
  SimilarityMetric,
} from "./similarity-calculator";

interface NeighborSelectionConfig {
  maxNeighbors: number;
  minSimilarity: number;
  minCommonItems: number;
  similarityMetric: SimilarityMetric;
  selectionStrategy: "top_k" | "threshold" | "hybrid";
}

interface Neighbor {
  id: string;
  similarity: number;
  commonItems: number;
  weight: number;
}

export class NeighborSelector {
  private similarityCalculator: SimilarityCalculator;
  private config: NeighborSelectionConfig;

  constructor(config: Partial<NeighborSelectionConfig> = {}) {
    this.similarityCalculator = new SimilarityCalculator();
    this.config = {
      maxNeighbors: 50,
      minSimilarity: 0.1,
      minCommonItems: 3,
      similarityMetric: "cosine",
      selectionStrategy: "top_k",
      ...config,
    };
  }

  /**
   * 选择用户的邻居
   */
  selectUserNeighbors(
    matrix: UserItemMatrix,
    targetUserId: string,
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Neighbor[] {
    const config = { ...this.config, ...customConfig };

    // 获取所有相似用户
    const similarities = this.similarityCalculator.calculateUserSimilarities(
      matrix,
      targetUserId,
      config.similarityMetric,
      config.minCommonItems,
    );

    return this.selectNeighbors(similarities, config);
  }

  /**
   * 选择物品的邻居
   */
  selectItemNeighbors(
    matrix: UserItemMatrix,
    targetItemId: string,
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Neighbor[] {
    const config = { ...this.config, ...customConfig };

    // 获取所有相似物品
    const similarities = this.similarityCalculator.calculateItemSimilarities(
      matrix,
      targetItemId,
      config.similarityMetric,
      config.minCommonItems,
    );

    return this.selectNeighbors(similarities, config);
  }

  /**
   * 批量选择用户邻居
   */
  selectUserNeighborsBatch(
    matrix: UserItemMatrix,
    userIds: string[],
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Map<string, Neighbor[]> {
    const config = { ...this.config, ...customConfig };
    const results = new Map<string, Neighbor[]>();

    userIds.forEach((userId) => {
      const neighbors = this.selectUserNeighbors(matrix, userId, config);
      results.set(userId, neighbors);
    });

    return results;
  }

  /**
   * 批量选择物品邻居
   */
  selectItemNeighborsBatch(
    matrix: UserItemMatrix,
    itemIds: string[],
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Map<string, Neighbor[]> {
    const config = { ...this.config, ...customConfig };
    const results = new Map<string, Neighbor[]>();

    itemIds.forEach((itemId) => {
      const neighbors = this.selectItemNeighbors(matrix, itemId, config);
      results.set(itemId, neighbors);
    });

    return results;
  }

  /**
   * 通用邻居选择逻辑
   */
  private selectNeighbors(
    similarities: SimilarityResult[],
    config: NeighborSelectionConfig,
  ): Neighbor[] {
    let candidates: SimilarityResult[] = [];

    switch (config.selectionStrategy) {
    case "top_k":
      candidates = similarities.slice(0, config.maxNeighbors);
      break;

    case "threshold":
      candidates = similarities.filter(
        (s) => s.similarity >= config.minSimilarity,
      );
      break;

    case "hybrid":
      // 先按阈值过滤，再取前K个
      candidates = similarities
        .filter((s) => s.similarity >= config.minSimilarity)
        .slice(0, config.maxNeighbors);
      break;
    }

    // 转换为Neighbor对象并计算权重
    const neighbors: Neighbor[] = candidates.map((candidate) => ({
      id: candidate.id,
      similarity: candidate.similarity,
      commonItems: candidate.commonItems,
      weight: this.calculateNeighborWeight(candidate, config),
    }));

    return neighbors;
  }

  /**
   * 计算邻居权重
   */
  private calculateNeighborWeight(
    similarity: SimilarityResult,
    config: NeighborSelectionConfig,
  ): number {
    // 基础权重为相似度
    let weight = similarity.similarity;

    // 根据共同项目数量调整权重
    const commonItemBonus =
      Math.log(similarity.commonItems + 1) / Math.log(100); // 归一化到0-1
    weight *= 1 + commonItemBonus * 0.2; // 最多增加20%权重

    // 应用相似度阈值衰减
    if (similarity.similarity < config.minSimilarity * 2) {
      const decayFactor = similarity.similarity / (config.minSimilarity * 2);
      weight *= decayFactor;
    }

    return weight;
  }

  /**
   * 动态调整邻居选择参数
   */
  adaptSelectionParameters(
    matrix: UserItemMatrix,
    targetUserId: string,
    recentRatings: Map<string, number>,
  ): NeighborSelectionConfig {
    const userRatings = matrix.ratings.get(targetUserId);
    if (!userRatings) {
      return this.config;
    }

    const userRatingCount = userRatings.size;
    const adaptedConfig = { ...this.config };

    // 根据用户活跃度调整参数
    if (userRatingCount < 10) {
      // 新用户：降低相似度阈值，增加邻居数量
      adaptedConfig.minSimilarity = Math.max(
        0.05,
        this.config.minSimilarity * 0.5,
      );
      adaptedConfig.maxNeighbors = Math.min(100, this.config.maxNeighbors * 2);
      adaptedConfig.minCommonItems = Math.max(
        1,
        this.config.minCommonItems - 1,
      );
    } else if (userRatingCount > 100) {
      // 活跃用户：提高相似度阈值，减少邻居数量
      adaptedConfig.minSimilarity = Math.min(
        0.3,
        this.config.minSimilarity * 1.5,
      );
      adaptedConfig.maxNeighbors = Math.max(20, this.config.maxNeighbors * 0.7);
    }

    // 根据最近评分的分布调整
    if (recentRatings.size > 0) {
      const avgRating =
        Array.from(recentRatings.values()).reduce((a, b) => a + b, 0) /
        recentRatings.size;

      if (avgRating >= 4.5) {
        // 用户倾向于给高分，可以降低相似度要求
        adaptedConfig.minSimilarity *= 0.9;
      } else if (avgRating <= 2.5) {
        // 用户倾向于给低分，提高相似度要求
        adaptedConfig.minSimilarity *= 1.1;
      }
    }

    return adaptedConfig;
  }

  /**
   * 基于时间衰减的邻居选择
   */
  selectTimeDecayNeighbors(
    matrix: UserItemMatrix,
    targetUserId: string,
    timeDecayFactor: number = 0.1,
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Neighbor[] {
    const config = { ...this.config, ...customConfig };
    const neighbors = this.selectUserNeighbors(matrix, targetUserId, config);

    // 应用时间衰减权重
    const targetUserRatings = matrix.ratings.get(targetUserId);
    if (!targetUserRatings) {
      return neighbors;
    }

    return neighbors.map((neighbor) => {
      const neighborRatings = matrix.ratings.get(neighbor.id);
      if (!neighborRatings) {
        return neighbor;
      }

      // 计算时间衰减权重
      const timeWeight = this.calculateTimeDecayWeight(
        targetUserRatings,
        neighborRatings,
        timeDecayFactor,
      );

      return {
        ...neighbor,
        weight: neighbor.weight * timeWeight,
      };
    });
  }

  /**
   * 计算时间衰减权重
   */
  private calculateTimeDecayWeight(
    userRatings: Map<string, number>,
    neighborRatings: Map<string, number>,
    decayFactor: number,
  ): number {
    const commonItems = Array.from(userRatings.keys()).filter((item) =>
      neighborRatings.has(item),
    );

    if (commonItems.length === 0) {
      return 1;
    }

    // 简化实现：基于共同项目数量计算时间权重
    // 实际应用中应该考虑评分的时间戳
    const recencyBonus = Math.min(commonItems.length / 10, 1);
    return 1 + recencyBonus * decayFactor;
  }

  /**
   * 基于多样性的邻居选择
   */
  selectDiverseNeighbors(
    matrix: UserItemMatrix,
    targetUserId: string,
    diversityThreshold: number = 0.8,
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Neighbor[] {
    const config = { ...this.config, ...customConfig };
    const allNeighbors = this.selectUserNeighbors(matrix, targetUserId, config);

    const diverseNeighbors: Neighbor[] = [];
    const selectedNeighborIds = new Set<string>();

    // 贪心算法选择多样化邻居
    for (const neighbor of allNeighbors) {
      if (diverseNeighbors.length >= config.maxNeighbors) {
        break;
      }

      // 检查与已选邻居的相似度
      let isDiverseEnough = true;

      for (const selectedId of selectedNeighborIds) {
        const similarity = this.similarityCalculator.calculateUserSimilarity(
          matrix,
          neighbor.id,
          selectedId,
          config.similarityMetric,
        );

        if (similarity > diversityThreshold) {
          isDiverseEnough = false;
          break;
        }
      }

      if (isDiverseEnough) {
        diverseNeighbors.push(neighbor);
        selectedNeighborIds.add(neighbor.id);
      }
    }

    return diverseNeighbors;
  }

  /**
   * 基于聚类的邻居选择
   */
  selectClusterBasedNeighbors(
    matrix: UserItemMatrix,
    targetUserId: string,
    clusterSize: number = 20,
    customConfig?: Partial<NeighborSelectionConfig>,
  ): Neighbor[] {
    // 简化实现：基于相似度聚类
    const allNeighbors = this.selectUserNeighbors(
      matrix,
      targetUserId,
      customConfig,
    );

    if (allNeighbors.length <= clusterSize) {
      return allNeighbors;
    }

    // 使用简单的层次聚类思想
    const clusters = this.performSimpleClustering(allNeighbors, clusterSize);

    // 从每个聚类中选择最佳邻居
    const selectedNeighbors: Neighbor[] = [];

    clusters.forEach((cluster) => {
      const bestNeighbor = cluster.reduce((best, current) =>
        current.weight > best.weight ? current : best,
      );
      selectedNeighbors.push(bestNeighbor);
    });

    return selectedNeighbors.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 简单聚类实现
   */
  private performSimpleClustering(
    neighbors: Neighbor[],
    targetClusterSize: number,
  ): Neighbor[][] {
    const clusters: Neighbor[][] = [];
    const used = new Set<string>();

    // 按权重排序
    const sortedNeighbors = [...neighbors].sort((a, b) => b.weight - a.weight);

    for (const neighbor of sortedNeighbors) {
      if (used.has(neighbor.id)) {
        continue;
      }

      // 创建新聚类
      const cluster = [neighbor];
      used.add(neighbor.id);

      // 寻找相似的其他邻居加入聚类
      for (const other of sortedNeighbors) {
        if (used.has(other.id) || cluster.length >= targetClusterSize) {
          break;
        }

        // 简化：基于权重差异判断是否属于同一聚类
        const weightDiff = Math.abs(neighbor.weight - other.weight);
        if (weightDiff < 0.1) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * 验证邻居质量
   */
  validateNeighbors(
    matrix: UserItemMatrix,
    targetUserId: string,
    neighbors: Neighbor[],
  ): {
    isValid: boolean;
    issues: string[];
    metrics: {
      avgSimilarity: number;
      avgCommonItems: number;
      coverage: number;
    };
  } {
    const issues: string[] = [];

    if (neighbors.length === 0) {
      issues.push("No neighbors found");
    }

    const avgSimilarity =
      neighbors.reduce((sum, n) => sum + n.similarity, 0) / neighbors.length;
    const avgCommonItems =
      neighbors.reduce((sum, n) => sum + n.commonItems, 0) / neighbors.length;

    // 计算覆盖率：邻居覆盖的目标用户评分物品比例
    const targetRatings = matrix.ratings.get(targetUserId);
    let coverage = 0;

    if (targetRatings && targetRatings.size > 0) {
      const coveredItems = new Set<string>();

      neighbors.forEach((neighbor) => {
        const neighborRatings = matrix.ratings.get(neighbor.id);
        if (neighborRatings) {
          neighborRatings.forEach((_, itemId) => {
            if (targetRatings.has(itemId)) {
              coveredItems.add(itemId);
            }
          });
        }
      });

      coverage = coveredItems.size / targetRatings.size;
    }

    // 验证规则
    if (avgSimilarity < this.config.minSimilarity) {
      issues.push(
        `Average similarity ${avgSimilarity.toFixed(3)} below threshold ${this.config.minSimilarity}`,
      );
    }

    if (avgCommonItems < this.config.minCommonItems) {
      issues.push(
        `Average common items ${avgCommonItems.toFixed(1)} below threshold ${this.config.minCommonItems}`,
      );
    }

    if (coverage < 0.3) {
      issues.push(`Coverage ${coverage.toFixed(3)} too low`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      metrics: {
        avgSimilarity,
        avgCommonItems,
        coverage,
      },
    };
  }

  /**
   * 获取配置
   */
  getConfig(): NeighborSelectionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<NeighborSelectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
