// @ts-nocheck - Legacy migration: pending full type safety review
import { NeonClientManager } from "@/lib/db/neon-client";

export type RpcResult<T = void> = {
  success: boolean;
  data?: T;
  error?: unknown;
};

function logRpcError(fnName: string, context: string | Record<string, any>, error: unknown): void {
  const contextStr = typeof context === "string" ? context : JSON.stringify(context);
  console.error(`[RPC:${fnName}] ${contextStr} error:`, error);
}

export async function updateRecipeFavoriteCount(recipeId: string): Promise<RpcResult> {
  try {
    await NeonClientManager.query("SELECT update_recipe_favorite_count($1)", [recipeId]);
    return { success: true };
  } catch (error) {
    logRpcError("update_recipe_favorite_count", recipeId, error);
    return { success: false, error };
  }
}

export async function updateRecipeAverageRating(recipeId: string): Promise<RpcResult> {
  try {
    await NeonClientManager.query("SELECT update_recipe_average_rating($1)", [recipeId]);
    return { success: true };
  } catch (error) {
    logRpcError("update_recipe_average_rating", recipeId, error);
    return { success: false, error };
  }
}

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

export async function fetchAdviceHistory(
  memberId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<RpcResult<AdviceHistoryRpcResult>> {
  try {
    const { limit = 20, offset = 0 } = options;

    const result = await NeonClientManager.query<any>(
      "SELECT * FROM fetch_advice_history($1, $2, $3)",
      [memberId, limit, offset]
    );

    const data = result[0];

    if (data && typeof data === "object" && "success" in data && data.success === false) {
      logRpcError("fetch_advice_history", { memberId, limit, offset }, data);
      return { success: false, error: data };
    }

    return { success: true, data: data as AdviceHistoryRpcResult };
  } catch (error) {
    logRpcError(
      "fetch_advice_history",
      { memberId, limit: options.limit, offset: options.offset },
      error
    );
    return { success: false, error };
  }
}

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
  platformBreakdown: Record<
    string,
    {
      shares: number;
      views: number;
      clicks: number;
      conversions: number;
      conversionRate: number;
    }
  >;
  daily: Array<{
    date: string;
    shares: number;
    views: number;
    clicks: number;
    conversions: number;
  }>;
  generatedAt: string;
};

export async function calculateSocialStats(
  memberId: string,
  options: { period?: string; platform?: string } = {}
): Promise<RpcResult<SocialStatsRpcResult>> {
  try {
    const { period = "30d", platform = null } = options;

    const result = await NeonClientManager.query<any>(
      "SELECT * FROM calculate_social_stats($1, $2, $3)",
      [memberId, period, platform]
    );

    const data = result[0];

    if (data && typeof data === "object" && "success" in data && data.success === false) {
      logRpcError("calculate_social_stats", { memberId, period, platform }, data);
      return { success: false, error: data };
    }

    return { success: true, data: data as SocialStatsRpcResult };
  } catch (error) {
    logRpcError(
      "calculate_social_stats",
      { memberId, period: options.period, platform: options.platform },
      error
    );
    return { success: false, error };
  }
}

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

export async function fetchDevicesForSync(
  options: {
    memberId?: string;
    platforms?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<RpcResult<DeviceSyncRpcResult>> {
  try {
    const { memberId = null, platforms = null, limit = 50, offset = 0 } = options;

    const result = await NeonClientManager.query<any>(
      "SELECT * FROM fetch_devices_for_sync($1, $2, $3, $4)",
      [memberId, platforms, limit, offset]
    );

    const data = result[0];

    if (data && typeof data === "object" && "success" in data && data.success === false) {
      logRpcError("fetch_devices_for_sync", { memberId, platforms, limit, offset }, data);
      return { success: false, error: data };
    }

    return { success: true, data: data as DeviceSyncRpcResult };
  } catch (error) {
    logRpcError("fetch_devices_for_sync", options, error);
    return { success: false, error };
  }
}
