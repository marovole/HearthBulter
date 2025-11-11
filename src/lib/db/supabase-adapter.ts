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

/**
 * 递归构建嵌套关系的 Supabase select 字符串
 *
 * 支持多层嵌套：
 * - { ingredients: { include: { food: true } } }
 *   => "ingredients(*,food(*))"
 *
 * @param include - Prisma include 对象
 * @param depth - 当前递归深度（防止过深嵌套）
 * @param maxDepth - 最大允许深度
 * @param visited - 访问过的对象集合（防止循环引用）
 * @returns Supabase select 片段数组
 */
function buildNestedInclude(
  include: any,
  depth: number = 0,
  maxDepth: number = 4,
  visited: WeakSet<object> = new WeakSet()
): string[] {
  // 深度保护 - 抛出错误而非静默截断
  if (depth >= maxDepth) {
    throw new Error(
      `[Supabase Adapter] Include depth limit (${maxDepth}) exceeded. ` +
      `This may indicate a circular reference or overly complex query. ` +
      `Consider flattening your include structure or using multiple queries.`
    );
  }

  // 类型检查
  if (!include || typeof include !== 'object' || Array.isArray(include)) {
    return [];
  }

  // 循环引用检测
  if (visited.has(include)) {
    console.warn('[Supabase Adapter] Circular reference detected in include, skipping');
    return [];
  }

  visited.add(include);

  const relations: string[] = [];

  Object.entries(include).forEach(([key, value]) => {
    // 跳过 false 或 null 值
    if (!value) {
      return;
    }

    const snakeKey = toSnakeCase(key);

    // 情况1: value === true，表示包含所有字段
    if (value === true) {
      relations.push(`${snakeKey}(*)`);
      return;
    }

    // 情况2: value 是对象，可能包含嵌套 include
    if (typeof value === 'object') {
      // 检查是否有嵌套 include
      const nestedInclude = value.include;

      if (nestedInclude) {
        // 递归处理嵌套关系，传递 visited 集合
        const childRelations = buildNestedInclude(nestedInclude, depth + 1, maxDepth, visited);

        if (childRelations.length > 0) {
          // 有嵌套关系：table(*,nested_table(*))
          relations.push(`${snakeKey}(*,${childRelations.join(',')})`);
        } else {
          // 没有有效的嵌套关系，只包含当前表
          relations.push(`${snakeKey}(*)`);
        }
      } else {
        // 对象但没有 include 属性，可能是 where/select 等其他配置
        // 暂时只包含所有字段
        relations.push(`${snakeKey}(*)`);
      }
    }
  });

  return relations;
}

/**
 * 查询构建器 - 处理 include/select
 *
 * 支持：
 * - select: 指定字段
 * - include: 关系加载（支持递归嵌套）
 *
 * @param include - Prisma include 对象
 * @param select - Prisma select 对象
 * @returns Supabase select 查询字符串
 */
function buildSelectQuery(include?: any, select?: any): string {
  // 优先处理 select（显式字段选择）
  if (select) {
    return Object.keys(select)
      .filter(key => select[key])
      .map(toSnakeCase)
      .join(',');
  }

  // 处理 include（关系加载）
  if (include) {
    const relations = buildNestedInclude(include);

    if (relations.length > 0) {
      // 包含基础字段 + 关系
      return `*,${relations.join(',')}`;
    }

    // 没有有效关系，只返回基础字段
    return '*';
  }

  // 默认返回所有字段
  return '*';
}

/**
 * 将 Prisma 风格的 where 条件转换为 Supabase 过滤器
 *
 * 支持的功能：
 * - 基本条件：eq, neq, in, notIn, lt, lte, gt, gte
 * - 字符串匹配：contains, startsWith, endsWith (不区分大小写)
 * - 逻辑运算：OR, AND, NOT
 *
 * 限制：
 * - 关系过滤（some/every/none）需要使用 inner join，暂不支持
 * - 深层嵌套查询建议使用 Supabase RPC 或视图
 *
 * @param query - Supabase 查询对象
 * @param where - Prisma 风格的 where 条件
 * @param tableName - 表名（用于错误提示）
 * @returns 应用了过滤条件的查询对象
 */
function applyWhereClause(query: any, where: any, tableName: string): any {
  if (!where) return query;

  Object.entries(where).forEach(([key, value]) => {
    // 处理逻辑运算符
    if (key === 'OR' && Array.isArray(value)) {
      // 构建 OR 表达式：column1.eq.value1,column2.eq.value2
      const orExpressions: string[] = [];
      value.forEach(condition => {
        const expressions = buildFilterExpressions(condition);
        orExpressions.push(...expressions);
      });

      if (orExpressions.length > 0) {
        query = query.or(orExpressions.join(','));
      }
      return;
    }

    if (key === 'AND' && Array.isArray(value)) {
      // AND 通过多次调用 applyWhereClause 实现
      value.forEach(condition => {
        query = applyWhereClause(query, condition, tableName);
      });
      return;
    }

    if (key === 'NOT') {
      // NOT 需要反转条件
      // 由于 Supabase 的 not() API 较复杂，这里简化处理
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([notKey, notValue]) => {
          const snakeKey = toSnakeCase(notKey);
          if (notValue === null) {
            query = query.not(snakeKey, 'is', null);
          } else if (typeof notValue === 'object') {
            // NOT 复杂条件暂不支持
            throw new Error(`Complex NOT conditions not yet supported in Supabase adapter for table ${tableName}`);
          } else {
            query = query.neq(snakeKey, notValue);
          }
        });
      }
      return;
    }

    // 检查关系过滤（some/every/none）
    if (typeof value === 'object' && !Array.isArray(value) &&
        ('some' in value || 'every' in value || 'none' in value)) {
      const relationFilter = 'some' in value ? 'some' : 'every' in value ? 'every' : 'none';
      const condition = JSON.stringify(value[relationFilter]);
      throw new Error(
        `Relation filter not yet supported in Supabase adapter:\n` +
        `  Table: ${tableName}\n` +
        `  Field: ${key}\n` +
        `  Filter: ${relationFilter}\n` +
        `  Condition: ${condition}\n\n` +
        `Workarounds:\n` +
        `  1. Use Supabase inner joins in select (e.g., .select('*, ${toSnakeCase(key)}!inner(*)'))\n` +
        `  2. Implement as Postgres RPC function\n` +
        `  3. Filter in application layer after fetch\n\n` +
        `This feature will be added in Step 3 of the migration.`
      );
    }

    // 处理普通字段条件
    const snakeKey = toSnakeCase(key);

    if (value === null) {
      query = query.is(snakeKey, null);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // 处理比较运算符
      query = applyComparisonOperators(query, snakeKey, value);
    } else {
      // 简单相等比较
      query = query.eq(snakeKey, value);
    }
  });

  return query;
}

/**
 * 应用比较运算符到查询
 */
function applyComparisonOperators(query: any, column: string, operators: any): any {
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
    // Supabase 的 not + in 组合
    // 注意：直接传递数组，不要转换为字符串以避免注入风险
    if (!Array.isArray(operators.notIn)) {
      throw new Error(`notIn operator requires an array value, got: ${typeof operators.notIn}`);
    }
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
    // 不区分大小写的包含
    query = query.ilike(column, `%${operators.contains}%`);
  }
  if ('startsWith' in operators) {
    query = query.ilike(column, `${operators.startsWith}%`);
  }
  if ('endsWith' in operators) {
    query = query.ilike(column, `%${operators.endsWith}`);
  }
  if ('mode' in operators && operators.mode === 'insensitive') {
    // 处理不区分大小写的模式
    // 这个通常和 contains/startsWith/endsWith 配合使用
    // ilike 已经是不区分大小写的，所以这里不需要额外处理
  }

  return query;
}

/**
 * 构建 OR 表达式数组
 * 将 Prisma where 对象转换为 Supabase or() 接受的表达式格式
 *
 * @example
 * 输入: { name: "Alice", age: { gt: 18 } }
 * 输出: ["name.eq.Alice", "age.gt.18"]
 */
function buildFilterExpressions(where: any): string[] {
  const expressions: string[] = [];

  Object.entries(where).forEach(([key, value]) => {
    const snakeKey = toSnakeCase(key);

    if (value === null) {
      expressions.push(`${snakeKey}.is.null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // 处理运算符对象
      Object.entries(value).forEach(([operator, operatorValue]) => {
        if (operator === 'equals') {
          expressions.push(`${snakeKey}.eq.${operatorValue}`);
        } else if (operator === 'not') {
          expressions.push(`${snakeKey}.neq.${operatorValue}`);
        } else if (operator === 'in') {
          const values = Array.isArray(operatorValue) ? operatorValue.join(',') : operatorValue;
          expressions.push(`${snakeKey}.in.(${values})`);
        } else if (operator === 'lt') {
          expressions.push(`${snakeKey}.lt.${operatorValue}`);
        } else if (operator === 'lte') {
          expressions.push(`${snakeKey}.lte.${operatorValue}`);
        } else if (operator === 'gt') {
          expressions.push(`${snakeKey}.gt.${operatorValue}`);
        } else if (operator === 'gte') {
          expressions.push(`${snakeKey}.gte.${operatorValue}`);
        } else if (operator === 'contains') {
          expressions.push(`${snakeKey}.ilike.%${operatorValue}%`);
        } else if (operator === 'startsWith') {
          expressions.push(`${snakeKey}.ilike.${operatorValue}%`);
        } else if (operator === 'endsWith') {
          expressions.push(`${snakeKey}.ilike.%${operatorValue}`);
        }
      });
    } else {
      // 简单相等
      expressions.push(`${snakeKey}.eq.${value}`);
    }
  });

  return expressions;
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

  /**
   * Prisma 风格的 upsert（插入或更新）
   *
   * 注意：与 Prisma 的行为差异
   * - Prisma: INSERT 使用 create 字段，UPDATE 使用 update 字段
   * - Supabase: 使用合并后的数据进行 INSERT 或 UPDATE
   *
   * 实现策略：
   * 1. 合并 create 和 update 数据（update 优先）
   * 2. 确保 where 字段包含在数据中（onConflict 需要）
   * 3. 使用 Supabase 的 upsert API
   *
   * @example
   * ```typescript
   * upsert({
   *   where: { userId: "123", platform: "taobao" },
   *   create: { userId: "123", platform: "taobao", accessToken: "token1", refreshToken: "refresh1" },
   *   update: { accessToken: "token2" }
   * })
   * ```
   * 结果：如果存在则只更新 accessToken，不存在则创建包含所有 create 字段的记录
   */
  async upsert(args: {
    where: any;
    create: any;
    update: any;
    include?: any;
    select?: any;
  }): Promise<T> {
    // 验证 where 条件
    if (!args.where || Object.keys(args.where).length === 0) {
      throw new Error(
        `Supabase upsert requires at least one unique field in where clause for table ${this.tableName}`
      );
    }

    // 提取 where 中的标量字段作为 onConflict 目标
    // 过滤掉运算符对象和关系字段
    const scalarWhereFields: Record<string, any> = {};
    Object.entries(args.where).forEach(([key, value]) => {
      // 只保留简单标量值（用于唯一键匹配）
      if (typeof value !== 'object' || value === null) {
        scalarWhereFields[key] = value;
      } else if (typeof value === 'object' && 'equals' in value) {
        // 处理 { field: { equals: value } } 形式
        scalarWhereFields[key] = value.equals;
      }
      // 忽略其他复杂条件（如 gt, lt, contains 等）
    });

    if (Object.keys(scalarWhereFields).length === 0) {
      throw new Error(
        `Supabase upsert requires at least one scalar field in where clause for table ${this.tableName}. ` +
        `Got: ${JSON.stringify(args.where)}`
      );
    }

    // 转换为 snake_case
    const snakeCreate = keysToSnakeCase(args.create);
    const snakeUpdate = keysToSnakeCase(args.update);
    const snakeWhereFields = keysToSnakeCase(scalarWhereFields);

    // 构建 onConflict 列
    const conflictColumns = Object.keys(snakeWhereFields).join(',');

    // 合并数据：create 作为基础，where 字段确保存在，update 最后覆盖
    // 这样可以保证：
    // - INSERT 时：使用 create 的完整数据 + where 的唯一键值
    // - UPDATE 时：应用 update 的变更
    // - onConflict 字段总是存在且值正确
    const payload = {
      ...snakeCreate,
      ...snakeWhereFields, // 确保唯一键字段存在且值正确
      ...snakeUpdate,      // update 字段可能覆盖某些 create 字段
    };

    const selectQuery = buildSelectQuery(args.include, args.select);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(payload, {
        onConflict: conflictColumns,
        ignoreDuplicates: false, // 如果冲突则更新
      })
      .select(selectQuery)
      .single();

    if (error) {
      throw new Error(
        `Supabase upsert error in table ${this.tableName}: ${error.message}. ` +
        `Conflict columns: ${conflictColumns}. ` +
        `Where fields: ${JSON.stringify(args.where)}`
      );
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
  userConsent: ModelAdapter;

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
    this.userConsent = new ModelAdapter('user_consents', this.supabase);
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
