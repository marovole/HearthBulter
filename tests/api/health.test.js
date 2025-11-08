import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createSupabaseClient } from '../functions/utils/supabase.js'
import { createSuccessResponse, createValidationError } from '../functions/utils/response.js'
import { withAuth } from '../functions/middleware/auth.js'
import { withErrorHandler } from '../functions/utils/error-handler.js'

// 测试环境配置
const TEST_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://test-project.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'test-service-key',
  TEST_USER_ID: 'test-user-123',
  TEST_MEMBER_ID: 'test-member-456'
}

// 模拟 Supabase 客户端
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            data: [
              {
                id: '1',
                data_type: 'weight',
                value: 70.5,
                unit: 'kg',
                recorded_at: '2024-01-01T10:00:00Z',
                created_at: '2024-01-01T10:00:00Z',
                user: {
                  id: TEST_ENV.TEST_USER_ID,
                  name: 'Test User',
                  email: 'test@example.com'
                }
              }
            ],
            error: null
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: {
            id: '2',
            data_type: 'weight',
            value: 72.0,
            unit: 'kg',
            recorded_at: '2024-01-02T10:00:00Z'
          },
          error: null
        }))
      }))
    }))
  }))
}

// 模拟环境变量
process.env.SUPABASE_URL = TEST_ENV.SUPABASE_URL
process.env.SUPABASE_SERVICE_KEY = TEST_ENV.SUPABASE_SERVICE_KEY

describe('Health API Tests', () => {
  let originalEnv

  beforeAll(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env }
  })

  afterAll(() => {
    // 恢复原始环境变量
    process.env = originalEnv
  })

  describe('GET /api/v1/health', () => {
    it('should return health data for authenticated user', async () => {
      // 模拟认证用户
      const mockUser = {
        id: TEST_ENV.TEST_USER_ID,
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      }

      // 模拟请求
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health?limit=20&offset=0'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: mockUser
      }

      // 导入并测试 API 端点
      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      // 模拟 Supabase 客户端
      jest.mock('../functions/utils/supabase.js', () => ({
        createSupabaseClient: () => mockSupabase
      }))

      const response = await onRequestGet(mockContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('pagination')
      expect(result).toHaveProperty('timestamp')
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should filter health data by type', async () => {
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health?type=weight&limit=10'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      // 测试带过滤条件的查询
      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.every(item => item.data_type === 'weight')).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health?limit=5&offset=10'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.pagination).toEqual({
        limit: 5,
        offset: 10,
        total: expect.any(Number)
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        // 没有 user 属性，模拟未认证
      }

      // 模拟认证失败
      jest.mock('../functions/middleware/auth.js', () => ({
        withAuth: (handler) => async (context) => {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }))

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/v1/health', () => {
    it('should create new health data', async () => {
      const mockRequest = {
        json: async () => ({
          data_type: 'weight',
          value: 75.0,
          unit: 'kg',
          recorded_at: '2024-01-03T10:00:00Z'
        })
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestPost } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestPost(mockContext)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('message')
      expect(result.data.data_type).toBe('weight')
      expect(result.data.value).toBe(75.0)
    })

    it('should validate required fields', async () => {
      const mockRequest = {
        json: async () => ({
          // 缺少必需的 data_type 和 value
          unit: 'kg'
        })
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestPost } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestPost(mockContext)
      
      expect(response.status).toBe(400)
    })

    it('should validate data type', async () => {
      const mockRequest = {
        json: async () => ({
          data_type: 'invalid_type',
          value: 100,
          unit: 'kg'
        })
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestPost } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestPost(mockContext)
      
      expect(response.status).toBe(400)
    })

    it('should validate numeric range', async () => {
      const mockRequest = {
        json: async () => ({
          data_type: 'weight',
          value: 10000, // 超出合理范围
          unit: 'kg'
        })
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestPost } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestPost(mockContext)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // 模拟数据库错误
      const mockSupabaseWithError = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn(() => ({
                  data: null,
                  error: { message: 'Database connection failed' }
                }))
              }))
            }))
          }))
        }))
      }

      jest.mock('../functions/utils/supabase.js', () => ({
        createSupabaseClient: () => mockSupabaseWithError
      }))

      const mockRequest = {
        url: 'https://api.example.com/api/v1/health'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result).toHaveProperty('error')
      expect(result.error).toContain('Database operation failed')
    })

    it('should handle malformed JSON requests', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON')
        }
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestPost } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestPost(mockContext)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Response Headers', () => {
    it('should include proper CORS headers', async () => {
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should handle OPTIONS requests', async () => {
      const { onRequestOptions } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestOptions()
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    })
  })

  describe('Performance', () => {
    it('should handle pagination efficiently', async () => {
      const startTime = Date.now()
      
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health?limit=100&offset=0'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
    })

    it('should validate query parameters efficiently', async () => {
      const mockRequest = {
        url: 'https://api.example.com/api/v1/health?limit=abc&offset=xyz'
      }

      const mockContext = {
        request: mockRequest,
        env: TEST_ENV,
        user: { id: TEST_ENV.TEST_USER_ID }
      }

      const { onRequestGet } = await import('../functions/api/v1/health/index.js')
      
      const response = await onRequestGet(mockContext)
      
      expect(response.status).toBe(400)
    })
  })
})

// 集成测试
describe('Health API Integration Tests', () => {
  let testUserId
  let testMemberId
  let accessToken

  beforeAll(async () => {
    // 设置测试环境
    testUserId = 'test-user-integration'
    testMemberId = 'test-member-integration'
    
    // 创建测试用户和成员（如果需要在真实环境中测试）
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      // 这里可以创建真实的测试数据
      accessToken = await createTestUser()
    }
  })

  afterAll(async () => {
    // 清理测试数据
    if (process.env.RUN_INTEGRATION_TESTS === 'true') {
      await cleanupTestData()
    }
  })

  it('should complete full CRUD cycle', async () => {
    if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
      console.log('Skipping integration test - set RUN_INTEGRATION_TESTS=true to run')
      return
    }

    // 1. 创建健康数据
    const createResponse = await fetch(`${TEST_ENV.SUPABASE_URL}/api/v1/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        data_type: 'weight',
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date().toISOString()
      })
    })

    expect(createResponse.status).toBe(201)
    const createdData = await createResponse.json()
    const recordId = createdData.data.id

    // 2. 读取健康数据
    const readResponse = await fetch(`${TEST_ENV.SUPABASE_URL}/api/v1/health?memberId=${testMemberId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    expect(readResponse.status).toBe(200)
    const readData = await readResponse.json()
    expect(readData.data.some(item => item.id === recordId)).toBe(true)

    // 3. 更新健康数据（如果支持）
    // 注意：当前实现中可能不支持 PUT 方法

    // 4. 删除健康数据（如果支持）
    // 注意：当前实现中可能不支持 DELETE 方法
  })
})

// 辅助函数
async function createTestUser() {
  // 创建测试用户并返回访问令牌
  // 这里需要根据实际的认证流程实现
  return 'test-access-token'
}

async function cleanupTestData() {
  // 清理测试数据
  // 这里需要根据实际的数据清理流程实现
}

// 性能基准测试
describe('Health API Performance Benchmarks', () => {
  it('should handle concurrent requests', async () => {
    const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
      fetch(`${TEST_ENV.SUPABASE_URL}/api/v1/health?limit=20&offset=${i * 20}`)
    )

    const startTime = Date.now()
    const responses = await Promise.all(concurrentRequests)
    const endTime = Date.now()

    const allSuccessful = responses.every(response => response.status === 200)
    expect(allSuccessful).toBe(true)

    const totalDuration = endTime - startTime
    expect(totalDuration).toBeLessThan(2000) // 10个并发请求应在2秒内完成
  })

  it('should handle large datasets efficiently', async () => {
    const response = await fetch(`${TEST_ENV.SUPABASE_URL}/api/v1/health?limit=1000`)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.data.length).toBeLessThanOrEqual(1000)
    
    // 验证响应时间
    const responseTime = parseInt(response.headers.get('X-Response-Time') || '0')
    expect(responseTime).toBeLessThan(1000) // 1秒内响应
  })
})
