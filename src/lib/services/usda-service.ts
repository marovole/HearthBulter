/**
 * USDA FoodData Central API 集成服务
 * 
 * 提供食物营养成分查询功能，对接USDA API获取权威营养数据
 * 参考: https://fdc.nal.usda.gov/api-guide.html
 */

interface USDAFoodNutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

interface USDAFood {
  fdcId: number
  description: string
  foodNutrients: USDAFoodNutrient[]
  dataType?: string
  brandOwner?: string
}

interface USDASearchResponse {
  foods: USDAFood[]
  totalHits: number
  currentPage: number
  totalPages: number
}

interface FoodData {
  id?: string
  name: string
  nameEn: string
  aliases: string[]
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  vitaminA?: number
  vitaminC?: number
  calcium?: number
  iron?: number
  category: string
  tags: string[]
  source: 'USDA' | 'LOCAL' | 'USER_SUBMITTED'
  usdaId?: string
  verified: boolean
}

/**
 * 中英文食物名称映射表
 * 用于将中文食物名翻译为英文以查询USDA API
 */
const FOOD_TRANSLATIONS: Record<string, string> = {
  鸡胸肉: 'chicken breast',
  牛肉: 'beef',
  西兰花: 'broccoli',
  番茄: 'tomato',
  西红柿: 'tomato',
  鸡蛋: 'egg',
  牛奶: 'milk',
  米饭: 'rice',
  面条: 'noodles',
  面包: 'bread',
  香蕉: 'banana',
  苹果: 'apple',
  橙子: 'orange',
  三文鱼: 'salmon',
  虾: 'shrimp',
  牛油果: 'avocado',
  燕麦: 'oats',
  酸奶: 'yogurt',
  奶酪: 'cheese',
}

/**
 * 根据营养物ID获取营养素值
 */
function getNutrientValue(
  nutrients: USDAFoodNutrient[],
  nutrientId: number
): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId)
  return nutrient?.value
}

/**
 * USDA营养物ID常量
 * 参考: https://fdc.nal.usda.gov/api-guide.html#nutrients
 */
const NUTRIENT_IDS = {
  ENERGY: 1008, // Energy (kcal)
  PROTEIN: 1003, // Protein
  CARBOHYDRATE: 1005, // Carbohydrate, by difference
  FAT: 1004, // Total lipid (fat)
  FIBER: 1079, // Fiber, total dietary
  SUGAR: 2000, // Sugars, total including NLEA
  SODIUM: 1093, // Sodium, Na
  VITAMIN_A: 1106, // Vitamin A, RAE
  VITAMIN_C: 1162, // Vitamin C, total ascorbic acid
  CALCIUM: 1087, // Calcium, Ca
  IRON: 1089, // Iron, Fe
} as const

/**
 * 将USDA API响应映射到本地Food模型
 */
function mapUSDAToLocal(usdaFood: USDAFood): Omit<FoodData, 'id'> {
  const nutrients = usdaFood.foodNutrients || []

  // 提取主要营养素
  const calories = getNutrientValue(nutrients, NUTRIENT_IDS.ENERGY) || 0
  const protein = getNutrientValue(nutrients, NUTRIENT_IDS.PROTEIN) || 0
  const carbs = getNutrientValue(nutrients, NUTRIENT_IDS.CARBOHYDRATE) || 0
  const fat = getNutrientValue(nutrients, NUTRIENT_IDS.FAT) || 0
  const fiber = getNutrientValue(nutrients, NUTRIENT_IDS.FIBER)
  const sugar = getNutrientValue(nutrients, NUTRIENT_IDS.SUGAR)
  const sodium = getNutrientValue(nutrients, NUTRIENT_IDS.SODIUM)
  const vitaminA = getNutrientValue(nutrients, NUTRIENT_IDS.VITAMIN_A)
  const vitaminC = getNutrientValue(nutrients, NUTRIENT_IDS.VITAMIN_C)
  const calcium = getNutrientValue(nutrients, NUTRIENT_IDS.CALCIUM)
  const iron = getNutrientValue(nutrients, NUTRIENT_IDS.IRON)

  // 简单的分类判断（可以根据description进一步优化）
  const category = inferCategory(usdaFood.description)

  return {
    name: translateToChinese(usdaFood.description),
    nameEn: usdaFood.description,
    aliases: [],
    calories: Math.round(calories * 10) / 10, // 保留1位小数
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: fiber ? Math.round(fiber * 10) / 10 : undefined,
    sugar: sugar ? Math.round(sugar * 10) / 10 : undefined,
    sodium: sodium ? Math.round(sodium * 10) / 10 : undefined,
    vitaminA: vitaminA ? Math.round(vitaminA * 10) / 10 : undefined,
    vitaminC: vitaminC ? Math.round(vitaminC * 10) / 10 : undefined,
    calcium: calcium ? Math.round(calcium * 10) / 10 : undefined,
    iron: iron ? Math.round(iron * 10) / 10 : undefined,
    category,
    tags: inferTags(protein, carbs, fat),
    source: 'USDA',
    usdaId: usdaFood.fdcId.toString(),
    verified: false,
  }
}

/**
 * 将英文食物名翻译为中文（简单映射）
 */
function translateToChinese(englishName: string): string {
  // 反转映射表查找
  const entry = Object.entries(FOOD_TRANSLATIONS).find(
    ([_, en]) => en.toLowerCase() === englishName.toLowerCase()
  )
  return entry ? entry[0] : englishName
}

/**
 * 将中文食物名翻译为英文
 */
function translateToEnglish(chineseName: string): string {
  return FOOD_TRANSLATIONS[chineseName] || chineseName
}

/**
 * 根据食物描述推断分类
 */
function inferCategory(description: string): string {
  const desc = description.toLowerCase()
  if (desc.includes('chicken') || desc.includes('beef') || desc.includes('pork')) {
    return 'PROTEIN'
  }
  if (desc.includes('salmon') || desc.includes('shrimp') || desc.includes('fish')) {
    return 'SEAFOOD'
  }
  if (desc.includes('milk') || desc.includes('cheese') || desc.includes('yogurt')) {
    return 'DAIRY'
  }
  if (desc.includes('broccoli') || desc.includes('spinach') || desc.includes('lettuce')) {
    return 'VEGETABLES'
  }
  if (desc.includes('apple') || desc.includes('banana') || desc.includes('orange')) {
    return 'FRUITS'
  }
  if (desc.includes('rice') || desc.includes('wheat') || desc.includes('oats')) {
    return 'GRAINS'
  }
  return 'OTHER'
}

/**
 * 根据营养素推断标签
 */
function inferTags(protein: number, carbs: number, fat: number): string[] {
  const tags: string[] = []
  if (protein > 20) tags.push('高蛋白')
  if (carbs < 10) tags.push('低碳水')
  if (fat < 5) tags.push('低脂')
  return tags
}

/**
 * USDA API服务类
 */
export class USDAService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1'
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // ms

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.USDA_API_KEY || ''
    if (!this.apiKey) {
      console.warn(
        'USDA_API_KEY not configured. USDA features will be limited.'
      )
    }
  }

  /**
   * 搜索食物
   * @param query 搜索关键词（支持中英文）
   * @param pageSize 每页结果数（默认50）
   * @param pageNumber 页码（默认1）
   */
  async searchFoods(
    query: string,
    pageSize = 50,
    pageNumber = 1
  ): Promise<USDASearchResponse> {
    if (!this.apiKey) {
      throw new Error('USDA API key is not configured')
    }

    // 如果是中文，尝试翻译为英文
    const searchQuery = translateToEnglish(query)

    const url = new URL(`${this.baseUrl}/foods/search`)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('query', searchQuery)
    url.searchParams.set('pageSize', pageSize.toString())
    url.searchParams.set('pageNumber', pageNumber.toString())
    url.searchParams.set('dataType', 'Foundation,SR Legacy') // 限制数据源类型

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit exceeded
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : this.retryDelay * attempt
            await this.sleep(delay)
            continue
          }

          throw new Error(
            `USDA API error: ${response.status} ${response.statusText}`
          )
        }

        const data = await response.json()
        return data as USDASearchResponse
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt)
        }
      }
    }

    throw new Error(
      `Failed to search USDA API after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * 根据FDC ID获取食物详情
   */
  async getFoodByFdcId(fdcId: number): Promise<USDAFood> {
    if (!this.apiKey) {
      throw new Error('USDA API key is not configured')
    }

    const url = new URL(`${this.baseUrl}/food/${fdcId}`)
    url.searchParams.set('api_key', this.apiKey)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : this.retryDelay * attempt
            await this.sleep(delay)
            continue
          }

          throw new Error(
            `USDA API error: ${response.status} ${response.statusText}`
          )
        }

        return (await response.json()) as USDAFood
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt)
        }
      }
    }

    throw new Error(
      `Failed to fetch USDA food after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * 搜索食物并映射为本地格式
   */
  async searchAndMapFoods(
    query: string,
    limit = 10
  ): Promise<Omit<FoodData, 'id'>[]> {
    const response = await this.searchFoods(query, limit, 1)
    return response.foods.map(mapUSDAToLocal)
  }

  /**
   * 根据FDC ID获取食物并映射为本地格式
   */
  async getFoodByFdcIdAndMap(
    fdcId: number
  ): Promise<Omit<FoodData, 'id'>> {
    const usdaFood = await this.getFoodByFdcId(fdcId)
    return mapUSDAToLocal(usdaFood)
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const usdaService = new USDAService()

// 导出类型
export type { FoodData, USDAFood, USDASearchResponse }

