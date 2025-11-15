/**
 * Supabase RPC 函数调用辅助工具
 *
 * 提供统一的 RPC 调用封装，包含：
 * - 结构化错误处理
 * - 统一日志格式
 * - 返回明确的成功/失败状态
 *
 * 这些 wrapper 确保 RPC 失败时能够被正确记录和监控，
 * 避免静默失败导致数据不一致。
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * RPC 调用结果类型
 */
export type RpcResult<T = void> = {
  success: boolean;
  data?: T;
  error?: unknown;
};

/**
 * 记录 RPC 错误的统一日志格式
 *
 * @param fnName - RPC 函数名称
 * @param context - 上下文信息（如 recipeId, memberId 等）
 * @param error - 错误对象
 */
function logRpcError(fnName: string, context: string | Record<string, any>, error: unknown): void {
  const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
  console.error(`[RPC:${fnName}] ${contextStr} error:`, error);
}

/**
 * 更新食谱收藏计数
 *
 * 调用 Supabase RPC 函数 `update_recipe_favorite_count`，
 * 重新计算指定食谱的收藏数量并更新 `recipes` 表。
 *
 * @param recipeId - 食谱 ID
 * @returns 包含成功状态和可能的错误信息的结果对象
 *
 * @example
 * const result = await updateRecipeFavoriteCount('recipe-123');
 * if (!result.success) {
 *   console.error('Failed to update favorite count:', result.error);
 * }
 */
export async function updateRecipeFavoriteCount(
  recipeId: string
): Promise<RpcResult> {
  const supabase = SupabaseClientManager.getInstance();

  const { error } = await supabase.rpc('update_recipe_favorite_count', {
    p_recipe_id: recipeId,
  });

  if (error) {
    logRpcError('update_recipe_favorite_count', recipeId, error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * 更新食谱平均评分和评分数量
 *
 * 调用 Supabase RPC 函数 `update_recipe_average_rating`，
 * 重新计算指定食谱的平均评分和评分总数，并更新 `recipes` 表。
 *
 * @param recipeId - 食谱 ID
 * @returns 包含成功状态和可能的错误信息的结果对象
 *
 * @example
 * const result = await updateRecipeAverageRating('recipe-123');
 * if (!result.success) {
 *   console.error('Failed to update average rating:', result.error);
 * }
 */
export async function updateRecipeAverageRating(
  recipeId: string
): Promise<RpcResult> {
  const supabase = SupabaseClientManager.getInstance();

  const { error } = await supabase.rpc('update_recipe_average_rating', {
    p_recipe_id: recipeId,
  });

  if (error) {
    logRpcError('update_recipe_average_rating', recipeId, error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * AI 建议历史 RPC 返回类型
 */
export type AdviceHistoryRpcResult = {
  advice: Array<{
    id: string;
    type: string;
    title: string | null;
    content: any;
    category: string | null;
    generatedAt: string;
    feedbackRating: number | null;
    isFavorited: boolean;
    tokens: number | null;
    messages: any[];
    conversation: {
      id: string;
      title: string;
      createdAt: string;
    } | null;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
};

/**
 * 获取 AI 建议历史（优化版）
 *
 * 调用 Supabase RPC 函数 `fetch_advice_history`，
 * 单次往返获取建议历史，包含：
 * - 分页的建议记录
 * - 压缩的 messages 字段（最多 5 条）
 * - 关联的对话信息
 * - 分页元数据
 *
 * @param memberId - 成员 ID
 * @param options - 查询选项
 * @param options.limit - 每页数量（默认 20，最大 100）
 * @param options.offset - 偏移量（默认 0）
 * @returns 包含建议历史数据和分页信息的结果对象
 *
 * @example
 * const result = await fetchAdviceHistory('member-123', { limit: 10, offset: 0 });
 * if (result.success && result.data) {
 *   console.log('Total advice:', result.data.pagination.total);
 *   console.log('Advice items:', result.data.advice);
 * }
 */
export async function fetchAdviceHistory(
  memberId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<RpcResult<AdviceHistoryRpcResult>> {
  const supabase = SupabaseClientManager.getInstance();

  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase.rpc('fetch_advice_history', {
    p_member_id: memberId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    logRpcError('fetch_advice_history', { memberId, limit, offset }, error);
    return { success: false, error };
  }

  // 检查 RPC 是否返回错误格式（内部错误）
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    logRpcError('fetch_advice_history', { memberId, limit, offset }, data);
    return { success: false, error: data };
  }

  return { success: true, data: data as AdviceHistoryRpcResult };
}

/**
 * 社交统计 RPC 返回类型
 */
export type SocialStatsRpcResult = {
  period: string;
  platform: string | null;
  totals: {
    shares: number;
    views: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    clickThroughRate: number;
  };
  platformBreakdown: Record<string, {
    shares: number;
    views: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  daily: Array<{
    date: string;
    shares: number;
    views: number;
    clicks: number;
    conversions: number;
  }>;
  generatedAt: string;
};

/**
 * 计算社交分享统计（优化版）
 *
 * 调用 Supabase RPC 函数 `calculate_social_stats`，
 * 单次往返获取社交统计数据，包含：
 * - 总计指标（shares, views, clicks, conversions, rates）
 * - 平台分布统计
 * - 每日趋势数据
 *
 * @param memberId - 成员 ID
 * @param options - 查询选项
 * @param options.period - 统计周期（7d, 30d, 90d, 1y），默认 30d
 * @param options.platform - 平台过滤（可选）
 * @returns 包含统计数据的结果对象
 *
 * @example
 * const result = await calculateSocialStats('member-123', { period: '30d' });
 * if (result.success && result.data) {
 *   console.log('Total shares:', result.data.totals.shares);
 *   console.log('Platform breakdown:', result.data.platformBreakdown);
 * }
 */
export async function calculateSocialStats(
  memberId: string,
  options: { period?: string; platform?: string } = {}
): Promise<RpcResult<SocialStatsRpcResult>> {
  const supabase = SupabaseClientManager.getInstance();

  const { period = '30d', platform = null } = options;

  const { data, error } = await supabase.rpc('calculate_social_stats', {
    p_member_id: memberId,
    p_period: period,
    p_platform: platform,
  });

  if (error) {
    logRpcError('calculate_social_stats', { memberId, period, platform }, error);
    return { success: false, error };
  }

  // 检查 RPC 是否返回错误格式（内部错误）
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    logRpcError('calculate_social_stats', { memberId, period, platform }, data);
    return { success: false, error: data };
  }

  return { success: true, data: data as SocialStatsRpcResult };
}

/**
 * 设备同步 RPC 返回类型
 */
export type DeviceSyncRpcResult = {
  devices: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    memberId: string;
    memberName: string;
    memberUserId: string;
    memberFamilyId: string;
    syncStatus: string;
    lastSyncAt: string | null;
    updatedAt: string;
  }>;
  summary: {
    total: number;
    platformBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
  };
  pagination: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
  };
  generatedAt: string;
};

/**
 * 获取待同步设备列表（优化版）
 *
 * 调用 Supabase RPC 函数 `fetch_devices_for_sync`，
 * 单次往返获取设备列表，包含：
 * - 过滤后的设备列表（分页）
 * - 汇总统计（总数、平台分布、状态分布）
 * - 成员信息（已 JOIN）
 *
 * @param options - 查询选项
 * @param options.memberId - 成员 ID（可选）
 * @param options.platforms - 平台过滤数组（可选）
 * @param options.limit - 每页数量（默认 50，最大 200）
 * @param options.offset - 偏移量（默认 0）
 * @returns 包含设备列表和统计数据的结果对象
 *
 * @example
 * const result = await fetchDevicesForSync({ memberId: 'member-123', limit: 50 });
 * if (result.success && result.data) {
 *   console.log('Total devices:', result.data.summary.total);
 *   console.log('Devices:', result.data.devices);
 * }
 */
export async function fetchDevicesForSync(
  options: {
    memberId?: string;
    platforms?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<RpcResult<DeviceSyncRpcResult>> {
  const supabase = SupabaseClientManager.getInstance();

  const { memberId = null, platforms = null, limit = 50, offset = 0 } = options;

  const { data, error } = await supabase.rpc('fetch_devices_for_sync', {
    p_member_id: memberId,
    p_platforms: platforms,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    logRpcError('fetch_devices_for_sync', { memberId, platforms, limit, offset }, error);
    return { success: false, error };
  }

  // 检查 RPC 是否返回错误格式（内部错误）
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    logRpcError('fetch_devices_for_sync', { memberId, platforms, limit, offset }, data);
    return { success: false, error: data };
  }

  return { success: true, data: data as DeviceSyncRpcResult };
}
