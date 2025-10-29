# Nutrition Database - Technical Design

## Context

营养数据库为整个Health Butler系统提供食物营养成分数据支撑。本模块采用"外部API + 本地缓存"混合架构，确保数据权威性的同时降低API调用成本。

---

## Goals / Non-Goals

### Goals
- ✅ 对接USDA FoodData Central API获取权威营养数据
- ✅ 本地缓存常用食材（减少API调用）
- ✅ 支持中文食材库和自定义食物
- ✅ 提供快速营养计算工具

### Non-Goals
- ❌ 不支持食谱创作（由meal-planning模块负责）
- ❌ 不提供营养分析报告（由health-tracking-dashboard负责）

---

## Data Models

```prisma
// 食物表
model Food {
  id          String   @id @default(cuid())
  name        String   // 中文名
  nameEn      String?  // 英文名（用于USDA查询）
  aliases     String[] // 别名数组 ["西红柿", "蕃茄"]

  // 营养成分（per 100g）
  calories    Float    // kcal
  protein     Float    // g
  carbs       Float    // g
  fat         Float    // g
  fiber       Float?   // g
  sugar       Float?   // g
  sodium      Float?   // mg

  // 微量营养素（可选）
  vitaminA    Float?   // μg
  vitaminC    Float?   // mg
  calcium     Float?   // mg
  iron        Float?   // mg

  // 元数据
  category    FoodCategory
  tags        String[] // ["高蛋白", "低碳水"]
  source      DataSource @default(LOCAL)
  usdaId      String?  // USDA FDC ID
  verified    Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  cachedAt    DateTime? // USDA数据缓存时间

  @@map("foods")
  @@index([category])
  @@index([source])
  @@fulltext([name, nameEn, aliases]) // 全文搜索索引
}

enum FoodCategory {
  VEGETABLES  // 蔬菜
  FRUITS      // 水果
  GRAINS      // 谷物
  PROTEIN     // 肉蛋奶
  SEAFOOD     // 海鲜
  DAIRY       // 乳制品
  OILS        // 油脂
  SNACKS      // 零食
  BEVERAGES   // 饮料
  OTHER       // 其他
}

enum DataSource {
  USDA        // USDA FoodData Central
  LOCAL       // 本地自定义
  USER_SUBMITTED // 用户提交（待审核）
}
```

---

## External API Integration

### USDA FoodData Central API

**Endpoint**: `https://api.nal.usda.gov/fdc/v1/foods/search`

**Request Example**:
```typescript
const response = await fetch(
  `https://api.nal.usda.gov/fdc/v1/foods/search?query=chicken&api_key=${API_KEY}`
)
```

**Response Mapping**:
```typescript
interface USDAFood {
  fdcId: number
  description: string
  foodNutrients: {
    nutrientName: string
    value: number
  }[]
}

// 映射到本地模型
function mapUSDAToLocal(usdaFood: USDAFood): Food {
  return {
    name: translateToChineseFood(usdaFood.description),
    nameEn: usdaFood.description,
    usdaId: usdaFood.fdcId.toString(),
    calories: getNutrient(usdaFood, 'Energy'),
    protein: getNutrient(usdaFood, 'Protein'),
    carbs: getNutrient(usdaFood, 'Carbohydrate'),
    fat: getNutrient(usdaFood, 'Total lipid (fat)'),
    source: 'USDA',
    cachedAt: new Date()
  }
}
```

---

## API Design

```
GET    /api/foods/search?q=鸡胸肉              # 搜索食物
GET    /api/foods/:id                          # 获取食物详情
POST   /api/foods                              # 添加自定义食物（管理员）
PATCH  /api/foods/:id                          # 更新食物信息
GET    /api/foods/categories/:category         # 按类别查询
POST   /api/foods/calculate-nutrition          # 批量营养计算
GET    /api/foods/popular                      # 获取热门食材
```

---

## Caching Strategy

### Redis Cache
```typescript
// Cache Key: `food:{id}`
// TTL: 90 days

async function getFood(id: string): Promise<Food> {
  // 1. 尝试从Redis读取
  const cached = await redis.get(`food:${id}`)
  if (cached) return JSON.parse(cached)

  // 2. 从数据库查询
  const food = await prisma.food.findUnique({ where: { id } })

  // 3. 缓存到Redis
  await redis.setex(`food:${id}`, 7776000, JSON.stringify(food)) // 90天

  return food
}
```

### USDA Data Refresh
```typescript
// 每90天重新同步USDA数据
async function refreshUSDAData() {
  const stalefoods = await prisma.food.findMany({
    where: {
      source: 'USDA',
      cachedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }
  })

  for (const food of stalefoods) {
    const updated = await fetchFromUSDA(food.usdaId)
    await prisma.food.update({
      where: { id: food.id },
      data: { ...updated, cachedAt: new Date() }
    })
  }
}
```

---

## Search Optimization

### 中英文映射表
```typescript
const foodTranslations = {
  '鸡胸肉': 'chicken breast',
  '牛肉': 'beef',
  '西兰花': 'broccoli',
  '番茄': 'tomato',
  '西红柿': 'tomato', // 别名
  // ... 更多映射
}

function translateToEnglish(chineseName: string): string {
  return foodTranslations[chineseName] || chineseName
}
```

### 全文搜索（PostgreSQL）
```sql
-- 创建全文搜索索引
CREATE INDEX idx_food_search ON foods USING GIN(to_tsvector('simple', name || ' ' || name_en));

-- 查询示例
SELECT * FROM foods
WHERE to_tsvector('simple', name || ' ' || name_en) @@ to_tsquery('simple', '鸡 | chicken');
```

---

## Nutrition Calculation Service

```typescript
interface NutritionInput {
  foodId: string
  amount: number // g
}

async function calculateNutrition(inputs: NutritionInput[]) {
  const foods = await prisma.food.findMany({
    where: { id: { in: inputs.map(i => i.foodId) } }
  })

  return inputs.map(input => {
    const food = foods.find(f => f.id === input.foodId)!
    const ratio = input.amount / 100 // 数据库存储per 100g

    return {
      foodId: input.foodId,
      calories: food.calories * ratio,
      protein: food.protein * ratio,
      carbs: food.carbs * ratio,
      fat: food.fat * ratio
    }
  })
}
```

---

## Performance Optimization

### Database Indexing
```prisma
model Food {
  @@index([category])
  @@index([source])
  @@index([nameEn])
  @@fulltext([name, nameEn])
}
```

### Batch Query
```typescript
// Bad: N+1 queries
for (const foodId of foodIds) {
  const food = await prisma.food.findUnique({ where: { id: foodId } })
}

// Good: Single query
const foods = await prisma.food.findMany({
  where: { id: { in: foodIds } }
})
```

---

## Risks / Trade-offs

### Risk 1: USDA API Rate Limit
- **缓解**: 本地缓存90天 + Redis缓存

### Risk 2: 中文食材覆盖不足
- **解决**: 手动维护中文食材库（常用500种）

---

**最后更新**: 2025-10-29
**维护者**: Ronn Huang
