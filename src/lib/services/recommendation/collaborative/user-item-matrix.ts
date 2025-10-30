import { PrismaClient } from '@prisma/client';

interface UserItemRating {
  userId: string;
  itemId: string;
  rating: number;
  timestamp: Date;
}

interface UserItemMatrix {
  users: string[];
  items: string[];
  ratings: Map<string, Map<string, number>>; // userId -> itemId -> rating
  userAverages: Map<string, number>;
  itemAverages: Map<string, number>;
  globalAverage: number;
  sparsity: number;
}

interface MatrixStatistics {
  totalUsers: number;
  totalItems: number;
  totalRatings: number;
  sparsity: number;
  ratingDistribution: Map<number, number>;
  userActivityDistribution: Map<string, number>;
  itemPopularityDistribution: Map<string, number>;
}

export class UserItemMatrixBuilder {
  private prisma: PrismaClient;
  private matrixCache = new Map<string, UserItemMatrix>();
  private cacheExpiry = 60 * 60 * 1000; // 1小时缓存

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 构建用户-物品评分矩阵
   */
  async buildMatrix(
    minRatingsPerUser: number = 5,
    minRatingsPerItem: number = 5,
    maxAge?: Date
  ): Promise<UserItemMatrix> {
    const cacheKey = `matrix_${minRatingsPerUser}_${minRatingsPerItem}_${maxAge?.getTime() || 'all'}`;
    
    // 检查缓存
    if (this.matrixCache.has(cacheKey)) {
      return this.matrixCache.get(cacheKey)!;
    }

    // 获取评分数据
    const ratings = await this.fetchRatings(minRatingsPerUser, minRatingsPerItem, maxAge);
    
    if (ratings.length === 0) {
      throw new Error('No ratings found with the specified criteria');
    }

    // 构建矩阵
    const matrix = this.createMatrix(ratings);
    
    // 计算统计信息
    this.calculateStatistics(matrix);
    
    // 缓存结果
    this.matrixCache.set(cacheKey, matrix);
    
    // 设置缓存过期
    setTimeout(() => {
      this.matrixCache.delete(cacheKey);
    }, this.cacheExpiry);

    return matrix;
  }

  /**
   * 获取评分数据
   */
  private async fetchRatings(
    minRatingsPerUser: number,
    minRatingsPerItem: number,
    maxAge?: Date
  ): Promise<UserItemRating[]> {
    let whereClause: any = {
      rating: { gte: 1, lte: 5 }
    };

    if (maxAge) {
      whereClause.ratedAt = { gte: maxAge };
    }

    // 获取活跃用户（满足最小评分数要求）
    const activeUsers = await this.prisma.$queryRaw`
      SELECT "memberId" as userId, COUNT(*) as rating_count
      FROM "recipe_ratings"
      WHERE "rating" >= 1 AND "rating" <= 5
      ${maxAge ? this.prisma.$queryRaw`AND "ratedAt" >= ${maxAge}` : this.prisma.$queryRaw``}
      GROUP BY "memberId"
      HAVING COUNT(*) >= ${minRatingsPerUser}
    `;

    if (!Array.isArray(activeUsers) || activeUsers.length === 0) {
      return [];
    }

    const userIds = (activeUsers as any[]).map(u => u.userId);

    // 获取热门物品（满足最小评分数要求）
    const popularItems = await this.prisma.$queryRaw`
      SELECT "recipeId" as itemId, COUNT(*) as rating_count
      FROM "recipe_ratings"
      WHERE "memberId" = ANY(${userIds}) AND "rating" >= 1 AND "rating" <= 5
      ${maxAge ? this.prisma.$queryRaw`AND "ratedAt" >= ${maxAge}` : this.prisma.$queryRaw``}
      GROUP BY "recipeId"
      HAVING COUNT(*) >= ${minRatingsPerItem}
    `;

    if (!Array.isArray(popularItems) || popularItems.length === 0) {
      return [];
    }

    const itemIds = (popularItems as any[]).map(i => i.itemId);

    // 获取最终的评分数据
    const ratings = await this.prisma.$queryRaw`
      SELECT 
        "memberId" as userId,
        "recipeId" as itemId,
        "rating" as rating,
        "ratedAt" as timestamp
      FROM "recipe_ratings"
      WHERE "memberId" = ANY(${userIds}) 
        AND "recipeId" = ANY(${itemIds})
        AND "rating" >= 1 AND "rating" <= 5
      ${maxAge ? this.prisma.$queryRaw`AND "ratedAt" >= ${maxAge}` : this.prisma.$queryRaw``}
      ORDER BY "ratedAt" DESC
    `;

    return (ratings as any[]).map(r => ({
      userId: r.userId,
      itemId: r.itemId,
      rating: Number(r.rating),
      timestamp: new Date(r.timestamp)
    }));
  }

  /**
   * 创建矩阵结构
   */
  private createMatrix(ratings: UserItemRating[]): UserItemMatrix {
    const users = new Set<string>();
    const items = new Set<string>();
    const ratingMatrix = new Map<string, Map<string, number>>();

    // 填充矩阵
    ratings.forEach(rating => {
      users.add(rating.userId);
      items.add(rating.itemId);

      if (!ratingMatrix.has(rating.userId)) {
        ratingMatrix.set(rating.userId, new Map());
      }
      ratingMatrix.get(rating.userId)!.set(rating.itemId, rating.rating);
    });

    const matrix: UserItemMatrix = {
      users: Array.from(users),
      items: Array.from(items),
      ratings: ratingMatrix,
      userAverages: new Map(),
      itemAverages: new Map(),
      globalAverage: 0,
      sparsity: 0
    };

    return matrix;
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(matrix: UserItemMatrix): void {
    // 计算全局平均分
    let totalRating = 0;
    let ratingCount = 0;

    matrix.ratings.forEach(userRatings => {
      userRatings.forEach(rating => {
        totalRating += rating;
        ratingCount++;
      });
    });

    matrix.globalAverage = ratingCount > 0 ? totalRating / ratingCount : 0;

    // 计算用户平均分
    matrix.ratings.forEach((userRatings, userId) => {
      let userTotal = 0;
      let userCount = 0;

      userRatings.forEach(rating => {
        userTotal += rating;
        userCount++;
      });

      matrix.userAverages.set(userId, userCount > 0 ? userTotal / userCount : 0);
    });

    // 计算物品平均分
    const itemTotals = new Map<string, number>();
    const itemCounts = new Map<string, number>();

    matrix.ratings.forEach(userRatings => {
      userRatings.forEach((rating, itemId) => {
        itemTotals.set(itemId, (itemTotals.get(itemId) || 0) + rating);
        itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
      });
    });

    itemTotals.forEach((total, itemId) => {
      const count = itemCounts.get(itemId) || 0;
      matrix.itemAverages.set(itemId, count > 0 ? total / count : 0);
    });

    // 计算稀疏度
    const possibleRatings = matrix.users.length * matrix.items.length;
    matrix.sparsity = possibleRatings > 0 ? 1 - (ratingCount / possibleRatings) : 1;
  }

  /**
   * 获取矩阵统计信息
   */
  async getMatrixStatistics(
    minRatingsPerUser: number = 5,
    minRatingsPerItem: number = 5
  ): Promise<MatrixStatistics> {
    const matrix = await this.buildMatrix(minRatingsPerUser, minRatingsPerItem);

    // 计算评分分布
    const ratingDistribution = new Map<number, number>();
    for (let i = 1; i <= 5; i++) {
      ratingDistribution.set(i, 0);
    }

    matrix.ratings.forEach(userRatings => {
      userRatings.forEach(rating => {
        ratingDistribution.set(rating, (ratingDistribution.get(rating) || 0) + 1);
      });
    });

    // 计算用户活跃度分布
    const userActivityDistribution = new Map<string, number>();
    matrix.ratings.forEach((userRatings, userId) => {
      userActivityDistribution.set(userId, userRatings.size);
    });

    // 计算物品流行度分布
    const itemPopularityDistribution = new Map<string, number>();
    matrix.ratings.forEach(userRatings => {
      userRatings.forEach((_, itemId) => {
        itemPopularityDistribution.set(itemId, (itemPopularityDistribution.get(itemId) || 0) + 1);
      });
    });

    return {
      totalUsers: matrix.users.length,
      totalItems: matrix.items.length,
      totalRatings: Array.from(matrix.ratings.values()).reduce((sum, userRatings) => sum + userRatings.size, 0),
      sparsity: matrix.sparsity,
      ratingDistribution,
      userActivityDistribution,
      itemPopularityDistribution
    };
  }

  /**
   * 获取用户评分向量
   */
  getUserRatingVector(matrix: UserItemMatrix, userId: string): Map<string, number> {
    return matrix.ratings.get(userId) || new Map();
  }

  /**
   * 获取物品评分向量
   */
  getItemRatingVector(matrix: UserItemMatrix, itemId: string): Map<string, number> {
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
  getCommonlyRatedItems(matrix: UserItemMatrix, user1Id: string, user2Id: string): Map<string, [number, number]> {
    const user1Ratings = matrix.ratings.get(user1Id);
    const user2Ratings = matrix.ratings.get(user2Id);

    if (!user1Ratings || !user2Ratings) {
      return new Map();
    }

    const commonItems = new Map<string, [number, number]>();

    user1Ratings.forEach((rating1, itemId) => {
      if (user2Ratings.has(itemId)) {
        commonItems.set(itemId, [rating1, user2Ratings.get(itemId)!]);
      }
    });

    return commonItems;
  }

  /**
   * 获取共同评分的用户
   */
  getCommonRatingUsers(matrix: UserItemMatrix, item1Id: string, item2Id: string): Map<string, [number, number]> {
    const commonUsers = new Map<string, [number, number]>();

    matrix.ratings.forEach((userRatings, userId) => {
      if (userRatings.has(item1Id) && userRatings.has(item2Id)) {
        commonUsers.set(userId, [userRatings.get(item1Id)!, userRatings.get(item2Id)!]);
      }
    });

    return commonUsers;
  }

  /**
   * 更新矩阵（增量更新）
   */
  async updateMatrix(
    matrix: UserItemMatrix,
    newRatings: UserItemRating[]
  ): Promise<UserItemMatrix> {
    const updatedMatrix = { ...matrix };

    newRatings.forEach(rating => {
      // 添加新用户（如果需要）
      if (!updatedMatrix.users.includes(rating.userId)) {
        updatedMatrix.users.push(rating.userId);
      }

      // 添加新物品（如果需要）
      if (!updatedMatrix.items.includes(rating.itemId)) {
        updatedMatrix.items.push(rating.itemId);
      }

      // 更新评分
      if (!updatedMatrix.ratings.has(rating.userId)) {
        updatedMatrix.ratings.set(rating.userId, new Map());
      }
      updatedMatrix.ratings.get(rating.userId)!.set(rating.itemId, rating.rating);
    });

    // 重新计算统计信息
    this.calculateStatistics(updatedMatrix);

    return updatedMatrix;
  }

  /**
   * 矩阵分解（简化版SVD）
   */
  async performMatrixFactorization(
    matrix: UserItemMatrix,
    factors: number = 20,
    iterations: number = 50,
    learningRate: number = 0.01,
    regularization: number = 0.1
  ): Promise<{
    userFeatures: Map<string, number[]>;
    itemFeatures: Map<string, number[]>;
  }> {
    const users = matrix.users;
    const items = matrix.items;
    const ratings = matrix.ratings;

    // 初始化特征矩阵
    const userFeatures = new Map<string, number[]>();
    const itemFeatures = new Map<string, number[]>();

    users.forEach(userId => {
      const features = [];
      for (let i = 0; i < factors; i++) {
        features.push(Math.random() * 0.1 - 0.05); // 小随机值
      }
      userFeatures.set(userId, features);
    });

    items.forEach(itemId => {
      const features = [];
      for (let i = 0; i < factors; i++) {
        features.push(Math.random() * 0.1 - 0.05);
      }
      itemFeatures.set(itemId, features);
    });

    // 梯度下降训练
    for (let iter = 0; iter < iterations; iter++) {
      let totalError = 0;

      ratings.forEach((userRatings, userId) => {
        const uFeatures = userFeatures.get(userId)!;

        userRatings.forEach((rating, itemId) => {
          const iFeatures = itemFeatures.get(itemId)!;

          // 预测评分
          let predicted = 0;
          for (let f = 0; f < factors; f++) {
            predicted += uFeatures[f] * iFeatures[f];
          }

          // 计算误差
          const error = rating - predicted;
          totalError += error * error;

          // 更新特征
          for (let f = 0; f < factors; f++) {
            const uGrad = error * iFeatures[f] - regularization * uFeatures[f];
            const iGrad = error * uFeatures[f] - regularization * iFeatures[f];

            uFeatures[f] += learningRate * uGrad;
            iFeatures[f] += learningRate * iGrad;
          }
        });
      });

      // 每10次迭代输出一次误差
      if (iter % 10 === 0) {
        console.log(`Iteration ${iter}, Error: ${totalError}`);
      }
    }

    return { userFeatures, itemFeatures };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.matrixCache.clear();
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.matrixCache.size,
      keys: Array.from(this.matrixCache.keys())
    };
  }
}
