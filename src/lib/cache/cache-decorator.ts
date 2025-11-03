import { CacheService, CacheKeyBuilder, CACHE_CONFIG } from './redis-client';

// 缓存装饰器选项
interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  generateKey?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  invalidateOn?: string[];
}

/**
 * 方法缓存装饰器
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 检查缓存条件
      if (options.condition && !options.condition(...args)) {
        return method.apply(this, args);
      }

      // 生成缓存键
      let cacheKey: string;
      if (options.generateKey) {
        cacheKey = options.generateKey(...args);
      } else {
        const keyPrefix = options.keyPrefix || `${target.constructor.name}.${propertyName}`;
        const keySuffix = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join('|');
        cacheKey = `${keyPrefix}:${keySuffix}`;
      }

      // 使用 getOrSet 模式
      return CacheService.getOrSet(
        cacheKey,
        () => method.apply(this, args),
        options.ttl
      );
    };

    return descriptor;
  };
}

/**
 * API 响应缓存装饰器
 */
export function ApiCached(options: Omit<CacheOptions, 'keyPrefix'> = {}) {
  return Cached({
    ...options,
    keyPrefix: 'api',
    ttl: options.ttl || CACHE_CONFIG.TTL.API_RESPONSE,
  });
}

/**
 * 用户数据缓存装饰器
 */
export function UserCached(options: Omit<CacheOptions, 'keyPrefix'> = {}) {
  return Cached({
    ...options,
    keyPrefix: 'user',
    ttl: options.ttl || CACHE_CONFIG.TTL.USER_SESSION,
  });
}

/**
 * 营养数据缓存装饰器
 */
export function NutritionCached(options: Omit<CacheOptions, 'keyPrefix'> = {}) {
  return Cached({
    ...options,
    keyPrefix: 'nutrition',
    ttl: options.ttl || CACHE_CONFIG.TTL.NUTRITION_DATA,
  });
}

/**
 * 食谱数据缓存装饰器
 */
export function RecipeCached(options: Omit<CacheOptions, 'keyPrefix'> = {}) {
  return Cached({
    ...options,
    keyPrefix: 'recipe',
    ttl: options.ttl || CACHE_CONFIG.TTL.RECIPE_DATA,
  });
}

/**
 * 缓存失效装饰器
 */
export function CacheInvalidator(invalidateKeys: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);

      // 异步失效缓存，不阻塞主要流程
      setImmediate(async () => {
        for (const keyPattern of invalidateKeys) {
          try {
            await CacheService.deletePattern(keyPattern);
          } catch (error) {
            console.error('Cache invalidation error:', error);
          }
        }
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * 查询结果缓存装饰器
 */
export function QueryCached(options: Omit<CacheOptions, 'keyPrefix'> = {}) {
  return Cached({
    ...options,
    keyPrefix: 'query',
    ttl: options.ttl || CACHE_CONFIG.TTL.QUERY_RESULT,
    generateKey: (...args: any[]) => {
      // 生成基于查询参数的哈希键
      const queryStr = JSON.stringify(args);
      return CacheKeyBuilder.query(btoa(queryStr).replace(/[+=/]/g, ''));
    },
  });
}

export default {
  Cached,
  ApiCached,
  UserCached,
  NutritionCached,
  RecipeCached,
  CacheInvalidator,
  QueryCached,
};
