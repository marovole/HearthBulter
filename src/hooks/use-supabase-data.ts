import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, type User } from '@/lib/supabase-client';
import { DataFetcher } from '@/lib/data-fetching';
import { logger } from '@/lib/logger';

const dependencySignature = (dependencies: readonly unknown[]): string => {
  return dependencies
    .map((dependency) => {
      if (dependency === null || dependency === undefined) {
        return String(dependency);
      }
      if (
        typeof dependency === 'string' ||
        typeof dependency === 'number' ||
        typeof dependency === 'boolean'
      ) {
        return String(dependency);
      }
      try {
        return JSON.stringify(dependency);
      } catch {
        return Object.prototype.toString.call(dependency);
      }
    })
    .join('|');
};

// 通用数据获取 Hook
export function useSupabaseData<T>(
  query: string,
  dependencies: readonly unknown[] = [],
  options: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    cacheTime?: number;
  } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const cacheRef = useRef<{ data: T | null; timestamp: number }>({
    data: null,
    timestamp: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    enabled = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000,
  } = options;

  const dependenciesKey = dependencySignature(dependencies);

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return;

      // 检查缓存是否仍然有效
      const now = Date.now();
      if (
        !force &&
        cacheRef.current.data &&
        now - cacheRef.current.timestamp < staleTime
      ) {
        setData(cacheRef.current.data);
        setLoading(false);
        return;
      }

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const result = await DataFetcher.getDynamicData(query, {
          signal: abortControllerRef.current.signal,
        });

        setData(result.data);
        setError(null);

        // 更新缓存
        cacheRef.current = { data: result.data, timestamp: now };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // 请求被取消，不处理错误
        }

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        logger.error('Data fetch error', {
          query,
          error: error.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [query, enabled, staleTime],
  );

  const refetch = useCallback(() => {
    setRefetchCount((prev) => prev + 1);
    fetchData(true);
  }, [fetchData]);

  // 自动重新获取
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refetchInterval, enabled]);

  // 初始获取和依赖变化时重新获取
  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, dependenciesKey]);

  return {
    data,
    loading,
    error,
    refetch,
    refetchCount,
  };
}

// 健康数据 Hook
export function useHealthData(
  memberId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: string;
    enabled?: boolean;
  } = {},
) {
  const { limit = 20, offset = 0, type, enabled = true } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    ...(type && { type }),
  });

  return useSupabaseData(
    `/v1/health?${queryParams.toString()}`,
    [memberId, limit, offset, type],
    { enabled },
  );
}

// 饮食记录 Hook
export function useMealRecords(
  memberId: string,
  options: {
    startDate?: string;
    endDate?: string;
    mealType?: string;
    enabled?: boolean;
  } = {},
) {
  const { startDate, endDate, mealType, enabled = true } = options;

  const queryParams = new URLSearchParams({
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(mealType && { mealType }),
  });

  return useSupabaseData(
    `/v1/meal-records?${queryParams.toString()}`,
    [memberId, startDate, endDate, mealType],
    { enabled },
  );
}

// 食物搜索 Hook
export function useFoodSearch(
  query: string,
  options: {
    category?: string;
    limit?: number;
    page?: number;
    enabled?: boolean;
    debounceMs?: number;
  } = {},
) {
  const {
    category,
    limit = 20,
    page = 1,
    enabled = true,
    debounceMs = 300,
  } = options;
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const queryParams = new URLSearchParams({
    q: debouncedQuery,
    limit: limit.toString(),
    page: page.toString(),
    ...(category && { category }),
  });

  return useSupabaseData(
    `/v1/foods/search?${queryParams.toString()}`,
    [debouncedQuery, category, limit, page],
    {
      enabled: enabled && debouncedQuery.trim().length > 0,
      staleTime: 60 * 1000, // 1分钟缓存
    },
  );
}

// 用户偏好 Hook
export function useUserPreferences(memberId: string, enabled = true) {
  return useSupabaseData(
    `/v1/users/preferences?memberId=${memberId}`,
    [memberId],
    { enabled },
  );
}

// 仪表盘数据 Hook
export function useDashboardData(memberId: string, enabled = true) {
  return useSupabaseData(
    `/v1/dashboard/overview?memberId=${memberId}`,
    [memberId],
    { enabled },
  );
}

// 食谱 Hook
export function useRecipes(
  options: {
    category?: string;
    cuisine?: string;
    difficulty?: string;
    isPublic?: boolean;
    limit?: number;
    page?: number;
    enabled?: boolean;
  } = {},
) {
  const {
    category,
    cuisine,
    difficulty,
    isPublic,
    limit = 20,
    page = 1,
    enabled = true,
  } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    ...(category && { category }),
    ...(cuisine && { cuisine }),
    ...(difficulty && { difficulty }),
    ...(isPublic !== undefined && { isPublic: isPublic.toString() }),
  });

  return useSupabaseData(
    `/v1/recipes?${queryParams.toString()}`,
    [category, cuisine, difficulty, isPublic, limit, page],
    { enabled },
  );
}

// 库存 Hook
export function useInventory(
  familyId: string,
  options: {
    status?: string;
    category?: string;
    isLowStock?: boolean;
    limit?: number;
    page?: number;
    enabled?: boolean;
  } = {},
) {
  const {
    status,
    category,
    isLowStock,
    limit = 50,
    page = 1,
    enabled = true,
  } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    ...(status && { status }),
    ...(category && { category }),
    ...(isLowStock !== undefined && { isLowStock: isLowStock.toString() }),
  });

  return useSupabaseData(
    `/v1/inventory?${queryParams.toString()}`,
    [familyId, status, category, isLowStock, limit, page],
    { enabled },
  );
}

// 购物清单 Hook
export function useShoppingLists(
  familyId: string,
  options: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
    page?: number;
    enabled?: boolean;
  } = {},
) {
  const {
    status,
    priority,
    assignedTo,
    limit = 20,
    page = 1,
    enabled = true,
  } = options;

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assignedTo && { assignedTo }),
  });

  return useSupabaseData(
    `/v1/shopping-lists?${queryParams.toString()}`,
    [familyId, status, priority, assignedTo, limit, page],
    { enabled },
  );
}

// 实时数据 Hook
export function useRealtimeData<T>(
  channel: string,
  table: string,
  filter: Record<string, unknown> = {},
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);
  const stableFilter = useMemo<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(filterKey) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }, [filterKey]);

  useEffect(() => {
    if (!enabled) return;

    type RealtimePayload<TPayload> = {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: TPayload;
      old: Partial<TPayload>;
    };

    const resolveItemId = (item: T | Partial<T>): string | number | null => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const candidate = (item as { id?: unknown }).id;
      if (typeof candidate === 'string' || typeof candidate === 'number') {
        return candidate;
      }
      return null;
    };

    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        // 首先获取初始数据
        const initialData = await DataFetcher.getHealthData(
          (stableFilter.memberId as string) || '',
          stableFilter,
        );
        setData(initialData.data || []);
        setLoading(false);

        // 设置实时订阅
        const filterExpression = Object.entries(stableFilter)
          .map(([key, value]) => `${key}=eq.${String(value)}`)
          .join('&');

        subscription = supabase
          .channel(channel)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter: filterExpression,
            },
            (payload) => {
              const typedPayload = payload as RealtimePayload<T>;
              logger.debug('Real-time update', {
                channel,
                table,
                eventType: typedPayload.eventType,
              });

              if (typedPayload.eventType === 'INSERT') {
                setData((prev) => [...prev, typedPayload.new]);
              } else if (typedPayload.eventType === 'UPDATE') {
                setData((prev) =>
                  prev.map((item) =>
                    // 根据ID或其他唯一标识符更新
                    resolveItemId(item) === resolveItemId(typedPayload.new)
                      ? typedPayload.new
                      : item,
                  ),
                );
              } else if (typedPayload.eventType === 'DELETE') {
                setData((prev) =>
                  prev.filter(
                    (item) =>
                      resolveItemId(item) !== resolveItemId(typedPayload.old),
                  ),
                );
              }
            },
          )
          .subscribe();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [channel, table, filterKey, enabled, stableFilter]);

  return {
    data,
    loading,
    error,
  };
}

// 认证 Hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        setUser(session?.user || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setUser(data.user);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
  };
}

// 导出类型定义
export type {
  User,
  HealthData,
  MealRecord,
  Recipe,
  InventoryItem,
  ShoppingList,
} from '@/lib/supabase-client';
