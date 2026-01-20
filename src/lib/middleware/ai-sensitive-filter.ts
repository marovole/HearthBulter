/**
 * AI敏感信息过滤中间件
 *
 * 为所有AI相关的API请求提供统一的敏感信息过滤功能
 */

import type { SensitiveInfoPattern } from "@/lib/services/sensitive-filter";
import { sensitiveFilter, FilterResult } from "@/lib/services/sensitive-filter";

export interface AISensitiveFilterOptions {
  maskMode?: "full" | "partial" | "redact";
  preserveStructure?: boolean;
  excludeTypes?: SensitiveInfoPattern["type"][];
  includeTypes?: SensitiveInfoPattern["type"][];
  enableLogging?: boolean;
}

export interface FilteredContent {
  original: string;
  filtered: string;
  hasSensitiveInfo: boolean;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  detectedTypes: string[];
}

/**
 * 过滤用户输入内容
 */
export function filterUserInput(
  content: string,
  options: AISensitiveFilterOptions = {}
): FilteredContent {
  const filterResult = sensitiveFilter.filter(content, {
    maskMode: options.maskMode || "partial",
    preserveStructure: options.preserveStructure,
    excludeTypes: options.excludeTypes ?? ["age"],
    includeTypes: options.includeTypes,
  });

  if (options.enableLogging && filterResult.hasSensitiveInfo) {
    console.warn("[AI敏感信息过滤] 用户输入检测到敏感信息", {
      riskLevel: filterResult.riskLevel,
      detectedTypes: filterResult.detectedItems.map((item) => item.type),
      contentLength: content.length,
    });
  }

  return {
    original: content,
    filtered: filterResult.filteredText,
    hasSensitiveInfo: filterResult.hasSensitiveInfo,
    riskLevel: filterResult.riskLevel,
    detectedTypes: filterResult.detectedItems.map((item) => item.type),
  };
}

/**
 * 过滤AI输出内容（防御性过滤）
 */
export function filterAIOutput(
  content: string,
  options: AISensitiveFilterOptions = {}
): FilteredContent {
  const filterResult = sensitiveFilter.filter(content, {
    maskMode: options.maskMode || "partial",
    preserveStructure: options.preserveStructure,
    excludeTypes: options.excludeTypes ?? [],
    includeTypes: options.includeTypes,
  });

  if (options.enableLogging && filterResult.hasSensitiveInfo) {
    console.warn("[AI敏感信息过滤] AI输出检测到敏感信息（异常情况）", {
      riskLevel: filterResult.riskLevel,
      detectedTypes: filterResult.detectedItems.map((item) => item.type),
      contentLength: content.length,
    });
  }

  return {
    original: content,
    filtered: filterResult.filteredText,
    hasSensitiveInfo: filterResult.hasSensitiveInfo,
    riskLevel: filterResult.riskLevel,
    detectedTypes: filterResult.detectedItems.map((item) => item.type),
  };
}

/**
 * 过滤结构化数据中的字符串字段
 */
export function filterStructuredData<T extends Record<string, unknown>>(
  data: T,
  options: AISensitiveFilterOptions = {}
): T {
  const filteredData = { ...data };

  const filterValue = (value: unknown): unknown => {
    if (typeof value === "string") {
      const result = filterUserInput(value, options);
      return result.filtered;
    }
    if (Array.isArray(value)) {
      return value.map((item) => filterValue(item));
    }
    if (typeof value === "object" && value !== null) {
      const filteredObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        filteredObj[key] = filterValue(val);
      }
      return filteredObj;
    }
    return value;
  };

  return filterValue(filteredData) as T;
}

/**
 * 创建敏感信息过滤中间件函数
 */
export function createSensitiveFilterMiddleware(options: AISensitiveFilterOptions = {}) {
  return {
    filterUserInput: (content: string) => filterUserInput(content, options),
    filterAIOutput: (content: string) => filterAIOutput(content, options),
    filterStructuredData: <T extends Record<string, unknown>>(data: T) =>
      filterStructuredData(data, options),
  };
}

/**
 * 默认配置的敏感信息过滤中间件
 */
export const defaultSensitiveFilter = createSensitiveFilterMiddleware({
  maskMode: "partial",
  excludeTypes: ["age"],
  enableLogging: true,
});

/**
 * 严格模式的敏感信息过滤中间件
 */
export const strictSensitiveFilter = createSensitiveFilterMiddleware({
  maskMode: "redact",
  enableLogging: true,
});

/**
 * 医疗报告专用过滤中间件
 */
export const medicalReportFilter = createSensitiveFilterMiddleware({
  maskMode: "partial",
  preserveStructure: true,
  excludeTypes: ["age"],
  enableLogging: true,
});
