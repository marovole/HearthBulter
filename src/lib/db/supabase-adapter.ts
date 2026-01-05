/**
 * Supabase 适配器 - 提供与 Prisma 兼容的 API
 *
 * 这个适配器层使得从 Prisma 迁移到 Supabase 时，
 * 可以最小化代码变更，保持业务逻辑不变。
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";

// 环境变量获取函数，支持多种环境
function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const error =
      "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY";
    console.error("❌ Supabase 配置错误:", error);
    console.error("环境变量状态:", {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "✅"
        : "❌",
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "✅" : "❌",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "✅"
        : "❌",
    });
    // 在生产环境仍然抛出错误，但提供更多诊断信息
    throw new Error(error);
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
            schema: "public",
          },
          global: {
            headers: {
              "x-application-name": "health-butler",
            },
          },
        },
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
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

// 辅助函数：转换对象的键从 snake_case 到 camelCase
function keysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }

  if (obj !== null && typeof obj === "object") {
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

  if (obj !== null && typeof obj === "object") {
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
  includeBaseFields = true,
): string {
  // 处理 select 优先
  if (select) {
    return buildSelectFromSelect(select);
  }

  const fragments: string[] = [];

  // 添加基础字段
  if (includeBaseFields) {
    fragments.push("*");
  }

  // 处理 include 关系
  if (include) {
    Object.entries(include)
      .filter(([, value]) => Boolean(value))
      .forEach(([relation, value]) => {
        fragments.push(buildRelationFragment(relation, value));
      });
  }

  return fragments.length ? fragments.join(",") : "*";
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

  return fragments.length ? fragments.join(",") : "*";
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
  if (typeof value === "object" && value !== null) {
    if ("include" in value || "select" in value) {
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
  const nestedQuery = buildSelectQuery(
    nestedInclude,
    nestedSelect,
    includeBaseFields,
  );
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
  const normalized = path.map((segment) => segment.replace(/'/g, "''"));
  const last = normalized.pop()!;

  // 中间路径使用 ->，最后一个使用 ->>（返回文本）
  const intermediate = normalized.map((segment) => `->'${segment}'`).join("");

  return `${column}${intermediate}->>'${last}'`;
}

/**
 * 应用 JSON path 过滤器
 *
 * 支持的操作符: equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith
 */
function applyJsonPathFilters(query: any, column: string, value: any) {
  const { path, ...operators } = value ?? {};

  if ("equals" in operators) {
    query = query.eq(column, operators.equals);
  }
  if ("not" in operators) {
    query = query.neq(column, operators.not);
  }
  if ("in" in operators) {
    query = query.in(column, operators.in);
  }
  if ("notIn" in operators) {
    query = query.not(column, "in", operators.notIn);
  }
  if ("lt" in operators) {
    query = query.lt(column, operators.lt);
  }
  if ("lte" in operators) {
    query = query.lte(column, operators.lte);
  }
  if ("gt" in operators) {
    query = query.gt(column, operators.gt);
  }
  if ("gte" in operators) {
    query = query.gte(column, operators.gte);
  }
  if ("contains" in operators) {
    query = query.ilike(column, `%${operators.contains}%`);
  }
  if ("startsWith" in operators) {
    query = query.ilike(column, `${operators.startsWith}%`);
  }
  if ("endsWith" in operators) {
    query = query.ilike(column, `%${operators.endsWith}`);
  }

  return query;
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
    if (key === "OR" && Array.isArray(value)) {
      // 构建 OR 表达式：column1.eq.value1,column2.eq.value2
      const orExpressions: string[] = [];
      value.forEach((condition) => {
        const expressions = buildFilterExpressions(condition);
        orExpressions.push(...expressions);
      });

      if (orExpressions.length > 0) {
        query = query.or(orExpressions.join(","));
      }
      return;
    }

    if (key === "AND" && Array.isArray(value)) {
      // AND 通过多次调用 applyWhereClause 实现
      value.forEach((condition) => {
        query = applyWhereClause(query, condition, tableName);
      });
      return;
    }

    if (key === "NOT") {
      // NOT 需要反转条件
      // 由于 Supabase 的 not() API 较复杂，这里简化处理
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value).forEach(([notKey, notValue]) => {
          const snakeKey = toSnakeCase(notKey);
          if (notValue === null) {
            query = query.not(snakeKey, "is", null);
          } else if (typeof notValue === "object") {
            // NOT 复杂条件暂不支持
            throw new Error(
              `Complex NOT conditions not yet supported in Supabase adapter for table ${tableName}`,
            );
          } else {
            query = query.neq(snakeKey, notValue);
          }
        });
      }
      return;
    }

    // 检查关系过滤（some/every/none）
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("some" in value || "every" in value || "none" in value)
    ) {
      const relationFilter =
        "some" in value ? "some" : "every" in value ? "every" : "none";
      const condition = JSON.stringify(value[relationFilter]);
      throw new Error(
        "Relation filter not yet supported in Supabase adapter:\n" +
          `  Table: ${tableName}\n` +
          `  Field: ${key}\n` +
          `  Filter: ${relationFilter}\n` +
          `  Condition: ${condition}\n\n` +
          "Workarounds:\n" +
          `  1. Use Supabase inner joins in select (e.g., .select('*, ${toSnakeCase(key)}!inner(*)'))\n` +
          "  2. Implement as Postgres RPC function\n" +
          "  3. Filter in application layer after fetch\n\n" +
          "This feature will be added in Step 3 of the migration.",
      );
    }

    // 处理普通字段条件
    const snakeKey = toSnakeCase(key);

    if (value === null) {
      query = query.is(snakeKey, null);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // 检查是否为 JSON path 查询
      const hasJsonPath =
        Array.isArray((value as any).path) && (value as any).path.length > 0;

      if (hasJsonPath) {
        // 使用 JSON path 过滤器
        query = applyJsonPathFilters(
          query,
          buildJsonPathSelector(snakeKey, (value as any).path),
          value,
        );
        return;
      }

      // 处理复杂查询条件
      if ("equals" in value) {
        query = query.eq(snakeKey, value.equals);
      }
      if ("not" in value) {
        query = query.neq(snakeKey, value.not);
      }
      if ("in" in value) {
        query = query.in(snakeKey, value.in);
      }
      if ("notIn" in value) {
        query = query.not(snakeKey, "in", value.notIn);
      }
      if ("lt" in value) {
        query = query.lt(snakeKey, value.lt);
      }
      if ("lte" in value) {
        query = query.lte(snakeKey, value.lte);
      }
      if ("gt" in value) {
        query = query.gt(snakeKey, value.gt);
      }
      if ("gte" in value) {
        query = query.gte(snakeKey, value.gte);
      }
      if ("contains" in value) {
        query = query.ilike(snakeKey, `%${value.contains}%`);
      }
      if ("startsWith" in value) {
        query = query.ilike(snakeKey, `${value.startsWith}%`);
      }
      if ("endsWith" in value) {
        query = query.ilike(snakeKey, `%${value.endsWith}`);
      }
    } else {
      // 简单相等比较
      query = query.eq(snakeKey, value);
    }
  });

  return query;
}

/**
 * 转义 PostgREST 查询值，防止注入攻击
 *
 * 需要转义的特殊字符：
 * - 逗号(,) - 用于分隔 OR 条件和 IN 列表
 * - 句点(.) - 用于分隔操作符
 * - 括号() - 用于 IN 操作符
 * - 百分号(%) - 用于 LIKE 通配符
 * - 引号 - 字符串定界符
 */
function escapeFilterValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const str = String(value);

  // 检测潜在的注入尝试
  const dangerousPatterns = [
    /\.\s*(eq|neq|gt|gte|lt|lte|like|ilike|in|is)\s*\./i,
    /,\s*(or|and)\s*\(/i,
    /;\s*(select|insert|update|delete|drop)/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(str)) {
      throw new Error(
        `Potentially malicious filter value detected: ${str.substring(0, 50)}`,
      );
    }
  }

  // 转义特殊字符：将双引号包裹字符串以保护特殊字符
  // PostgREST 对引号内的内容不做特殊解析
  if (
    str.includes(",") ||
    str.includes(".") ||
    str.includes("(") ||
    str.includes(")") ||
    str.includes("%")
  ) {
    // 使用双引号包裹，内部双引号需要转义
    return `"${str.replace(/"/g, "\\\"")}"`;
  }

  return str;
}

/**
 * 验证过滤器键名是否安全
 */
function validateFilterKey(key: string): boolean {
  // 只允许字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
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
    // 验证键名安全性
    if (!validateFilterKey(key)) {
      throw new Error(`Invalid filter key: ${key}`);
    }

    const snakeKey = toSnakeCase(key);

    if (value === null) {
      expressions.push(`${snakeKey}.is.null`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // 处理运算符对象
      Object.entries(value).forEach(([operator, operatorValue]) => {
        const escapedValue = escapeFilterValue(operatorValue);

        if (operator === "equals") {
          expressions.push(`${snakeKey}.eq.${escapedValue}`);
        } else if (operator === "not") {
          expressions.push(`${snakeKey}.neq.${escapedValue}`);
        } else if (operator === "in") {
          const values = Array.isArray(operatorValue)
            ? operatorValue.map((v) => escapeFilterValue(v)).join(",")
            : escapedValue;
          expressions.push(`${snakeKey}.in.(${values})`);
        } else if (operator === "lt") {
          expressions.push(`${snakeKey}.lt.${escapedValue}`);
        } else if (operator === "lte") {
          expressions.push(`${snakeKey}.lte.${escapedValue}`);
        } else if (operator === "gt") {
          expressions.push(`${snakeKey}.gt.${escapedValue}`);
        } else if (operator === "gte") {
          expressions.push(`${snakeKey}.gte.${escapedValue}`);
        } else if (operator === "contains") {
          // 对于 LIKE 操作，需要额外转义 % 字符
          const likeValue = String(operatorValue).replace(/%/g, "\\%");
          expressions.push(`${snakeKey}.ilike.%${likeValue}%`);
        } else if (operator === "startsWith") {
          const likeValue = String(operatorValue).replace(/%/g, "\\%");
          expressions.push(`${snakeKey}.ilike.${likeValue}%`);
        } else if (operator === "endsWith") {
          const likeValue = String(operatorValue).replace(/%/g, "\\%");
          expressions.push(`${snakeKey}.ilike.%${likeValue}`);
        }
      });
    } else {
      // 简单相等
      expressions.push(`${snakeKey}.eq.${escapeFilterValue(value)}`);
    }
  });

  return expressions;
}

// 通用模型适配器类
class ModelAdapter<T = any> {
  constructor(
    private tableName: string,
    private supabase: SupabaseClient<Database>,
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
      if (error.code === "PGRST116") return null; // Not found
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

      orderings.filter(Boolean).forEach((clause) => {
        const entries = Object.entries(clause);
        if (!entries.length) return;

        // 每个 clause 只取第一个字段（Prisma 每个对象一个字段）
        const [field, direction] = entries[0] as [string, string];
        query = query.order(toSnakeCase(field), {
          ascending: String(direction).toLowerCase() !== "desc",
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

  async create(args: { data: any; include?: any; select?: any }): Promise<T> {
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
        `Supabase upsert requires at least one unique field in where clause for table ${this.tableName}`,
      );
    }

    // 提取 where 中的标量字段作为 onConflict 目标
    // 过滤掉运算符对象和关系字段
    const scalarWhereFields: Record<string, any> = {};
    Object.entries(args.where).forEach(([key, value]) => {
      // 只保留简单标量值（用于唯一键匹配）
      if (typeof value !== "object" || value === null) {
        scalarWhereFields[key] = value;
      } else if (typeof value === "object" && "equals" in value) {
        // 处理 { field: { equals: value } } 形式
        scalarWhereFields[key] = value.equals;
      }
      // 忽略其他复杂条件（如 gt, lt, contains 等）
    });

    if (Object.keys(scalarWhereFields).length === 0) {
      throw new Error(
        `Supabase upsert requires at least one scalar field in where clause for table ${this.tableName}. ` +
          `Got: ${JSON.stringify(args.where)}`,
      );
    }

    // 转换为 snake_case
    const snakeCreate = keysToSnakeCase(args.create);
    const snakeUpdate = keysToSnakeCase(args.update);
    const snakeWhereFields = keysToSnakeCase(scalarWhereFields);

    // 构建 onConflict 列
    const conflictColumns = Object.keys(snakeWhereFields).join(",");

    // 合并数据：create 作为基础，where 字段确保存在，update 最后覆盖
    // 这样可以保证：
    // - INSERT 时：使用 create 的完整数据 + where 的唯一键值
    // - UPDATE 时：应用 update 的变更
    // - onConflict 字段总是存在且值正确
    const payload = {
      ...snakeCreate,
      ...snakeWhereFields, // 确保唯一键字段存在且值正确
      ...snakeUpdate, // update 字段可能覆盖某些 create 字段
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
          `Where fields: ${JSON.stringify(args.where)}`,
      );
    }

    return keysToCamelCase(data) as T;
  }

  async updateMany(args: {
    where: any;
    data: any;
  }): Promise<{ count: number }> {
    const snakeData = keysToSnakeCase(args.data);

    let query = this.supabase.from(this.tableName).update(snakeData);

    query = applyWhereClause(query, args.where, this.tableName);

    const { error, count } = await query;

    if (error) {
      throw new Error(`Supabase updateMany error: ${error.message}`);
    }

    return { count: count || 0 };
  }

  async delete(args: { where: any }): Promise<T> {
    let query = this.supabase.from(this.tableName).delete().select();

    query = applyWhereClause(query, args.where, this.tableName);

    const { data, error } = await query.single();

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    return keysToCamelCase(data) as T;
  }

  async deleteMany(args?: { where?: any }): Promise<{ count: number }> {
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

  async count(args?: { where?: any }): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select("*", { count: "exact", head: true });

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
    throw new Error(
      "Aggregate functions need to be implemented using Supabase RPC",
    );
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
  userConsent: ModelAdapter;

  constructor() {
    this.supabase = SupabaseClientManager.getInstance();

    // 初始化所有模型适配器
    this.user = new ModelAdapter("users", this.supabase);
    this.family = new ModelAdapter("families", this.supabase);
    this.familyMember = new ModelAdapter("family_members", this.supabase);
    this.healthGoal = new ModelAdapter("health_goals", this.supabase);
    this.allergy = new ModelAdapter("allergies", this.supabase);
    this.dietaryPreference = new ModelAdapter(
      "dietary_preferences",
      this.supabase,
    );
    this.healthData = new ModelAdapter("health_data", this.supabase);
    this.healthReminder = new ModelAdapter("health_reminders", this.supabase);
    this.mealPlan = new ModelAdapter("meal_plans", this.supabase);
    this.medicalReport = new ModelAdapter("medical_reports", this.supabase);
    this.mealLog = new ModelAdapter("meal_logs", this.supabase);
    this.trackingStreak = new ModelAdapter("tracking_streaks", this.supabase);
    this.quickTemplate = new ModelAdapter("quick_templates", this.supabase);
    this.dailyNutritionTarget = new ModelAdapter(
      "daily_nutrition_targets",
      this.supabase,
    );
    this.auxiliaryTracking = new ModelAdapter(
      "auxiliary_trackings",
      this.supabase,
    );
    this.healthReport = new ModelAdapter("health_reports", this.supabase);
    this.healthScore = new ModelAdapter("health_scores", this.supabase);
    this.trendData = new ModelAdapter("trend_data", this.supabase);
    this.healthAnomaly = new ModelAdapter("health_anomalies", this.supabase);
    this.aiAdvice = new ModelAdapter("ai_advices", this.supabase);
    this.aiConversation = new ModelAdapter("ai_conversations", this.supabase);
    this.budget = new ModelAdapter("budgets", this.supabase);
    this.savingsRecommendation = new ModelAdapter(
      "savings_recommendations",
      this.supabase,
    );
    this.userPreference = new ModelAdapter("user_preferences", this.supabase);
    this.recipe = new ModelAdapter("recipes", this.supabase);
    this.recipeRating = new ModelAdapter("recipe_ratings", this.supabase);
    this.recipeFavorite = new ModelAdapter("recipe_favorites", this.supabase);
    this.recipeView = new ModelAdapter("recipe_views", this.supabase);
    this.ingredientSubstitution = new ModelAdapter(
      "ingredient_substitutions",
      this.supabase,
    );
    this.task = new ModelAdapter("tasks", this.supabase);
    this.activity = new ModelAdapter("activities", this.supabase);
    this.comment = new ModelAdapter("comments", this.supabase);
    this.familyGoal = new ModelAdapter("family_goals", this.supabase);
    this.shoppingItem = new ModelAdapter("shopping_items", this.supabase);
    this.sharedContent = new ModelAdapter("shared_contents", this.supabase);
    this.achievement = new ModelAdapter("achievements", this.supabase);
    this.leaderboardEntry = new ModelAdapter(
      "leaderboard_entries",
      this.supabase,
    );
    this.communityPost = new ModelAdapter("community_posts", this.supabase);
    this.communityComment = new ModelAdapter(
      "community_comments",
      this.supabase,
    );
    this.notification = new ModelAdapter("notifications", this.supabase);
    this.notificationPreference = new ModelAdapter(
      "notification_preferences",
      this.supabase,
    );
    this.inventoryItem = new ModelAdapter("inventory_items", this.supabase);
    this.inventoryUsage = new ModelAdapter("inventory_usages", this.supabase);
    this.wasteLog = new ModelAdapter("waste_logs", this.supabase);
    this.deviceConnection = new ModelAdapter(
      "device_connections",
      this.supabase,
    );
    this.userConsent = new ModelAdapter("user_consents", this.supabase);
  }

  // 原生 SQL 查询支持
  async $queryRaw(query: TemplateStringsArray, ...values: any[]): Promise<any> {
    throw new Error("Raw queries should use Supabase RPC functions");
  }

  async $executeRaw(
    query: TemplateStringsArray,
    ...values: any[]
  ): Promise<number> {
    throw new Error("Raw queries should use Supabase RPC functions");
  }

  // 事务支持 (Supabase 暂不直接支持，需要使用数据库函数)
  async $transaction(queries: any[]): Promise<any[]> {
    throw new Error("Transactions should use Supabase database functions");
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

// 兼容层：导出 prisma 别名供旧代码使用
// TODO: 迁移所有使用方到 Supabase adapter 后移除此导出
export const prisma = supabaseAdapter;

// 导出数据库健康检查
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const supabase = SupabaseClientManager.getInstance();
    const { error } = await supabase.from("users").select("id").limit(1);
    return !error;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
}

// 导出确保数据库连接的函数
export async function ensureDatabaseConnection(): Promise<void> {
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    throw new Error("Supabase connection failed");
  }
}
