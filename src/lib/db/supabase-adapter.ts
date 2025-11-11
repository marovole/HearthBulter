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
export class SupabaseClientManager {
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

// 查询构建器 - 处理 include/select
function buildSelectQuery(include?: any, select?: any): string {
  if (select) {
    return Object.keys(select)
      .filter(key => select[key])
      .map(toSnakeCase)
      .join(',');
  }
  
  if (include) {
    const baseFields = '*';
    const relations = Object.keys(include)
      .filter(key => include[key])
      .map(key => `${toSnakeCase(key)}(*)`);
    
    return relations.length > 0 
      ? `${baseFields},${relations.join(',')}`
      : baseFields;
  }
  
  return '*';
}

// where 条件构建器
function applyWhereClause(query: any, where: any, tableName: string) {
  if (!where) return query;

  Object.entries(where).forEach(([key, value]) => {
    const snakeKey = toSnakeCase(key);
    
    if (value === null) {
      query = query.is(snakeKey, null);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
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
    
    if (args?.orderBy) {
      Object.entries(args.orderBy).forEach(([key, direction]) => {
        query = query.order(toSnakeCase(key), { 
          ascending: direction === 'asc', 
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
  recipeRating: ModelAdapter;
  recipeFavorite: ModelAdapter;
  recipeView: ModelAdapter;
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
    this.recipeRating = new ModelAdapter('recipe_ratings', this.supabase);
    this.recipeFavorite = new ModelAdapter('recipe_favorites', this.supabase);
    this.recipeView = new ModelAdapter('recipe_views', this.supabase);
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
