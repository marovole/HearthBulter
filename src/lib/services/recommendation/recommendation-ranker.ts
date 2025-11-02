import { PrismaClient } from '@prisma/client';
import { RecipeRecommendation, RecommendationContext, RecommendationWeights } from './recommendation-engine';

interface RankingFeatures {
  recipeId: string;
  baseScore: number;
  popularityScore: number;
  freshnessScore: number;
  diversityScore: number;
  personalizationScore: number;
  qualityScore: number;
}

export class RecommendationRanker {
  private prisma: PrismaClient;
  private diversityCache = new Map<string, Set<string>>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 对候选食谱进行排名
   */
  async rankRecipes(
    candidates: RecipeRecommendation[],
    context: RecommendationContext,
    weights: RecommendationWeights
  ): Promise<RecipeRecommendation[]> {
    // 提取排名特征
    const features = await this.extractRankingFeatures(candidates, context);
    
    // 计算综合分数
    const rankedRecipes = features.map(feature => {
      const finalScore = this.calculateFinalScore(feature, weights);
      
      return {
        recipeId: feature.recipeId,
        score: finalScore,
        reasons: this.generateRankingReasons(feature),
        explanation: this.generateRankingExplanation(feature, weights),
        metadata: {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: finalScore / 100,
          seasonalMatch: 0,
        },
      };
    });

    // 应用多样性调整
    const diversifiedRanking = this.applyDiversityAdjustment(rankedRecipes, context);
    
    return diversifiedRanking;
  }

  /**
   * 提取排名特征
   */
  private async extractRankingFeatures(
    candidates: RecipeRecommendation[],
    context: RecommendationContext
  ): Promise<RankingFeatures[]> {
    const recipeIds = candidates.map(c => c.recipeId);
    
    // 批量获取食谱数据
    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: {
        id: true,
        averageRating: true,
        ratingCount: true,
        viewCount: true,
        createdAt: true,
        category: true,
        cuisine: true,
        tags: true,
        difficulty: true,
        totalTime: true,
        estimatedCost: true,
      },
    });

    return candidates.map(candidate => {
      const recipe = recipes.find(r => r.id === candidate.recipeId)!;
      
      return {
        recipeId: candidate.recipeId,
        baseScore: candidate.score,
        popularityScore: this.calculatePopularityScore(recipe),
        freshnessScore: this.calculateFreshnessScore(recipe),
        diversityScore: 0, // 将在多样性调整中计算
        personalizationScore: this.calculatePersonalizationScore(recipe, context),
        qualityScore: this.calculateQualityScore(recipe),
      };
    });
  }

  /**
   * 计算受欢迎程度分数
   */
  private calculatePopularityScore(recipe: any): number {
    // 综合评分、评价数、浏览量计算受欢迎程度
    const ratingScore = (recipe.averageRating / 5) * 40;
    const reviewScore = Math.min(recipe.ratingCount / 100, 1) * 30;
    const viewScore = Math.min(Math.log(recipe.viewCount + 1) / Math.log(10000), 1) * 30;
    
    return ratingScore + reviewScore + viewScore;
  }

  /**
   * 计算新鲜度分数
   */
  private calculateFreshnessScore(recipe: any): number {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(recipe.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // 新食谱有加分，但不是唯一因素
    if (daysSinceCreation <= 7) {
      return 100;
    } else if (daysSinceCreation <= 30) {
      return 80;
    } else if (daysSinceCreation <= 90) {
      return 60;
    } else if (daysSinceCreation <= 365) {
      return 40;
    } else {
      return 20;
    }
  }

  /**
   * 计算个性化分数
   */
  private calculatePersonalizationScore(recipe: any, context: RecommendationContext): number {
    const score = 50; // 基础分

    // 基于用户历史行为调整
    // 这里可以加入更复杂的个性化逻辑
    // 暂时返回基础分数
    
    return score;
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(recipe: any): number {
    let score = 0;

    // 基于评分质量
    if (recipe.averageRating >= 4.5) {
      score += 40;
    } else if (recipe.averageRating >= 4.0) {
      score += 30;
    } else if (recipe.averageRating >= 3.5) {
      score += 20;
    } else if (recipe.averageRating >= 3.0) {
      score += 10;
    }

    // 基于评价数量
    if (recipe.ratingCount >= 100) {
      score += 30;
    } else if (recipe.ratingCount >= 50) {
      score += 25;
    } else if (recipe.ratingCount >= 20) {
      score += 20;
    } else if (recipe.ratingCount >= 10) {
      score += 15;
    } else if (recipe.ratingCount >= 5) {
      score += 10;
    }

    // 基于难度（简单食谱有轻微加分）
    if (recipe.difficulty === 'EASY') {
      score += 10;
    } else if (recipe.difficulty === 'MEDIUM') {
      score += 5;
    }

    // 基于制作时间
    if (recipe.totalTime <= 30) {
      score += 10;
    } else if (recipe.totalTime <= 60) {
      score += 5;
    }

    // 基于成本
    if (recipe.estimatedCost && recipe.estimatedCost <= 30) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * 计算最终分数
   */
  private calculateFinalScore(
    features: RankingFeatures,
    weights: RecommendationWeights
  ): number {
    // 权重配置
    const rankingWeights = {
      base: 0.3,        // 基础推荐分数
      popularity: 0.2,  // 受欢迎程度
      freshness: 0.1,   // 新鲜度
      diversity: 0.1,   // 多样性
      personalization: 0.2, // 个性化
      quality: 0.1,      // 质量分数
    };

    const weightedScore = 
      features.baseScore * rankingWeights.base +
      features.popularityScore * rankingWeights.popularity +
      features.freshnessScore * rankingWeights.freshness +
      features.diversityScore * rankingWeights.diversity +
      features.personalizationScore * rankingWeights.personalization +
      features.qualityScore * rankingWeights.quality;

    // 应用用户权重调整
    const userWeightAdjustment = this.calculateUserWeightAdjustment(weights);
    
    return Math.round(weightedScore * userWeightAdjustment);
  }

  /**
   * 计算用户权重调整系数
   */
  private calculateUserWeightAdjustment(weights: RecommendationWeights): number {
    // 根据用户权重偏好调整最终分数
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    // 如果用户特别偏好某些因素，给予相应调整
    if (weights.inventory > 0.4) {
      return 1.1; // 库存权重高时轻微提升
    }
    
    if (weights.preference > 0.3) {
      return 1.05; // 偏好权重高时轻微提升
    }

    return 1.0;
  }

  /**
   * 应用多样性调整
   */
  private applyDiversityAdjustment(
    rankedRecipes: RecipeRecommendation[],
    context: RecommendationContext
  ): RecipeRecommendation[] {
    const adjusted = [...rankedRecipes];
    const usedCategories = new Set<string>();
    const usedCuisines = new Set<string>();
    const usedTags = new Set<string>();

    // 为每个食谱计算多样性分数
    for (let i = 0; i < adjusted.length; i++) {
      const recipe = adjusted[i];
      const recipeData = this.getRecipeData(recipe.recipeId);
      
      if (!recipeData) continue;

      let diversityBonus = 0;

      // 分类多样性
      if (!usedCategories.has(recipeData.category)) {
        diversityBonus += 10;
        usedCategories.add(recipeData.category);
      }

      // 菜系多样性
      if (recipeData.cuisine && !usedCuisines.has(recipeData.cuisine)) {
        diversityBonus += 8;
        usedCuisines.add(recipeData.cuisine);
      }

      // 标签多样性
      const recipeTags = recipeData.tags ? JSON.parse(recipeData.tags) : [];
      const newTags = recipeTags.filter((tag: string) => !usedTags.has(tag));
      if (newTags.length > 0) {
        diversityBonus += Math.min(newTags.length * 2, 5);
        newTags.forEach((tag: string) => usedTags.add(tag));
      }

      // 应用多样性加成
      recipe.score = Math.min(recipe.score + diversityBonus, 100);
    }

    // 重新排序
    return adjusted.sort((a, b) => b.score - a.score);
  }

  /**
   * 获取食谱数据（简化实现）
   */
  private getRecipeData(recipeId: string): any {
    // 这里应该从数据库获取，为了简化返回模拟数据
    return {
      category: 'MAIN_DISH',
      cuisine: '川菜',
      tags: '["辣", "快手菜"]',
    };
  }

  /**
   * 生成排名理由
   */
  private generateRankingReasons(features: RankingFeatures): string[] {
    const reasons: string[] = [];

    if (features.popularityScore >= 80) {
      reasons.push('热门推荐');
    }

    if (features.freshnessScore >= 80) {
      reasons.push('新鲜食谱');
    }

    if (features.qualityScore >= 80) {
      reasons.push('高品质');
    }

    if (features.personalizationScore >= 70) {
      reasons.push('个性化推荐');
    }

    return reasons.length > 0 ? reasons : ['综合推荐'];
  }

  /**
   * 生成排名解释
   */
  private generateRankingExplanation(
    features: RankingFeatures,
    weights: RecommendationWeights
  ): string {
    const explanations: string[] = [];

    if (features.popularityScore >= 70) {
      explanations.push('这是一道广受欢迎的食谱');
    }

    if (features.freshnessScore >= 70) {
      explanations.push('食谱内容新颖及时');
    }

    if (features.qualityScore >= 70) {
      explanations.push('经过用户验证的高质量食谱');
    }

    // 根据权重添加个性化解释
    const topWeight = Object.entries(weights).reduce((a, b) => 
      weights[a[0] as keyof RecommendationWeights] > weights[b[0] as keyof RecommendationWeights] ? a : b
    );

    const weightExplanations: { [key: string]: string } = {
      inventory: '特别考虑了您现有的食材库存',
      price: '重点考虑了您的预算需求',
      nutrition: '优先考虑了您的营养目标',
      preference: '深度匹配了您的个人口味偏好',
      seasonal: '推荐了当季最新鲜的食材搭配',
    };

    if (topWeight[1] > 0.3) {
      explanations.push(weightExplanations[topWeight[0]]);
    }

    return explanations.length > 0 ? `${explanations.join('，')}。` : '经过多维度综合评估为您推荐。';
  }

  /**
   * 多样性惩罚算法（避免推荐过于相似的食谱）
   */
  private applyDiversityPenalty(
    recommendations: RecipeRecommendation[],
    similarityThreshold: number = 0.8
  ): RecipeRecommendation[] {
    const filtered: RecipeRecommendation[] = [];
    
    for (const rec of recommendations) {
      const isTooSimilar = filtered.some(existing => 
        this.calculateRecommendationSimilarity(rec, existing) > similarityThreshold
      );
      
      if (!isTooSimilar) {
        filtered.push(rec);
      }
    }
    
    return filtered;
  }

  /**
   * 计算推荐间的相似度
   */
  private calculateRecommendationSimilarity(
    rec1: RecipeRecommendation,
    rec2: RecipeRecommendation
  ): number {
    // 基于推荐理由的相似度
    const reasonSimilarity = this.calculateReasonSimilarity(rec1.reasons, rec2.reasons);
    
    // 基于分数的相似度
    const scoreSimilarity = 1 - Math.abs(rec1.score - rec2.score) / 100;
    
    return (reasonSimilarity + scoreSimilarity) / 2;
  }

  /**
   * 计算理由相似度
   */
  private calculateReasonSimilarity(reasons1: string[], reasons2: string[]): number {
    const set1 = new Set(reasons1);
    const set2 = new Set(reasons2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * 时序多样性调整（避免在同一时间段推荐相似内容）
   */
  private applyTemporalDiversity(
    recommendations: RecipeRecommendation[],
    context: RecommendationContext
  ): RecipeRecommendation[] {
    // 获取用户最近的推荐历史
    const recentRecommendations = this.getRecentRecommendations(context.memberId);
    
    return recommendations.map(rec => {
      const recentSimilarity = this.calculateRecentSimilarity(rec, recentRecommendations);
      
      // 如果与最近推荐太相似，降低分数
      if (recentSimilarity > 0.7) {
        rec.score = Math.max(rec.score - 20, 0);
      }
      
      return rec;
    });
  }

  /**
   * 获取用户最近的推荐历史
   */
  private getRecentRecommendations(memberId: string): RecipeRecommendation[] {
    // 这里应该从缓存或数据库获取最近的推荐记录
    // 暂时返回空数组
    return [];
  }

  /**
   * 计算与最近推荐的相似度
   */
  private calculateRecentSimilarity(
    recommendation: RecipeRecommendation,
    recentRecommendations: RecipeRecommendation[]
  ): number {
    if (recentRecommendations.length === 0) {
      return 0;
    }

    const similarities = recentRecommendations.map(recent => 
      this.calculateRecommendationSimilarity(recommendation, recent)
    );

    return Math.max(...similarities);
  }
}
