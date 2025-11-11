/**
 * Supabase 适配器 - 提供与 Prisma 兼容的 API
 * 
 * 这个适配器层使得从 Prisma 迁移到 Supabase 时，
 * 可以最小化代码变更，保持业务逻辑不变。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';

// 环境变量获取函数，支持多种环境
function getSupabaseConfig() {
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL;
  
  const supabaseKey = 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY'
    );
  }

  return { supabaseUrl, supabaseKey };
}

// 单例模式的 Supabase 客户端
class SupabaseClientManager {
  private static instance: SupabaseClient<Database>;

  static getInstance(): SupabaseClient<Database> {
    if (!SupabaseClientManager.instance) {
      const { supabaseUrl, supabaseKey } = getSupabaseConfig();
      
      SupabaseClientManager.instance = createClient<Database>(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              'x-application-name': 'health-butler',
            },
          },
        }
      );
    }

    return SupabaseClientManager.instance;
  }
}

// 辅助函数：将 snake_case 转换为 camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 辅助函数：将 camelCase 转换为 snake_case
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// 辅助函数：转换对象的键从 snake_case 到 camelCase
function keysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

// 辅助函数：转换对象的键从 camelCase 到 snake_case
function keysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

/**
 * 查询构建器 - 处理 include/select（支持嵌套关系）
 *
 * 支持 Prisma 风格的嵌套 include:
 * include: { ingredients: { include: { food: true } } }
 * 生成: *,ingredients(food(*))
 *
 * @param include - Prisma 风格的 include 对象
 * @param select - Prisma 风格的 select 对象
 * @param includeBaseFields - 是否包含基础字段 (*)
 * @returns Supabase 查询字符串
 */
function buildSelectQuery(
  include?: Record<string, any>,
  select?: Record<string, any>,
  includeBaseFields = true
): string {
  // 处理 select 优先
  if (select) {
    return buildSelectFromSelect(select);
  }

  const fragments: string[] = [];

  // 添加基础字段
  if (includeBaseFields) {
    fragments.push('*');
  }

  // 处理 include 关系
  if (include) {
    Object.entries(include)
      .filter(([, value]) => Boolean(value))
      .forEach(([relation, value]) => {
        fragments.push(buildRelationFragment(relation, value));
      });
  }

  return fragments.length ? fragments.join(',') : '*';
}

/**
 * 从 select 对象构建查询字符串
 */
function buildSelectFromSelect(select: Record<string, any>): string {
  const fragments: string[] = [];

  Object.entries(select)
    .filter(([, value]) => Boolean(value))
    .forEach(([field, value]) => {
      if (value === true) {
        // 简单字段选择
        fragments.push(toSnakeCase(field));
        return;
      }

      // 嵌套关系选择
      fragments.push(buildRelationFragment(field, value));
    });

  return fragments.length ? fragments.join(',') : '*';
}

/**
 * 构建单个关系的片段（递归处理嵌套）
 *
 * @param key - 关系名称
 * @param value - 关系配置 (true | { include } | { select })
 * @returns 关系查询片段，如: ingredients(food(*))
 */
function buildRelationFragment(key: string, value: any): string {
  const relation = toSnakeCase(key);

  // 简单的 true 值
  if (value === true) {
    return `${relation}(*)`;
  }

  let nestedInclude: Record<string, any> | undefined;
  let nestedSelect: Record<string, any> | undefined;
  let includeBaseFields = true;

  // 解析嵌套配置
  if (typeof value === 'object' && value !== null) {
    if ('include' in value || 'select' in value) {
      nestedInclude = value.include;
      nestedSelect = value.select;
    } else {
      // 对象直接作为 select
      nestedSelect = value;
    }

    // 如果有显式 select，不包含默认的 *
    if (nestedSelect) {
      includeBaseFields = false;
    }
  }

  // 递归构建嵌套查询
  const nestedQuery = buildSelectQuery(nestedInclude, nestedSelect, includeBaseFields);
  return `${relation}(${nestedQuery})`;
}

/**
 * 构建 JSON path 选择器
 *
 * 例如: buildJsonPathSelector('metadata', ['season', 'type'])
 * 返回: metadata->'season'->>'type'
 *
 * @param column - 基础列名
 * @param path - JSON 路径数组
 * @returns PostgREST JSON 路径选择器
 */
function buildJsonPathSelector(column: string, path: string[]): string {
  if (!path || path.length === 0) return column;

  // 转义单引号
  const normalized = path.map(segment => segment.replace(/'/g, "''"));
  const last = normalized.pop()!;

  // 中间路径使用 ->，最后一个使用 ->>（返回文本）
  const intermediate = normalized.map(segment => `->'${segment}'`).join('');

  return `${column}${intermediate}->>'${last}'`;
}

/**
 * 应用 JSON path 过滤器
 *
 * 支持的操作符: equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith
 */
function applyJsonPathFilters(query: any, column: string, value: any) {
  const { path, ...operators } = value ?? {};

  if ('equals' in operators) {
    query = query.eq(column, operators.equals);
  }
  if ('not' in operators) {
    query = query.neq(column, operators.not);
  }
  if ('in' in operators) {
    query = query.in(column, operators.in);
  }
  if ('notIn' in operators) {
    query = query.not(column, 'in', operators.notIn);
  }
  if ('lt' in operators) {
    query = query.lt(column, operators.lt);
  }
  if ('lte' in operators) {
    query = query.lte(column, operators.lte);
  }
  if ('gt' in operators) {
    query = query.gt(column, operators.gt);
  }
  if ('gte' in operators) {
    query = query.gte(column, operators.gte);
  }
  if ('contains' in operators) {
    query = query.ilike(column, `%${operators.contains}%`);
  }
  if ('startsWith' in operators) {
    query = query.ilike(column, `${operators.startsWith}%`);
  }
  if ('endsWith' in operators) {
    query = query.ilike(column, `%${operators.endsWith}`);
  }

  return query;
}

// where 条件构建器
function applyWhereClause(query: any, where: any, tableName: string) {
  if (!where) return query;

  Object.entries(where).forEach(([key, value]) => {
    const snakeKey = toSnakeCase(key);
    
    if (value === null) {
      query = query.is(snakeKey, null);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // 检查是否为 JSON path 查询
      const hasJsonPath = Array.isArray((value as any).path) && (value as any).path.length > 0;

      if (hasJsonPath) {
        // 使用 JSON path 过滤器
        query = applyJsonPathFilters(
          query,
          buildJsonPathSelector(snakeKey, (value as any).path),
          value
        );
        return;
      }

      // 处理复杂查询条件
      if ('equals' in value) {
        query = query.eq(snakeKey, value.equals);
      }
      if ('not' in value) {
        query = query.neq(snakeKey, value.not);
      }
      if ('in' in value) {
        query = query.in(snakeKey, value.in);
      }
      if ('notIn' in value) {
        query = query.not(snakeKey, 'in', value.notIn);
      }
      if ('lt' in value) {
        query = query.lt(snakeKey, value.lt);
      }
      if ('lte' in value) {
        query = query.lte(snakeKey, value.lte);
      }
      if ('gt' in value) {
        query = query.gt(snakeKey, value.gt);
      }
      if ('gte' in value) {
        query = query.gte(snakeKey, value.gte);
      }
      if ('contains' in value) {
        query = query.ilike(snakeKey, `%${value.contains}%`);
      }
      if ('startsWith' in value) {
        query = query.ilike(snakeKey, `${value.startsWith}%`);
      }
      if ('endsWith' in value) {
        query = query.ilike(snakeKey, `%${value.endsWith}`);
      }
    } else {
      query = query.eq(snakeKey, value);
    }
  });

  return query;
}

// 通用模型适配器类
class ModelAdapter<T = any> {
  constructor(
    private tableName: string,
    private supabase: SupabaseClient<Database>
  ) {}

  async findUnique(args: {
    where: any;
    include?: any;
    select?: any;
  }): Promise<T | null> {
    const selectQuery = buildSelectQuery(args.include, args.select);
    let query = this.supabase.from(this.tableName).select(selectQuery);
    
    query = applyWhereClause(query, args.where, this.tableName);
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    return keysToCamelCase(data) as T;
  }

  async findMany(args?: {
    where?: any;
    include?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<T[]> {
    const selectQuery = buildSelectQuery(args?.include, args?.select);
    let query = this.supabase.from(this.tableName).select(selectQuery);
    
    if (args?.where) {
      query = applyWhereClause(query, args.where, this.tableName);
    }
    
    // 支持 Prisma 风格的 orderBy 数组和对象格式
    // orderBy: [{ field1: 'desc' }, { field2: 'asc' }] 或 orderBy: { field: 'desc' }
    if (args?.orderBy) {
      const orderings = Array.isArray(args.orderBy)
        ? args.orderBy
        : [args.orderBy];

      orderings
        .filter(Boolean)
        .forEach((clause) => {
          const entries = Object.entries(clause);
          if (!entries.length) return;

          // 每个 clause 只取第一个字段（Prisma 每个对象一个字段）
          const [field, direction] = entries[0] as [string, string];
          query = query.order(toSnakeCase(field), {
            ascending: String(direction).toLowerCase() !== 'desc',
          });
        });
    }
    
    if (args?.skip) {
      query = query.range(args.skip, args.skip + (args.take || 1000) - 1);
    } else if (args?.take) {
      query = query.limit(args.take);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    return keysToCamelCase(data) as T[];
  }

  async findFirst(args?: {
    where?: any;
    include?: any;
    select?: any;
    orderBy?: any;
  }): Promise<T | null> {
    const results = await this.findMany({ ...args, take: 1 });
    return results[0] || null;
  }

  async create(args: {
    data: any;
    include?: any;
    select?: any;
  }): Promise<T> {
    const snakeData = keysToSnakeCase(args.data);
    const selectQuery = buildSelectQuery(args.include, args.select);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(snakeData)
      .select(selectQuery)
      .single();
    
    if (error) {
      throw new Error(`Supabase create error: ${error.message}`);
    }
    
    return keysToCamelCase(data) as T;
  }

  async createMany(args: {
    data: any[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }> {
    const snakeData = args.data.map(keysToSnakeCase);
    
    const { error, count } = await this.supabase
      .from(this.tableName)
      .insert(snakeData, { 
        ignoreDuplicates: args.skipDuplicates, 
      });
    
    if (error) {
      throw new Error(`Supabase createMany error: ${error.message}`);
    }
    
    return { count: count || snakeData.length };
  }

  async update(args: {
    where: any;
    data: any;
    include?: any;
    select?: any;
  }): Promise<T> {
    const snakeData = keysToSnakeCase(args.data);
    const selectQuery = buildSelectQuery(args.include, args.select);
    
    let query = this.supabase
      .from(this.tableName)
      .update(snakeData)
      .select(selectQuery);
    
    query = applyWhereClause(query, args.where, this.tableName);
    
    const { data, error } = await query.single();
    
    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }
    
    return keysToCamelCase(data) as T;
  }

  async updateMany(args: {
    where: any;
    data: any;
  }): Promise<{ count: number }> {
    const snakeData = keysToSnakeCase(args.data);
    
    let query = this.supabase
      .from(this.tableName)
      .update(snakeData);
    
    query = applyWhereClause(query, args.where, this.tableName);
    
    const { error, count } = await query;
    
    if (error) {
      throw new Error(`Supabase updateMany error: ${error.message}`);
    }
    
    return { count: count || 0 };
  }

  async delete(args: {
    where: any;
  }): Promise<T> {
    let query = this.supabase
      .from(this.tableName)
      .delete()
      .select();
    
    query = applyWhereClause(query, args.where, this.tableName);
    
    const { data, error } = await query.single();
    
    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
    
    return keysToCamelCase(data) as T;
  }

  async deleteMany(args?: {
    where?: any;
  }): Promise<{ count: number }> {
    let query = this.supabase.from(this.tableName).delete();
    
    if (args?.where) {
      query = applyWhereClause(query, args.where, this.tableName);
    }
    
    const { error, count } = await query;
    
    if (error) {
      throw new Error(`Supabase deleteMany error: ${error.message}`);
    }
    
    return { count: count || 0 };
  }

  async count(args?: {
    where?: any;
  }): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });
    
    if (args?.where) {
      query = applyWhereClause(query, args.where, this.tableName);
    }
    
    const { count, error } = await query;
    
    if (error) {
      throw new Error(`Supabase count error: ${error.message}`);
    }
    
    return count || 0;
  }

  async aggregate(args: {
    where?: any;
    _count?: boolean;
    _avg?: any;
    _sum?: any;
    _min?: any;
    _max?: any;
  }): Promise<any> {
    // 注意：Supabase 不直接支持聚合函数，需要使用 RPC 或原生 SQL
    throw new Error('Aggregate functions need to be implemented using Supabase RPC');
  }
}

// 创建 Prisma 兼容的适配器实例
export class SupabaseAdapter {
  private supabase: SupabaseClient<Database>;

  // 所有模型的适配器
  user: ModelAdapter;
  family: ModelAdapter;
  familyMember: ModelAdapter;
  healthGoal: ModelAdapter;
  allergy: ModelAdapter;
  dietaryPreference: ModelAdapter;
  healthData: ModelAdapter;
  healthReminder: ModelAdapter;
  mealPlan: ModelAdapter;
  medicalReport: ModelAdapter;
  mealLog: ModelAdapter;
  trackingStreak: ModelAdapter;
  quickTemplate: ModelAdapter;
  dailyNutritionTarget: ModelAdapter;
  auxiliaryTracking: ModelAdapter;
  healthReport: ModelAdapter;
  healthScore: ModelAdapter;
  trendData: ModelAdapter;
  healthAnomaly: ModelAdapter;
  aiAdvice: ModelAdapter;
  aiConversation: ModelAdapter;
  budget: ModelAdapter;
  savingsRecommendation: ModelAdapter;
  userPreference: ModelAdapter;
  recipe: ModelAdapter;
  recipeRating: ModelAdapter;
  recipeFavorite: ModelAdapter;
  recipeView: ModelAdapter;
  ingredientSubstitution: ModelAdapter;
  task: ModelAdapter;
  activity: ModelAdapter;
  comment: ModelAdapter;
  familyGoal: ModelAdapter;
  shoppingItem: ModelAdapter;
  sharedContent: ModelAdapter;
  achievement: ModelAdapter;
  leaderboardEntry: ModelAdapter;
  communityPost: ModelAdapter;
  communityComment: ModelAdapter;
  notification: ModelAdapter;
  notificationPreference: ModelAdapter;
  inventoryItem: ModelAdapter;
  inventoryUsage: ModelAdapter;
  wasteLog: ModelAdapter;
  deviceConnection: ModelAdapter;

  constructor() {
    this.supabase = SupabaseClientManager.getInstance();

    // 初始化所有模型适配器
    this.user = new ModelAdapter('users', this.supabase);
    this.family = new ModelAdapter('families', this.supabase);
    this.familyMember = new ModelAdapter('family_members', this.supabase);
    this.healthGoal = new ModelAdapter('health_goals', this.supabase);
    this.allergy = new ModelAdapter('allergies', this.supabase);
    this.dietaryPreference = new ModelAdapter('dietary_preferences', this.supabase);
    this.healthData = new ModelAdapter('health_data', this.supabase);
    this.healthReminder = new ModelAdapter('health_reminders', this.supabase);
    this.mealPlan = new ModelAdapter('meal_plans', this.supabase);
    this.medicalReport = new ModelAdapter('medical_reports', this.supabase);
    this.mealLog = new ModelAdapter('meal_logs', this.supabase);
    this.trackingStreak = new ModelAdapter('tracking_streaks', this.supabase);
    this.quickTemplate = new ModelAdapter('quick_templates', this.supabase);
    this.dailyNutritionTarget = new ModelAdapter('daily_nutrition_targets', this.supabase);
    this.auxiliaryTracking = new ModelAdapter('auxiliary_trackings', this.supabase);
    this.healthReport = new ModelAdapter('health_reports', this.supabase);
    this.healthScore = new ModelAdapter('health_scores', this.supabase);
    this.trendData = new ModelAdapter('trend_data', this.supabase);
    this.healthAnomaly = new ModelAdapter('health_anomalies', this.supabase);
    this.aiAdvice = new ModelAdapter('ai_advices', this.supabase);
    this.aiConversation = new ModelAdapter('ai_conversations', this.supabase);
    this.budget = new ModelAdapter('budgets', this.supabase);
    this.savingsRecommendation = new ModelAdapter('savings_recommendations', this.supabase);
    this.userPreference = new ModelAdapter('user_preferences', this.supabase);
    this.recipe = new ModelAdapter('recipes', this.supabase);
    this.recipeRating = new ModelAdapter('recipe_ratings', this.supabase);
    this.recipeFavorite = new ModelAdapter('recipe_favorites', this.supabase);
    this.recipeView = new ModelAdapter('recipe_views', this.supabase);
    this.ingredientSubstitution = new ModelAdapter('ingredient_substitutions', this.supabase);
    this.task = new ModelAdapter('tasks', this.supabase);
    this.activity = new ModelAdapter('activities', this.supabase);
    this.comment = new ModelAdapter('comments', this.supabase);
    this.familyGoal = new ModelAdapter('family_goals', this.supabase);
    this.shoppingItem = new ModelAdapter('shopping_items', this.supabase);
    this.sharedContent = new ModelAdapter('shared_contents', this.supabase);
    this.achievement = new ModelAdapter('achievements', this.supabase);
    this.leaderboardEntry = new ModelAdapter('leaderboard_entries', this.supabase);
    this.communityPost = new ModelAdapter('community_posts', this.supabase);
    this.communityComment = new ModelAdapter('community_comments', this.supabase);
    this.notification = new ModelAdapter('notifications', this.supabase);
    this.notificationPreference = new ModelAdapter('notification_preferences', this.supabase);
    this.inventoryItem = new ModelAdapter('inventory_items', this.supabase);
    this.inventoryUsage = new ModelAdapter('inventory_usages', this.supabase);
    this.wasteLog = new ModelAdapter('waste_logs', this.supabase);
    this.deviceConnection = new ModelAdapter('device_connections', this.supabase);
  }

  // 原生 SQL 查询支持
  async $queryRaw(query: TemplateStringsArray, ...values: any[]): Promise<any> {
    throw new Error('Raw queries should use Supabase RPC functions');
  }

  async $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number> {
    throw new Error('Raw queries should use Supabase RPC functions');
  }

  // 事务支持 (Supabase 暂不直接支持，需要使用数据库函数)
  async $transaction(queries: any[]): Promise<any[]> {
    throw new Error('Transactions should use Supabase database functions');
  }

  // 连接管理
  async $connect(): Promise<void> {
    // Supabase 自动管理连接
    return Promise.resolve();
  }

  async $disconnect(): Promise<void> {
    // Supabase 自动管理连接
    return Promise.resolve();
  }
}

// 导出单例实例
export const supabaseAdapter = new SupabaseAdapter();

// 导出数据库健康检查
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const supabase = SupabaseClientManager.getInstance();
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

// 导出确保数据库连接的函数
export async function ensureDatabaseConnection(): Promise<void> {
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    throw new Error('Supabase connection failed');
  }
}
