/**
 * AI敏感信息过滤中间件
 *
 * 为所有AI相关的API请求提供统一的敏感信息过滤功能
 */

import { sensitiveFilter, FilterResult } from "@/lib/services/sensitive-filter";

export interface AISensitiveFilterOptions {
  maskMode?: "full" | "partial" | "redact";
  excludeTypes?: string[];
  includeTypes?: string[];
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
  options: AISensitiveFilterOptions = {},
): FilteredContent {
  const filterResult = sensitiveFilter.filter(content, {
    maskMode: options.maskMode || "partial",
    excludeTypes: (options.excludeTypes as any) || ["age"], // 年龄通常需要保留
    includeTypes: options.includeTypes as any,
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
  options: AISensitiveFilterOptions = {},
): FilteredContent {
  const filterResult = sensitiveFilter.filter(content, {
    maskMode: options.maskMode || "partial",
    excludeTypes: (options.excludeTypes as any) || [],
    includeTypes: options.includeTypes as any,
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
export function filterStructuredData<T extends Record<string, any>>(
  data: T,
  options: AISensitiveFilterOptions = {},
): T {
  const filteredData = { ...data };

  const filterValue = (value: any): any => {
    if (typeof value === "string") {
      const result = filterUserInput(value, options);
      return result.filtered;
    } else if (Array.isArray(value)) {
      return value.map((item) => filterValue(item));
    } else if (typeof value === "object" && value !== null) {
      const filteredObj: Record<string, any> = {};
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
export function createSensitiveFilterMiddleware(
  options: AISensitiveFilterOptions = {},
) {
  return {
    filterUserInput: (content: string) => filterUserInput(content, options),
    filterAIOutput: (content: string) => filterAIOutput(content, options),
    filterStructuredData: <T>(data: T) => filterStructuredData(data, options),
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
  maskMode: "structured", // 保持结构化格式
  excludeTypes: ["age"],
  enableLogging: true,
});
