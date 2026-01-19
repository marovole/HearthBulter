/**
 * 通用 Repository 类型定义
 *
 * 本模块提供所有 Repository 共用的基础类型，包括：
 * - 分页相关类型
 * - 过滤器类型
 * - 排序类型
 *
 * @module common
 */

import { z } from "zod";

/**
 * 分页输入参数 Schema
 * 支持基于 offset 或 cursor 的分页
 */
export const paginationInputSchema = z.object({
  /** 每页数量限制 (1-100) */
  limit: z.number().int().min(1).max(100).optional(),
  /** 偏移量（用于 offset 分页） */
  offset: z.number().int().min(0).optional(),
  /** 游标（用于 cursor 分页） */
  cursor: z.string().min(1).optional(),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

/**
 * 分页结果包装类型
 *
 * @template TItem - 分页项的类型
 */
export interface PaginatedResult<TItem> {
  /** 当前页的数据项 */
  items: TItem[];
  /** 总数（可选，某些场景可能不需要） */
  total?: number;
  /** 是否还有更多数据 */
  hasMore?: boolean;
  /** 下一页游标（用于 cursor 分页） */
  nextCursor?: string | null;
}

/**
 * 日期范围过滤器 Schema
 */
export const dateRangeFilterSchema = z.object({
  /** 起始日期（包含） */
  start: z.coerce.date().optional(),
  /** 结束日期（包含） */
  end: z.coerce.date().optional(),
});

export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;

/**
 * 字符串过滤器 Schema
 * 支持多种过滤条件
 */
export const stringFilterSchema = z.object({
  /** 精确匹配 */
  equals: z.string().optional(),
  /** 包含于集合 */
  in: z.array(z.string()).optional(),
  /** 包含子串 */
  contains: z.string().optional(),
  /** 以...开始 */
  startsWith: z.string().optional(),
  /** 以...结束 */
  endsWith: z.string().optional(),
});

export type StringFilter = z.infer<typeof stringFilterSchema>;

/**
 * 排序方向
 */
export type SortDirection = "asc" | "desc";

/**
 * 排序输入参数
 *
 * @template TField - 可排序字段的类型
 */
export interface SortInput<TField extends string = string> {
  /** 排序字段 */
  field: TField;
  /** 排序方向 */
  direction: SortDirection;
}
