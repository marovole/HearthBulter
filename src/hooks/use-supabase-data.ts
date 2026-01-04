import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { DataFetcher } from '@/lib/data-fetching';

// 通用数据获取 Hook
export function useSupabaseData<T>(
  query: string,
  dependencies: any[] = [],
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

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // 检查缓存是否仍然有效
    const now = Date.now();
    if (cacheRef.current.data && now - cacheRef.current.timestamp < staleTime) {
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

      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, enabled, staleTime]);

  const refetch = useCallback(() => {
    setRefetchCount((prev) => prev + 1);
    fetchData();
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
  }, [fetchData, ...dependencies]);

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
  filter: Record<string, any> = {},
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        // 首先获取初始数据
        const initialData = await DataFetcher.getHealthData(
          filter.memberId || '',
          filter,
        );
        setData(initialData.data || []);
        setLoading(false);

        // 设置实时订阅
        subscription = supabase
          .channel(channel)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter: Object.entries(filter)
                .map(([key, value]) => `${key}=eq.${value}`)
                .join('&'),
            },
            (payload) => {
              console.log('Real-time update:', payload);

              if (payload.eventType === 'INSERT') {
                setData((prev) => [...prev, payload.new as T]);
              } else if (payload.eventType === 'UPDATE') {
                setData((prev) =>
                  prev.map((item) =>
                    // 根据ID或其他唯一标识符更新
                    (item as any).id === (payload.new as any).id
                      ? (payload.new as T)
                      : item,
                  ),
                );
              } else if (payload.eventType === 'DELETE') {
                setData((prev) =>
                  prev.filter(
                    (item) => (item as any).id !== (payload.old as any).id,
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
  }, [channel, table, JSON.stringify(filter), enabled]);

  return {
    data,
    loading,
    error,
  };
}

// 认证 Hook
export function useAuth() {
  const [user, setUser] = useState<any>(null);
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
