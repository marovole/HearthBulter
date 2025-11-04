/**
 * Sentry客户端（浏览器）配置
 *
 * 此文件配置Sentry在浏览器端的错误追踪和性能监控
 *
 * 文档：https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

// 仅在配置了DSN时初始化Sentry
if (SENTRY_DSN) {
  Sentry.init({
    // Sentry项目的DSN
    // 从Sentry项目设置 > Client Keys (DSN)获取
    dsn: SENTRY_DSN,

    // 环境标识（development, staging, production）
    environment: SENTRY_ENVIRONMENT,

    // 设置采样率以控制发送到Sentry的错误数量
    // 1.0 = 100% 的错误都会被发送
    // 0.5 = 50% 的错误会被发送
    // Staging环境建议使用1.0以捕获所有问题
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),

    // 性能监控采样率
    // 控制发送到Sentry的性能追踪数据比例
    // 建议：
    // - 开发环境：0 或 0.1（最小化数据）
    // - Staging：0.5（捕获一半的性能数据）
    // - 生产环境：0.1-0.3（根据流量调整）
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.5'),

    // 发布版本标识
    // 用于追踪错误是在哪个版本的代码中发生的
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,

    // 集成配置
    integrations: [
      // 浏览器追踪集成（性能监控）
      Sentry.browserTracingIntegration({
        // 追踪所有路由变化
        tracingOrigins: [
          'localhost',
          /^\//,  // 匹配所有相对路径
          /^https:\/\/.*\.hearthbutler\.com/,  // 匹配所有子域名
        ],

        // 追踪fetch和XHR请求
        traceFetch: true,
        traceXHR: true,

        // 启用React路由追踪
        routingInstrumentation: Sentry.reactRouterV6Instrumentation,
      }),

      // 回放集成（录制用户会话）
      // 注意：这会增加带宽使用，建议仅在需要时启用
      ...(SENTRY_ENVIRONMENT === 'staging' || SENTRY_ENVIRONMENT === 'production'
        ? [
            Sentry.replayIntegration({
              // 仅在发生错误时录制回放
              maskAllText: true,
              blockAllMedia: true,
              // 错误会话采样率：发生错误时录制
              replaysOnErrorSampleRate: 1.0,
              // 正常会话采样率：随机录制一些会话
              replaysSessionSampleRate: 0.1,
            }),
          ]
        : []),
    ],

    // 在发送错误前修改或过滤事件
    beforeSend(event, hint) {
      // 过滤掉特定类型的错误
      const error = hint.originalException;

      // 忽略特定的错误消息
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);

        // 忽略已知的第三方错误
        const ignoredErrors = [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          'Loading chunk',  // 代码分割加载失败（通常是网络问题）
        ];

        if (ignoredErrors.some((ignored) => message.includes(ignored))) {
          return null;  // 不发送此错误
        }
      }

      // 在Staging/Production环境中，移除敏感信息
      if (SENTRY_ENVIRONMENT !== 'development') {
        // 移除可能包含敏感信息的breadcrumb
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
            // 过滤掉包含密码、令牌等的breadcrumb
            const sensitivePatterns = ['password', 'token', 'secret', 'api_key'];
            const data = JSON.stringify(breadcrumb.data || {}).toLowerCase();
            return !sensitivePatterns.some((pattern) => data.includes(pattern));
          });
        }

        // 移除请求数据中的敏感头部
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }

      return event;
    },

    // 忽略特定URL的错误
    ignoreErrors: [
      // 浏览器扩展错误
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // 随机插件错误
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Facebook相关错误
      'fb_xd_fragment',
      // 其他常见的浏览器错误
      'Non-Error promise rejection captured with value',
    ],

    // 忽略特定域名的错误
    denyUrls: [
      // Chrome扩展
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox扩展
      /^moz-extension:\/\//i,
      // 其他浏览器扩展
      /^safari-extension:\/\//i,
    ],

    // 启用调试模式（仅在开发环境）
    debug: SENTRY_ENVIRONMENT === 'development',

    // 自动会话追踪
    autoSessionTracking: true,

    // 启用用户反馈
    // 在发生错误时允许用户提交反馈
    ...(SENTRY_ENVIRONMENT !== 'development' && {
      beforeSendTransaction(event) {
        // 可以在这里过滤或修改性能追踪数据
        return event;
      },
    }),
  });

  // 设置用户上下文（如果有认证用户）
  // 这应该在用户登录后调用
  // 示例：
  // Sentry.setUser({
  //   id: user.id,
  //   email: user.email,
  //   username: user.name,
  // });

  // 设置额外的上下文标签
  Sentry.setTag('app.version', process.env.NEXT_PUBLIC_APP_VERSION || 'unknown');
  Sentry.setTag('deployment.platform', 'vercel');

  console.log(
    `✓ Sentry客户端已初始化 (环境: ${SENTRY_ENVIRONMENT}, 采样率: ${process.env.SENTRY_SAMPLE_RATE || '1.0'})`
  );
} else {
  console.warn('⚠ Sentry DSN未配置，错误追踪已禁用');
}

/**
 * 使用说明：
 *
 * 1. 安装Sentry SDK：
 *    npm install @sentry/nextjs
 *
 * 2. 配置环境变量：
 *    NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
 *    SENTRY_ENVIRONMENT=staging
 *    SENTRY_SAMPLE_RATE=1.0
 *    SENTRY_TRACES_SAMPLE_RATE=0.5
 *
 * 3. 手动捕获错误：
 *    import * as Sentry from '@sentry/nextjs';
 *
 *    try {
 *      // 可能出错的代码
 *    } catch (error) {
 *      Sentry.captureException(error);
 *    }
 *
 * 4. 设置用户上下文：
 *    Sentry.setUser({ id: '123', email: 'user@example.com' });
 *
 * 5. 添加自定义上下文：
 *    Sentry.setContext('character', {
 *      name: 'Mighty Fighter',
 *      age: 19,
 *      attack_type: 'melee',
 *    });
 *
 * 6. 添加面包屑（追踪用户操作）：
 *    Sentry.addBreadcrumb({
 *      category: 'auth',
 *      message: 'User logged in',
 *      level: 'info',
 *    });
 *
 * 文档参考：
 * - Next.js集成：https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * - 配置选项：https://docs.sentry.io/platforms/javascript/configuration/options/
 * - 错误过滤：https://docs.sentry.io/platforms/javascript/configuration/filtering/
 */
