# 智能食谱推荐系统 - 算法说明

## 概述

智能食谱推荐系统是一个基于多种算法的混合推荐引擎，旨在为用户提供个性化、准确且实用的食谱推荐。系统综合考虑用户的口味偏好、营养需求、预算限制、季节因素和库存状态等多个维度。

## 系统架构

### 核心组件

1. **推荐引擎 (RecommendationEngine)** - 主控制器，协调各推荐策略
2. **基于规则的推荐器 (RuleBasedRecommender)** - 基于业务规则的推荐
3. **协同过滤器 (CollaborativeFilter)** - 基于用户行为的推荐
4. **内容过滤器 (ContentFilter)** - 基于食谱特征的推荐
5. **推荐排序器 (RecommendationRanker)** - 多维度排序和优化

### 数据模型

- **RecipeRating** - 用户评分记录
- **RecipeFavorite** - 用户收藏记录
- **RecipeView** - 用户浏览历史
- **UserPreference** - 用户偏好设置
- **IngredientSubstitution** - 食材替换记录

## 推荐算法详解

### 1. 基于规则的推荐 (Rule-Based Recommendation)

#### 算法原理
基于预设的业务规则和专家知识进行推荐，确保推荐结果符合实际约束条件。

#### 评分维度
- **库存匹配 (30%)**: 基于用户现有食材的匹配度
- **价格匹配 (20%)**: 符合用户预算限制的程度
- **营养匹配 (30%)**: 满足用户营养目标的程度
- **偏好匹配 (15%)**: 符合用户口味偏好的程度
- **季节匹配 (5%)**: 使用当季食材的程度

#### 关键算法
```typescript
// 库存匹配评分
inventoryScore = (matchedIngredients / totalIngredients) * 30

// 价格匹配评分
priceScore = Math.max(0, (1 - (recipeCost - budgetLimit) / budgetLimit)) * 20

// 营养匹配评分
nutritionScore = calculateNutritionMatch(recipe, userGoals) * 30
```

### 2. 协同过滤推荐 (Collaborative Filtering)

#### 用户-物品评分矩阵
系统构建用户-食谱评分矩阵，支持多种相似度计算方法：

```typescript
interface UserItemMatrix {
  users: string[];
  items: string[];
  ratings: Map<string, Map<string, number>>; // userId -> itemId -> rating
  userAverages: Map<string, number>;
  itemAverages: Map<string, number>;
  globalAverage: number;
  sparsity: number;
}
```

#### 相似度计算

**余弦相似度**
```typescript
cosineSimilarity(userA, userB) = 
  Σ(ratingA_i * ratingB_i) / (sqrt(Σ(ratingA_i²)) * sqrt(Σ(ratingB_i²)))
```

**皮尔逊相关系数**
```typescript
pearsonCorrelation(userA, userB) = 
  Σ((ratingA_i - avgA) * (ratingB_i - avgB)) / 
  sqrt(Σ(ratingA_i - avgA)² * Σ(ratingB_i - avgB)²)
```

#### 推荐策略

**基于用户的协同过滤 (User-Based CF)**
1. 找到与目标用户相似的邻居用户
2. 获取邻居用户喜欢但目标用户未接触的食谱
3. 根据相似度和评分预测推荐分数

**基于物品的协同过滤 (Item-Based CF)**
1. 计算食谱之间的相似度
2. 基于用户历史喜欢的食谱，找到相似食谱
3. 根据物品相似度和用户评分预测推荐分数

#### 矩阵分解 (SVD)
使用奇异值分解技术处理稀疏评分矩阵：

```typescript
// 分解评分矩阵 R ≈ U * S * V^T
// U: 用户特征矩阵
// S: 奇异值对角矩阵
// V: 物品特征矩阵

predictedRating = userFeatures · itemFeatures + globalBias
```

### 3. 内容过滤推荐 (Content-Based Filtering)

#### 特征提取
系统为每个食谱提取多维特征：

```typescript
interface RecipeFeatures {
  recipeId: string;
  ingredients: string[];        // 食材列表
  nutritionProfile: {           // 营养特征
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  cookingTime: number;          // 烹饪时间
  difficulty: string;           // 难度等级
  category: string;             // 食谱分类
  tags: string[];               // 标签
  costLevel: string;            // 成本等级
}
```

#### 用户偏好建模
基于用户历史行为构建偏好档案：

```typescript
interface UserProfile {
  preferredIngredients: string[];     // 偏好食材
  avoidedIngredients: string[];       // 避开食材
  nutritionPreferences: {             // 营养偏好
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
    maxFat?: number;
  };
  cookingPreferences: {               // 烹饪偏好
    maxTime?: number;
    preferredDifficulty?: string;
    preferredCategories?: string[];
  };
  costPreference: string;             // 成本偏好
}
```

#### 相似度计算
使用TF-IDF和余弦相似度计算内容匹配度：

```typescript
// TF-IDF权重计算
tfidf(term, document) = tf(term, document) * idf(term)

// 内容相似度
contentSimilarity = cosineSimilarity(recipeFeatures, userProfile)
```

### 4. 混合推荐策略

#### 线性组合
将多种推荐结果按权重线性组合：

```typescript
finalScore = α * ruleBasedScore + 
             β * collaborativeScore + 
             γ * contentBasedScore

// 权重动态调整
α = 0.4, β = 0.3, γ = 0.3 (默认权重)
```

#### 切换策略
根据数据稀疏程度动态切换主要推荐策略：

```typescript
if (userRatings < 5) {
  // 冷启动：主要使用基于规则的推荐
  primaryStrategy = 'rule-based';
} else if (userRatings < 20) {
  // 数据较少：混合规则和内容推荐
  primaryStrategy = 'hybrid-rule-content';
} else {
  // 数据充足：使用完整的混合推荐
  primaryStrategy = 'full-hybrid';
}
```

### 5. 推荐排序与优化

#### 多维度排序
综合考虑以下因素进行最终排序：

```typescript
interface RankingFeatures {
  baseScore: number;           // 基础推荐分数
  popularityScore: number;    // 热门程度
  freshnessScore: number;     // 新鲜度
  diversityScore: number;     // 多样性
  personalizationScore: number; // 个性化程度
  qualityScore: number;       // 质量评分
}
```

#### 多样性保证
使用最大边际相关性 (MMR) 确保推荐结果的多样性：

```typescript
mmrScore = λ * relevanceScore - (1 - λ) * maxSimilarity

// λ: 多样性参数 (0.7-0.9)
// maxSimilarity: 与已推荐食谱的最大相似度
```

#### 实时优化
- **缓存机制**: 缓存用户偏好和推荐结果
- **增量更新**: 实时更新用户行为数据
- **A/B测试**: 支持多策略对比实验

## 冷启动处理

### 新用户冷启动
1. **默认偏好**: 基于用户注册信息设置初始偏好
2. **热门推荐**: 推荐全局热门和高评分食谱
3. **引导式收集**: 通过简短问卷收集用户偏好

### 新食谱冷启动
1. **内容分析**: 基于食谱特征找到相似食谱
2. **专家评分**: 使用营养师和厨师的专业评分
3. **渐进式曝光**: 逐步增加新食谱的曝光率

## 推荐理由生成

### 理由分类
- **库存相关**: "现有食材充足"
- **价格相关**: "经济实惠"
- **营养相关**: "营养均衡"
- **偏好相关**: "符合您的口味"
- **季节相关**: "当季新鲜食材"

### 个性化解释
基于推荐权重和用户特征生成个性化解释：

```typescript
function generateExplanation(recommendation, userContext) {
  const primaryReason = getHighestWeightedFactor(recommendation.metadata);
  const explanation = templates[primaryReason]
    .replace('{ingredients}', userContext.availableIngredients)
    .replace('{budget}', userContext.budgetLimit);
  
  return explanation;
}
```

## 性能优化

### 计算优化
- **向量化计算**: 使用矩阵运算优化相似度计算
- **近似算法**: 使用LSH等近似算法加速最近邻搜索
- **并行处理**: 多线程并行计算不同策略的推荐结果

### 缓存策略
- **用户偏好缓存**: 1小时过期
- **推荐结果缓存**: 30分钟过期
- **相似度矩阵缓存**: 24小时过期

### 数据库优化
- **索引优化**: 为常用查询字段创建复合索引
- **分区表**: 按时间分区存储历史数据
- **读写分离**: 推荐计算使用只读副本

## 评估指标

### 准确性指标
- **精确率 (Precision)**: 推荐的相关食谱比例
- **召回率 (Recall)**: 相关食谱中被推荐的比例
- **F1分数**: 精确率和召回率的调和平均

### 多样性指标
- **类内相似度 (Intra-list Similarity)**: 推荐列表内部的相似程度
- **覆盖率 (Coverage)**: 推荐系统能够推荐的食谱比例

### 业务指标
- **点击率 (CTR)**: 用户点击推荐食谱的比例
- **收藏率**: 用户收藏推荐食谱的比例
- **转化率**: 用户实际制作推荐食谱的比例

## 配置参数

### 推荐权重配置
```json
{
  "defaultWeights": {
    "inventory": 0.3,
    "price": 0.2,
    "nutrition": 0.3,
    "preference": 0.15,
    "seasonal": 0.05
  },
  "budgetUserWeights": {
    "inventory": 0.2,
    "price": 0.4,
    "nutrition": 0.2,
    "preference": 0.15,
    "seasonal": 0.05
  }
}
```

### 算法参数
```json
{
  "collaborativeFiltering": {
    "minRatingsPerUser": 5,
    "minRatingsPerItem": 5,
    "neighborCount": 50,
    "similarityThreshold": 0.1
  },
  "contentBased": {
    "featureWeights": {
      "ingredients": 0.4,
      "nutrition": 0.3,
      "cooking": 0.2,
      "category": 0.1
    }
  }
}
```

## 部署建议

### 硬件要求
- **CPU**: 8核心以上，支持向量化计算
- **内存**: 16GB以上，用于缓存和矩阵计算
- **存储**: SSD存储，优化数据库查询性能

### 扩展性考虑
- **水平扩展**: 支持多实例部署，负载均衡
- **微服务架构**: 推荐引擎独立部署，便于扩展
- **异步处理**: 用户偏好学习采用异步任务处理

## 未来优化方向

1. **深度学习**: 引入神经网络模型提升推荐准确性
2. **多模态推荐**: 结合食谱图片和视频信息
3. **实时推荐**: 基于用户当前场景的实时推荐
4. **社交推荐**: 融合社交网络关系进行推荐
5. **跨域推荐**: 结合购物、健康等其他领域数据

---

*本文档详细描述了智能食谱推荐系统的算法实现，为开发团队提供技术参考和优化指导。*
