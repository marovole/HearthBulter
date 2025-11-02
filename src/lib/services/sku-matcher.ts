import { PrismaClient } from '@prisma/client';
import { 
  IPlatformAdapter, 
  SKUMatchResult, 
  PlatformProductInfo,
  PlatformError,
  PlatformErrorType, 
} from './ecommerce/types';
import { EcommercePlatform, Food } from '@prisma/client';
import { createPlatformAdapter } from './ecommerce';

export interface MatchConfig {
  minConfidence: number
  maxResults: number
  includeOutOfStock: boolean
  priceRange?: {
    min?: number
    max?: number
  }
}

export interface NormalizedText {
  original: string
  normalized: string
  keywords: string[]
  tokens: string[]
}

export class SKUMatcher {
  private prisma: PrismaClient;
  private adapters: Map<EcommercePlatform, IPlatformAdapter>;

  // 品牌标准化映射
  private brandNormalizations: Record<string, string> = {
    '山姆': '山姆会员牌',
    'sams': '山姆会员牌',
    '盒马': '盒马鲜生',
    'hema': '盒马鲜生',
    '叮咚': '叮咚农场',
    'dingdong': '叮咚农场',
    '有机': '有机',
    '进口': '进口',
    '新鲜': '新鲜',
  };

  // 规格标准化映射
  private specificationNormalizations: Record<string, string> = {
    'kg': '千克',
    '斤': '500g',
    '公斤': '千克',
    '克': 'g',
    '毫升': 'ml',
    '升': 'l',
    '只': '个',
    '枚': '个',
    '片': '片',
    '包': '包',
    '盒': '盒',
    '袋': '袋',
  };

  // 单位标准化映射
  private unitNormalizations: Record<string, string> = {
    '千克': 'kg',
    '公斤': 'kg',
    '斤': '500g',
    '克': 'g',
    '毫升': 'ml',
    '升': 'l',
    '个': '个',
    '只': '个',
    '枚': '个',
    '片': '片',
    '包': '包',
    '盒': '盒',
    '袋': '袋',
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.adapters = new Map();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    const platforms = [EcommercePlatform.SAMS_CLUB, EcommercePlatform.HEMA, EcommercePlatform.DINGDONG];
    for (const platform of platforms) {
      this.adapters.set(platform, createPlatformAdapter(platform));
    }
  }

  // 主要匹配方法
  async matchFoodToSKUs(
    food: Food,
    config: Partial<MatchConfig> = {}
  ): Promise<SKUMatchResult[]> {
    const finalConfig: MatchConfig = {
      minConfidence: 0.6,
      maxResults: 10,
      includeOutOfStock: false,
      ...config,
    };

    try {
      // 1. 标准化食材信息
      const normalizedFood = this.normalizeFoodText(food);
      
      // 2. 从缓存中搜索匹配的商品
      const cachedProducts = await this.searchCachedProducts(normalizedFood, finalConfig);
      
      // 3. 计算匹配置信度
      const matchResults = await this.calculateMatchConfidence(
        normalizedFood, 
        cachedProducts, 
        finalConfig
      );
      
      // 4. 过滤和排序结果
      return this.filterAndSortResults(matchResults, finalConfig);
    } catch (error) {
      throw new PlatformError({
        type: PlatformErrorType.PLATFORM_ERROR,
        message: `Failed to match food ${food.name} to SKUs: ${error.message}`,
        details: { foodId: food.id, originalError: error },
      });
    }
  }

  // 批量匹配多个食材
  async matchMultipleFoods(
    foods: Food[],
    config: Partial<MatchConfig> = {}
  ): Promise<Map<string, SKUMatchResult[]>> {
    const results = new Map<string, SKUMatchResult[]>();
    
    for (const food of foods) {
      try {
        const matches = await this.matchFoodToSKUs(food, config);
        results.set(food.id, matches);
      } catch (error) {
        console.error(`Failed to match food ${food.name}:`, error);
        results.set(food.id, []);
      }
    }
    
    return results;
  }

  // 标准化食材文本
  private normalizeFoodText(food: Food): NormalizedText {
    const original = food.name;
    let normalized = original.toLowerCase().trim();
    
    // 移除常见的修饰词
    normalized = normalized.replace(/新鲜|有机|进口|散装|包装/g, '');
    
    // 分词
    const tokens = this.tokenizeText(normalized);
    const keywords = this.extractKeywords(tokens, food.aliases ? JSON.parse(food.aliases) : []);
    
    return {
      original,
      normalized,
      keywords,
      tokens,
    };
  }

  // 文本分词
  private tokenizeText(text: string): string[] {
    // 简单的分词实现，实际项目中可以使用更专业的分词库
    return text.split(/[\s\u3000\u3001\u3002\uff0c\uff1a\uff1b\uff1f\uff01\u300a\u300b]+/)
      .filter(token => token.length > 0)
      .map(token => token.trim());
  }

  // 提取关键词
  private extractKeywords(tokens: string[], aliases: string[] = []): string[] {
    const keywords = new Set<string>();
    
    // 添加主要词汇
    tokens.forEach(token => {
      if (token.length >= 2) {
        keywords.add(token);
      }
    });
    
    // 添加别名中的词汇
    aliases.forEach(alias => {
      const aliasTokens = this.tokenizeText(alias.toLowerCase());
      aliasTokens.forEach(token => {
        if (token.length >= 2) {
          keywords.add(token);
        }
      });
    });
    
    return Array.from(keywords);
  }

  // 从缓存中搜索商品
  private async searchCachedProducts(
    normalizedFood: NormalizedText,
    config: MatchConfig
  ): Promise<PlatformProductInfo[]> {
    const products: PlatformProductInfo[] = [];
    
    // 构建搜索查询
    const searchQueries = this.buildSearchQueries(normalizedFood);
    
    for (const query of searchQueries) {
      const cachedProducts = await this.prisma.platformProduct.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
          ],
          isValid: true,
          expiresAt: { gt: new Date() },
          ...(config.includeOutOfStock ? {} : { isInStock: true }),
        },
        take: config.maxResults,
      });
      
      products.push(...cachedProducts.map(p => this.mapDbProductToPlatformInfo(p)));
    }
    
    // 去重
    const uniqueProducts = new Map<string, PlatformProductInfo>();
    products.forEach(product => {
      const key = `${product.platform}-${product.platformProductId}`;
      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, product);
      }
    });
    
    return Array.from(uniqueProducts.values());
  }

  // 构建搜索查询
  private buildSearchQueries(normalizedFood: NormalizedText): string[] {
    const queries: string[] = [];
    
    // 主要名称
    queries.push(normalizedFood.normalized);
    
    // 关键词组合
    if (normalizedFood.keywords.length > 1) {
      queries.push(normalizedFood.keywords.slice(0, 2).join(' '));
    }
    
    // 单个关键词
    normalizedFood.keywords.forEach(keyword => {
      if (keyword.length >= 2) {
        queries.push(keyword);
      }
    });
    
    return [...new Set(queries)]; // 去重
  }

  // 计算匹配置信度
  private async calculateMatchConfidence(
    normalizedFood: NormalizedText,
    products: PlatformProductInfo[],
    config: MatchConfig
  ): Promise<SKUMatchResult[]> {
    const results: SKUMatchResult[] = [];
    
    for (const product of products) {
      const confidence = this.calculateConfidenceScore(normalizedFood, product);
      
      if (confidence >= config.minConfidence) {
        const { matchedKeywords, matchReasons } = this.analyzeMatch(
          normalizedFood, 
          product, 
          confidence
        );
        
        results.push({
          platformProduct: product,
          confidence,
          matchedKeywords,
          matchReasons,
        });
      }
    }
    
    return results;
  }

  // 计算置信度分数
  private calculateConfidenceScore(
    normalizedFood: NormalizedText,
    product: PlatformProductInfo
  ): number {
    let score = 0;
    let maxScore = 0;
    
    // 1. 名称匹配 (权重: 0.4)
    const nameScore = this.calculateTextSimilarity(
      normalizedFood.normalized, 
      product.name.toLowerCase()
    );
    score += nameScore * 0.4;
    maxScore += 0.4;
    
    // 2. 关键词匹配 (权重: 0.3)
    const keywordScore = this.calculateKeywordScore(normalizedFood.keywords, product);
    score += keywordScore * 0.3;
    maxScore += 0.3;
    
    // 3. 分类匹配 (权重: 0.2)
    const categoryScore = this.calculateCategoryScore(normalizedFood, product);
    score += categoryScore * 0.2;
    maxScore += 0.2;
    
    // 4. 品牌和规格匹配 (权重: 0.1)
    const attributeScore = this.calculateAttributeScore(normalizedFood, product);
    score += attributeScore * 0.1;
    maxScore += 0.1;
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  // 计算文本相似度
  private calculateTextSimilarity(text1: string, text2: string): number {
    // 简单的Jaccard相似度计算
    const tokens1 = new Set(this.tokenizeText(text1));
    const tokens2 = new Set(this.tokenizeText(text2));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // 计算关键词分数
  private calculateKeywordScore(keywords: string[], product: PlatformProductInfo): number {
    if (keywords.length === 0) return 0;
    
    const productText = `${product.name} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    let matchCount = 0;
    
    for (const keyword of keywords) {
      if (productText.includes(keyword)) {
        matchCount++;
      }
    }
    
    return matchCount / keywords.length;
  }

  // 计算分类分数
  private calculateCategoryScore(normalizedFood: NormalizedText, product: PlatformProductInfo): number {
    // 这里可以根据食材分类和商品分类进行匹配
    // 简化实现：检查商品名称是否包含分类相关信息
    const categoryKeywords = {
      'VEGETABLES': ['蔬菜', '青菜', '萝卜', '白菜', '菠菜', '西兰花'],
      'PROTEIN': ['肉', '鸡', '牛', '猪', '鱼', '蛋'],
      'FRUITS': ['水果', '苹果', '香蕉', '橙子', '葡萄'],
      'GRAINS': ['米', '面', '麦', '燕麦', '面包'],
      'DAIRY': ['奶', '酸奶', '奶酪', '牛奶'],
    };
    
    // 这里需要传入food的category信息，简化处理
    return 0.5; // 默认中等分数
  }

  // 计算属性分数
  private calculateAttributeScore(normalizedFood: NormalizedText, product: PlatformProductInfo): number {
    let score = 0;
    
    // 品牌匹配
    if (product.brand && this.isBrandRelevant(normalizedFood, product.brand)) {
      score += 0.5;
    }
    
    // 规格匹配
    if (this.isSpecificationRelevant(normalizedFood, product)) {
      score += 0.3;
    }
    
    // 价格合理性
    if (this.isPriceReasonable(product)) {
      score += 0.2;
    }
    
    return Math.min(score, 1);
  }

  // 判断品牌相关性
  private isBrandRelevant(normalizedFood: NormalizedText, brand: string): boolean {
    const normalizedBrand = brand.toLowerCase();
    return normalizedFood.keywords.some(keyword => normalizedBrand.includes(keyword));
  }

  // 判断规格相关性
  private isSpecificationRelevant(normalizedFood: NormalizedText, product: PlatformProductInfo): boolean {
    // 简化实现：检查规格是否合理
    return product.weight != null || product.unit != null;
  }

  // 判断价格合理性
  private isPriceReasonable(product: PlatformProductInfo): boolean {
    // 简单的价格合理性检查
    return product.price > 0 && product.price < 10000;
  }

  // 分析匹配详情
  private analyzeMatch(
    normalizedFood: NormalizedText,
    product: PlatformProductInfo,
    confidence: number
  ): { matchedKeywords: string[]; matchReasons: string[] } {
    const matchedKeywords: string[] = [];
    const matchReasons: string[] = [];
    
    // 找出匹配的关键词
    const productText = `${product.name} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
    
    normalizedFood.keywords.forEach(keyword => {
      if (productText.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    });
    
    // 生成匹配原因
    if (confidence > 0.8) {
      matchReasons.push('高度匹配：名称和关键词高度吻合');
    } else if (confidence > 0.6) {
      matchReasons.push('中度匹配：部分关键词匹配');
    } else {
      matchReasons.push('低度匹配：基础信息匹配');
    }
    
    if (matchedKeywords.length > 2) {
      matchReasons.push('多关键词匹配');
    }
    
    if (product.brand && this.isBrandRelevant(normalizedFood, product.brand)) {
      matchReasons.push('品牌相关');
    }
    
    return { matchedKeywords, matchReasons };
  }

  // 过滤和排序结果
  private filterAndSortResults(
    results: SKUMatchResult[],
    config: MatchConfig
  ): SKUMatchResult[] {
    // 按置信度排序
    results.sort((a, b) => b.confidence - a.confidence);
    
    // 限制结果数量
    return results.slice(0, config.maxResults);
  }

  // 数据库产品映射到平台产品信息
  private mapDbProductToPlatformInfo(dbProduct: any): PlatformProductInfo {
    return {
      platformProductId: dbProduct.platformProductId,
      sku: dbProduct.sku,
      name: dbProduct.name,
      description: dbProduct.description,
      brand: dbProduct.brand,
      category: dbProduct.category,
      imageUrl: dbProduct.imageUrl,
      specification: dbProduct.specification,
      weight: dbProduct.weight,
      volume: dbProduct.volume,
      unit: dbProduct.unit,
      price: dbProduct.price,
      originalPrice: dbProduct.originalPrice,
      currency: dbProduct.currency,
      priceUnit: dbProduct.priceUnit,
      stock: dbProduct.stock,
      isInStock: dbProduct.isInStock,
      stockStatus: dbProduct.stockStatus,
      salesCount: dbProduct.salesCount,
      rating: dbProduct.rating,
      reviewCount: dbProduct.reviewCount,
      deliveryOptions: dbProduct.deliveryOptions,
      deliveryTime: dbProduct.deliveryTime,
      shippingFee: dbProduct.shippingFee,
      platformData: dbProduct.platformData,
    };
  }

  // 更新匹配缓存
  async updateMatchCache(foodId: string, matches: SKUMatchResult[]): Promise<void> {
    // 这里可以实现匹配结果的缓存逻辑
    // 例如将匹配结果存储到Redis或数据库中
  }

  // 获取缓存的匹配结果
  async getCachedMatches(foodId: string): Promise<SKUMatchResult[] | null> {
    // 这里可以实现从缓存中获取匹配结果的逻辑
    return null;
  }

  // 手动纠正匹配
  async correctMatch(
    foodId: string,
    platformProductId: string,
    platform: EcommercePlatform,
    isCorrect: boolean
  ): Promise<void> {
    // 这里可以实现手动纠正匹配的逻辑
    // 将纠正结果记录到数据库中，用于改进匹配算法
  }
}
