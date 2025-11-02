const CACHE_NAME = 'health-butler-v1';
const RUNTIME_CACHE = 'health-butler-runtime';
const STATIC_CACHE = 'health-butler-static';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // 其他静态资源会在构建时自动添加
];

// 需要缓存的API路径
const CACHED_API_PATTERNS = [
  /^\/api\/foods/,
  /^\/api\/user\/profile/,
  /^\/api\/nutrition\/goals/,
];

// 不需要缓存的路径
const EXCLUDED_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/admin/,
  /^\/api\/webhooks/,
];

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：缓存优先
  static: {
    strategy: 'cacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    maxEntries: 100,
  },
  // API数据：网络优先
  api: {
    strategy: 'networkFirst',
    maxAge: 5 * 60 * 1000, // 5分钟
    maxEntries: 50,
  },
  // 图片：陈旧时重新验证
  image: {
    strategy: 'staleWhileRevalidate',
    maxAge: 24 * 60 * 60 * 1000, // 1天
    maxEntries: 200,
  },
};

// Service Worker生命周期事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本缓存
            if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE && cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Failed to activate service worker:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非HTTP请求
  if (!request.url.startsWith('http')) {
    return;
  }

  // 跳过排除的路径
  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }

  // 根据请求类型选择缓存策略
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// 处理静态资源请求
async function handleStaticAsset(request) {
  const strategy = CACHE_STRATEGIES.static;

  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
      console.log('[SW] Serving static asset from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Fetching static asset from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await enforceCacheLimit(cache, strategy.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);

    // 网络失败时尝试返回缓存
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving stale static asset from cache:', request.url);
      return cachedResponse;
    }

    // 返回离线页面
    return new Response('离线状态，请检查网络连接', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 处理API请求
async function handleAPIRequest(request) {
  const strategy = CACHE_STRATEGIES.api;

  try {
    console.log('[SW] Fetching API from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      const responseToCache = networkResponse.clone();

      // 添加缓存时间戳
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...responseToCache.headers,
          'sw-cached-at': Date.now().toString(),
        },
      });

      await cache.put(request, cachedResponse);
      await enforceCacheLimit(cache, strategy.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] API fetch failed:', error);

    // 网络失败时尝试返回缓存
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
      console.log('[SW] Serving stale API response from cache:', request.url);
      return cachedResponse;
    }

    // 返回错误响应
    return new Response(JSON.stringify({
      error: '网络连接失败，请检查网络设置'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理图片请求
async function handleImageRequest(request) {
  const strategy = CACHE_STRATEGIES.image;

  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving image from cache:', request.url);

      // 后台更新
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      }).catch(error => {
        console.warn('[SW] Background image update failed:', error);
      });

      return cachedResponse;
    }

    console.log('[SW] Fetching image from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      await enforceCacheLimit(cache, strategy.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);

    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 返回占位图片
    return new Response('图片加载失败', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 处理导航请求
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      return networkResponse;
    }

    // 网络失败时返回缓存的首页
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/');

    if (cachedResponse) {
      console.log('[SW] Serving cached index page');
      return cachedResponse;
    }

    throw new Error('No cached index page available');
  } catch (error) {
    console.error('[SW] Navigation request failed:', error);

    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/');

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('离线状态', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 判断是否为静态资源
function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2'];
  const extension = url.pathname.split('.').pop()?.toLowerCase();

  return staticExtensions.includes(`.${extension}`) ||
         url.pathname.startsWith('/_next/') ||
         url.pathname.startsWith('/static/');
}

// 判断是否为API请求
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') &&
         CACHED_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 判断是否为图片请求
function isImageRequest(request) {
  const url = new URL(request.url);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'];
  const extension = url.pathname.split('.').pop()?.toLowerCase();

  return imageExtensions.includes(`.${extension}`) &&
         !url.pathname.startsWith('/_next/');
}

// 检查响应是否过期
function isExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;

  const cacheTime = parseInt(cachedAt);
  return Date.now() - cacheTime > maxAge;
}

// 强制执行缓存限制
async function enforceCacheLimit(cache, maxEntries) {
  const keys = await cache.keys();

  if (keys.length <= maxEntries) return;

  console.log(`[SW] Enforcing cache limit: ${keys.length} > ${maxEntries}`);

  // 删除最旧的条目
  const requestsToDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(requestsToDelete.map(request => cache.delete(request)));
}

// 消息处理
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage(stats);
      });
      break;

    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

// 清除所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// 获取缓存统计
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }

  return stats;
}

// 后台同步（如果支持）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');

  try {
    // 这里可以执行后台同步任务
    // 例如：同步离线数据、发送分析数据等
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// 推送通知（如果支持）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || '您有新的消息',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
      },
      {
        action: 'close',
        title: '关闭',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Health Butler', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker loaded');