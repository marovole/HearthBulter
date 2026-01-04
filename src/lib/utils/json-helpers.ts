/**
 * JSON 安全解析辅助函数
 *
 * 这些函数提供了安全的 JSON 解析能力，避免因恶意数据导致的运行时错误。
 * 主要用于 Supabase 数据解析，支持向后兼容（字符串存储的 JSON）。
 */

/**
 * 安全解析数组
 *
 * @param value - 待解析的值（可能是数组、JSON字符串、null或其他类型）
 * @param fallback - 解析失败时的默认值，默认为空数组
 * @returns 解析后的数组或默认值
 *
 * @example
 * safeParseArray([1, 2, 3]) // => [1, 2, 3]
 * safeParseArray('[1, 2, 3]') // => [1, 2, 3]
 * safeParseArray(null) // => []
 * safeParseArray('invalid json') // => []
 */
export function safeParseArray(value: any, fallback: any[] = []): any[] {
  // 如果已经是数组，直接返回
  if (Array.isArray(value)) {
    return value;
  }

  // null 或 undefined 返回默认值
  if (value == null) {
    return fallback;
  }

  // 尝试解析 JSON 字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  // 其他类型返回默认值
  return fallback;
}

/**
 * 安全解析对象
 *
 * @param value - 待解析的值（可能是对象、JSON字符串、null或其他类型）
 * @param fallback - 解析失败时的默认值，默认为空对象
 * @returns 解析后的对象或默认值
 *
 * @example
 * safeParseObject({ a: 1 }) // => { a: 1 }
 * safeParseObject('{"a": 1}') // => { a: 1 }
 * safeParseObject(null) // => {}
 * safeParseObject('invalid json') // => {}
 * safeParseObject([1, 2, 3]) // => {} (数组不是对象)
 */
export function safeParseObject(
  value: any,
  fallback: Record<string, unknown> = {},
): Record<string, unknown> {
  // 如果已经是对象（且不是数组），直接返回
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  // null 或 undefined 返回默认值
  if (value == null) {
    return fallback;
  }

  // 尝试解析 JSON 字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return fallback;
    }
  }

  // 其他类型返回默认值
  return fallback;
}
