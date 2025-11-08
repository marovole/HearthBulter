export function getEnvironmentVariable(key, defaultValue = null) {
  // 优先从 Cloudflare Pages 环境变量获取
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue
  }
  
  // 尝试从全局环境变量获取（适用于不同的运行时）
  if (typeof globalThis !== 'undefined' && globalThis[key]) {
    return globalThis[key]
  }
  
  return defaultValue
}

export function validateEnvironment() {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  const missing = []
  
  for (const varName of requiredVars) {
    const value = getEnvironmentVariable(varName)
    if (!value) {
      missing.push(varName)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export const config = {
  // Supabase 配置
  supabase: {
    url: getEnvironmentVariable('SUPABASE_URL') || getEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvironmentVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceKey: getEnvironmentVariable('SUPABASE_SERVICE_KEY'),
  },
  
  // 应用配置
  app: {
    name: 'Health Butler',
    version: '1.0.0',
    environment: getEnvironmentVariable('NODE_ENV', 'development'),
    debug: getEnvironmentVariable('DEBUG', 'false') === 'true',
  },
  
  // API 配置
  api: {
    version: 'v1',
    maxLimit: 100,
    defaultLimit: 20,
    maxOffset: 10000,
  },
  
  // 缓存配置
  cache: {
    defaultTtl: 3600, // 1小时
    staticTtl: 86400, // 24小时
    apiTtl: 300, // 5分钟
  },
  
  // 安全配置
  security: {
    corsOrigins: getEnvironmentVariable('CORS_ORIGINS', '*').split(',').map(s => s.trim()),
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      maxRequests: 100, // 每个IP最多100个请求
    },
  },
}

export default config
