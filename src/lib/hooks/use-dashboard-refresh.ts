'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface RefreshOptions {
  interval?: number // 自动刷新间隔（毫秒）
  manual?: boolean // 是否支持手动刷新
  onError?: (error: Error) => void
}

interface RefreshState {
  isRefreshing: boolean
  lastRefreshTime: Date | null
  error: Error | null
}

export function useDashboardRefresh<T>(
  fetcher: () => Promise<T>,
  options: RefreshOptions = {}
) {
  const { interval = 30000, manual = true, onError } = options
  const [data, setData] = useState<T | null>(null)
  const [state, setState] = useState<RefreshState>({
    isRefreshing: false,
    lastRefreshTime: null,
    error: null,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return

    setState(prev => ({ ...prev, isRefreshing: true, error: null }))

    try {
      const result = await fetcher()
      
      if (mountedRef.current) {
        setData(result)
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          lastRefreshTime: new Date(),
          error: null,
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: err,
        }))
        onError?.(err)
      }
    }
  }, [fetcher, onError])

  // 初始加载
  useEffect(() => {
    refresh()
  }, [refresh])

  // 自动刷新
  useEffect(() => {
    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        refresh()
      }, interval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [interval, refresh])

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    data,
    isRefreshing: state.isRefreshing,
    lastRefreshTime: state.lastRefreshTime,
    error: state.error,
    refresh: manual ? refresh : undefined,
  }
}

/**
 * 多数据源刷新Hook
 */
export function useMultiDashboardRefresh<T extends Record<string, any>>(
  fetchers: Record<keyof T, () => Promise<T[keyof T]>>,
  options: RefreshOptions = {}
) {
  const { interval = 30000, manual = true, onError } = options
  const [data, setData] = useState<Partial<T>>({})
  const [state, setState] = useState<RefreshState>({
    isRefreshing: false,
    lastRefreshTime: null,
    error: null,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async (keys?: Array<keyof T>) => {
    if (!mountedRef.current) return

    setState(prev => ({ ...prev, isRefreshing: true, error: null }))

    try {
      const keysToRefresh = keys || (Object.keys(fetchers) as Array<keyof T>)
      const results: Partial<T> = {}

      await Promise.all(
        keysToRefresh.map(async (key) => {
          try {
            const result = await fetchers[key]()
            if (mountedRef.current) {
              results[key] = result
            }
          } catch (error) {
            console.error(`Failed to refresh ${String(key)}:`, error)
            if (mountedRef.current) {
              results[key] = data[key] // 保持旧数据
            }
          }
        })
      )

      if (mountedRef.current) {
        setData(prev => ({ ...prev, ...results }))
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          lastRefreshTime: new Date(),
          error: null,
        }))
      }
    } catch (error) {
      if (mountedRef.current) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: err,
        }))
        onError?.(err)
      }
    }
  }, [fetchers, data, onError])

  // 初始加载
  useEffect(() => {
    refresh()
  }, [refresh])

  // 自动刷新
  useEffect(() => {
    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        refresh()
      }, interval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [interval, refresh])

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    data,
    isRefreshing: state.isRefreshing,
    lastRefreshTime: state.lastRefreshTime,
    error: state.error,
    refresh: manual ? refresh : undefined,
  }
}

/**
 * 仪表盘数据缓存Hook
 */
export function useDashboardCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5分钟缓存
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`dashboard_cache_${key}`)
      if (!cached) return null

      const { data: cachedData, timestamp } = JSON.parse(cached)
      const now = Date.now()

      if (now - timestamp > ttl) {
        localStorage.removeItem(`dashboard_cache_${key}`)
        return null
      }

      return cachedData
    } catch {
      return null
    }
  }, [key, ttl])

  const setCachedData = useCallback((newData: T) => {
    try {
      const cacheData = {
        data: newData,
        timestamp: Date.now(),
      }
      localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }, [key])

  const refresh = useCallback(async (force: boolean = false) => {
    if (!force) {
      const cached = getCachedData()
      if (cached) {
        setData(cached)
        setIsLoading(false)
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setCachedData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, getCachedData, setCachedData])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    data,
    isLoading,
    error,
    refresh,
    clearCache: () => {
      localStorage.removeItem(`dashboard_cache_${key}`)
    },
  }
}
