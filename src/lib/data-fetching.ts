import { supabase } from './supabase-client'

export class DataFetcher {
  // 静态数据：构建时获取
  static async getStaticData(path: string) {
    try {
      const response = await fetch(`/api/static${path}`)
      if (!response.ok) {
        throw new Error(`Static data fetch failed: ${response.status}`)
      }
      return response.json()
    } catch (error) {
      console.error('Error fetching static data:', error)
      throw error
    }
  }

  // 动态数据：客户端获取
  static async getDynamicData(path: string, options?: RequestInit) {
    try {
      const response = await fetch(`/api/dynamic${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error('Error fetching dynamic data:', error)
      throw error
    }
  }

  // 实时数据：Supabase订阅
  static subscribeToData(
    channel: string,
    table: string,
    callback: (data: any) => void
  ) {
    return supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe()
  }

  // 获取健康数据
  static async getHealthData(userId: string, options?: { limit?: number; offset?: number; type?: string }) {
    const { limit = 20, offset = 0, type } = options || {}
    
    let query = supabase
      .from('health_data')
      .select(`
        *,
        user:users!user_id(id, name, email)
      `)
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('data_type', type)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    return {
      data,
      pagination: {
        limit,
        offset,
        total: data?.length || 0
      }
    }
  }

  // 创建健康数据
  static async createHealthData(userId: string, data: {
    data_type: string
    value: number
    unit?: string
    recorded_at?: string
    metadata?: Record<string, any>
  }) {
    const { data_type, value, unit, recorded_at, metadata = {} } = data

    if (!data_type || !value) {
      throw new Error('Missing required fields: data_type, value')
    }

    const { data: createdData, error } = await supabase
      .from('health_data')
      .insert({
        user_id: userId,
        data_type,
        value,
        unit,
        recorded_at: recorded_at || new Date().toISOString(),
        metadata
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`)
    }

    return createdData
  }

  // 获取用户信息
  static async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return data
  }

  // 更新用户信息
  static async updateUser(userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return data
  }
}

export default DataFetcher
