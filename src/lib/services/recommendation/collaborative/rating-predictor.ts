import { UserItemMatrix } from './user-item-matrix';
import { SimilarityCalculator } from './similarity-calculator';
import { NeighborSelector, Neighbor } from './neighbor-selector';

export interface PredictionResult {
  itemId: string;
  predictedRating: number;
  confidence: number;
  method: string;
  neighborCount: number;
}

export interface PredictionConfig {
  method: 'user_based' | 'item_based' | 'hybrid' | 'matrix_factorization';
  minNeighbors: number;
  maxNeighbors: number;
  confidenceThreshold: number;
  fallbackToGlobal: boolean;
}

export class RatingPredictor {
  private similarityCalculator: SimilarityCalculator;
  private neighborSelector: NeighborSelector;
  private config: PredictionConfig;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.similarityCalculator = new SimilarityCalculator();
    this.neighborSelector = new NeighborSelector();
    this.config = {
      method: 'hybrid',
      minNeighbors: 3,
      maxNeighbors: 50,
      confidenceThreshold: 0.3,
      fallbackToGlobal: true,
      ...config
    };
  }

  /**
   * 预测用户对物品的评分
   */
  async predictRating(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    customConfig?: Partial<PredictionConfig>
  ): Promise<PredictionResult> {
    const config = { ...this.config, ...customConfig };

    // 检查用户是否已经评分过该物品
    const userRatings = matrix.ratings.get(userId);
    if (userRatings && userRatings.has(itemId)) {
      return {
        itemId,
        predictedRating: userRatings.get(itemId)!,
        confidence: 1.0,
        method: 'existing',
        neighborCount: 0
      };
    }

    let prediction: PredictionResult;

    switch (config.method) {
      case 'user_based':
        prediction = this.predictUserBased(matrix, userId, itemId, config);
        break;
      case 'item_based':
        prediction = this.predictItemBased(matrix, userId, itemId, config);
        break;
      case 'hybrid':
        prediction = await this.predictHybrid(matrix, userId, itemId, config);
        break;
      case 'matrix_factorization':
        prediction = await this.predictMatrixFactorization(matrix, userId, itemId, config);
        break;
      default:
        prediction = this.predictUserBased(matrix, userId, itemId, config);
    }

    // 如果置信度太低，使用全局平均分作为后备
    if (prediction.confidence < config.confidenceThreshold && config.fallbackToGlobal) {
      prediction = this.fallbackToGlobalAverage(matrix, itemId, prediction);
    }

    return prediction;
  }

  /**
   * 批量预测评分
   */
  async predictRatingsBatch(
    matrix: UserItemMatrix,
    userId: string,
    itemIds: string[],
    customConfig?: Partial<PredictionConfig>
  ): Promise<PredictionResult[]> {
    const config = { ...this.config, ...customConfig };
    const predictions: PredictionResult[] = [];

    // 根据方法选择批量预测策略
    if (config.method === 'user_based' || config.method === 'item_based') {
      // 预计算邻居，提高效率
      const neighbors = config.method === 'user_based'
        ? this.neighborSelector.selectUserNeighbors(matrix, userId, {
            maxNeighbors: config.maxNeighbors,
            minCommonItems: config.minNeighbors
          })
        : [];

      for (const itemId of itemIds) {
        const prediction = config.method === 'user_based'
          ? this.predictUserBasedWithNeighbors(matrix, userId, itemId, neighbors, config)
          : this.predictItemBased(matrix, userId, itemId, config);
        
        predictions.push(prediction);
      }
    } else {
      // 其他方法逐个预测
      for (const itemId of itemIds) {
        const prediction = await this.predictRating(matrix, userId, itemId, config);
        predictions.push(prediction);
      }
    }

    return predictions;
  }

  /**
   * 基于用户的预测
   */
  private predictUserBased(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    config: PredictionConfig
  ): PredictionResult {
    const neighbors = this.neighborSelector.selectUserNeighbors(matrix, userId, {
      maxNeighbors: config.maxNeighbors,
      minCommonItems: config.minNeighbors
    });

    return this.predictUserBasedWithNeighbors(matrix, userId, itemId, neighbors, config);
  }

  /**
   * 使用预计算邻居的基于用户预测
   */
  private predictUserBasedWithNeighbors(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    neighbors: Neighbor[],
    config: PredictionConfig
  ): PredictionResult {
    if (neighbors.length < config.minNeighbors) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'user_based',
        neighborCount: neighbors.length
      });
    }

    const userAvg = matrix.userAverages.get(userId) || matrix.globalAverage;
    let numerator = 0;
    let denominator = 0;
    let validNeighbors = 0;

    neighbors.forEach(neighbor => {
      const neighborRatings = matrix.ratings.get(neighbor.id);
      if (!neighborRatings || !neighborRatings.has(itemId)) {
        return;
      }

      const neighborAvg = matrix.userAverages.get(neighbor.id) || matrix.globalAverage;
      const neighborRating = neighborRatings.get(itemId)!;
      const ratingDiff = neighborRating - neighborAvg;

      numerator += neighbor.weight * ratingDiff;
      denominator += Math.abs(neighbor.weight);
      validNeighbors++;
    });

    if (denominator === 0 || validNeighbors < config.minNeighbors) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'user_based',
        neighborCount: validNeighbors
      });
    }

    const predictedRating = userAvg + (numerator / denominator);
    const confidence = this.calculatePredictionConfidence(validNeighbors, neighbors.length);

    return {
      itemId,
      predictedRating: Math.max(1, Math.min(5, predictedRating)), // 限制在1-5范围内
      confidence,
      method: 'user_based',
      neighborCount: validNeighbors
    };
  }

  /**
   * 基于物品的预测
   */
  private predictItemBased(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    config: PredictionConfig
  ): PredictionResult {
    const userRatings = matrix.ratings.get(userId);
    if (!userRatings || userRatings.size === 0) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'item_based',
        neighborCount: 0
      });
    }

    // 找到与目标物品相似的物品
    const similarItems = this.neighborSelector.selectItemNeighbors(matrix, itemId, {
      maxNeighbors: config.maxNeighbors,
      minCommonItems: config.minNeighbors
    });

    if (similarItems.length < config.minNeighbors) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'item_based',
        neighborCount: similarItems.length
      });
    }

    const itemAvg = matrix.itemAverages.get(itemId) || matrix.globalAverage;
    let numerator = 0;
    let denominator = 0;
    let validItems = 0;

    similarItems.forEach(similarItem => {
      if (!userRatings.has(similarItem.id)) {
        return;
      }

      const userRating = userRatings.get(similarItem.id)!;
      const similarItemAvg = matrix.itemAverages.get(similarItem.id) || matrix.globalAverage;
      const ratingDiff = userRating - similarItemAvg;

      numerator += similarItem.weight * ratingDiff;
      denominator += Math.abs(similarItem.weight);
      validItems++;
    });

    if (denominator === 0 || validItems < config.minNeighbors) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'item_based',
        neighborCount: validItems
      });
    }

    const predictedRating = itemAvg + (numerator / denominator);
    const confidence = this.calculatePredictionConfidence(validItems, similarItems.length);

    return {
      itemId,
      predictedRating: Math.max(1, Math.min(5, predictedRating)),
      confidence,
      method: 'item_based',
      neighborCount: validItems
    };
  }

  /**
   * 混合预测方法
   */
  private async predictHybrid(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    config: PredictionConfig
  ): Promise<PredictionResult> {
    const userBased = this.predictUserBased(matrix, userId, itemId, config);
    const itemBased = this.predictItemBased(matrix, userId, itemId, config);

    // 根据置信度加权平均
    const totalWeight = userBased.confidence + itemBased.confidence;
    
    if (totalWeight === 0) {
      return this.fallbackToGlobalAverage(matrix, itemId, {
        itemId,
        predictedRating: 0,
        confidence: 0,
        method: 'hybrid',
        neighborCount: 0
      });
    }

    const userWeight = userBased.confidence / totalWeight;
    const itemWeight = itemBased.confidence / totalWeight;

    const predictedRating = userBased.predictedRating * userWeight + itemBased.predictedRating * itemWeight;
    const confidence = Math.max(userBased.confidence, itemBased.confidence);

    return {
      itemId,
      predictedRating: Math.max(1, Math.min(5, predictedRating)),
      confidence,
      method: 'hybrid',
      neighborCount: userBased.neighborCount + itemBased.neighborCount
    };
  }

  /**
   * 基于矩阵分解的预测
   */
  private async predictMatrixFactorization(
    matrix: UserItemMatrix,
    userId: string,
    itemId: string,
    config: PredictionConfig
  ): Promise<PredictionResult> {
    // 这里应该使用预计算的矩阵分解结果
    // 简化实现：返回基于物品平均分的预测
    const itemAvg = matrix.itemAverages.get(itemId) || matrix.globalAverage;
    const userAvg = matrix.userAverages.get(userId) || matrix.globalAverage;

    // 简单的矩阵分解预测：用户平均分 + 物品偏差
    const itemBias = itemAvg - matrix.globalAverage;
    const predictedRating = userAvg + itemBias * 0.5; // 调整系数

    // 计算置信度（基于物品评分数量）
    const itemRatingCount = this.getItemRatingCount(matrix, itemId);
    const confidence = Math.min(itemRatingCount / 50, 1.0);

    return {
      itemId,
      predictedRating: Math.max(1, Math.min(5, predictedRating)),
      confidence,
      method: 'matrix_factorization',
      neighborCount: 0
    };
  }

  /**
   * 后备到全局平均分
   */
  private fallbackToGlobalAverage(
    matrix: UserItemMatrix,
    itemId: string,
    originalPrediction: PredictionResult
  ): PredictionResult {
    const itemAvg = matrix.itemAverages.get(itemId) || matrix.globalAverage;

    return {
      ...originalPrediction,
      predictedRating: itemAvg,
      confidence: 0.1, // 低置信度
      method: originalPrediction.method + '_fallback'
    };
  }

  /**
   * 计算预测置信度
   */
  private calculatePredictionConfidence(
    validNeighbors: number,
    totalNeighbors: number
  ): number {
    // 基于有效邻居比例计算置信度
    const neighborRatio = validNeighbors / Math.max(totalNeighbors, 1);
    
    // 基于邻居数量计算置信度
    const countConfidence = Math.min(validNeighbors / 20, 1.0);
    
    // 综合置信度
    return (neighborRatio * 0.4 + countConfidence * 0.6);
  }

  /**
   * 获取物品评分数量
   */
  private getItemRatingCount(matrix: UserItemMatrix, itemId: string): number {
    let count = 0;
    matrix.ratings.forEach(userRatings => {
      if (userRatings.has(itemId)) {
        count++;
      }
    });
    return count;
  }

  /**
   * 预测Top-N推荐
   */
  async predictTopN(
    matrix: UserItemMatrix,
    userId: string,
    candidateItemIds: string[],
    n: number = 10,
    customConfig?: Partial<PredictionConfig>
  ): Promise<PredictionResult[]> {
    const predictions = await this.predictRatingsBatch(matrix, userId, candidateItemIds, customConfig);
    
    return predictions
      .sort((a, b) => {
        // 首先按预测评分排序，然后按置信度排序
        if (b.predictedRating !== a.predictedRating) {
          return b.predictedRating - a.predictedRating;
        }
        return b.confidence - a.confidence;
      })
      .slice(0, n);
  }

  /**
   * 评估预测准确性
   */
  evaluatePredictions(
    matrix: UserItemMatrix,
    userId: string,
    testRatings: Map<string, number>,
    customConfig?: Partial<PredictionConfig>
  ): {
    mae: number; // Mean Absolute Error
    rmse: number; // Root Mean Square Error
    coverage: number; // 预测覆盖率
    precision: number; // 精确率（Top-5）
    recall: number; // 召回率（Top-5）
  } {
    const testItemIds = Array.from(testRatings.keys());
    const predictions = this.predictRatingsBatchSync(matrix, userId, testItemIds, customConfig);
    
    let absoluteErrorSum = 0;
    let squaredErrorSum = 0;
    let validPredictions = 0;

    predictions.forEach(prediction => {
      const actualRating = testRatings.get(prediction.itemId);
      if (actualRating !== undefined && prediction.confidence > 0) {
        const error = Math.abs(prediction.predictedRating - actualRating);
        absoluteErrorSum += error;
        squaredErrorSum += error * error;
        validPredictions++;
      }
    });

    const mae = validPredictions > 0 ? absoluteErrorSum / validPredictions : 0;
    const rmse = validPredictions > 0 ? Math.sqrt(squaredErrorSum / validPredictions) : 0;
    const coverage = validPredictions / testItemIds.length;

    // 计算Top-5精确率和召回率
    const top5Predictions = predictions
      .filter(p => p.confidence > 0)
      .sort((a, b) => b.predictedRating - a.predictedRating)
      .slice(0, 5);

    const top5Items = new Set(top5Predictions.map(p => p.itemId));
    const relevantItems = new Set(testItemIds.filter(id => (testRatings.get(id) || 0) >= 4));
    const top5Relevant = new Set(Array.from(top5Items).filter(id => relevantItems.has(id)));

    const precision = top5Items.size > 0 ? top5Relevant.size / top5Items.size : 0;
    const recall = relevantItems.size > 0 ? top5Relevant.size / relevantItems.size : 0;

    return { mae, rmse, coverage, precision, recall };
  }

  /**
   * 同步批量预测（用于评估）
   */
  private predictRatingsBatchSync(
    matrix: UserItemMatrix,
    userId: string,
    itemIds: string[],
    customConfig?: Partial<PredictionConfig>
  ): PredictionResult[] {
    const predictions: PredictionResult[] = [];
    
    for (const itemId of itemIds) {
      const prediction = this.predictUserBased(matrix, userId, itemId, { ...this.config, ...customConfig });
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * 获取配置
   */
  getConfig(): PredictionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
