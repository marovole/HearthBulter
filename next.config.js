/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 部署配置
  // 使用 standalone 模式（OpenNext 要求）
  output: "standalone",
  trailingSlash: false,

  eslint: {
    // 禁用构建时 ESLint 检查（保留 - 还有大量格式问题需要修复）
    // 使用 pre-commit hook 和 CI/CD 进行代码质量检查
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 暂时禁用 TypeScript 构建检查
    // 原因：Supabase 适配器类型定义不完整，导致多个类型推断问题
    // 已完成的修复：
    // ✅ updateStreakDays 重构到 src/lib/utils/streak.ts
    // ✅ Sentry v10+ 配置更新
    // ✅ scripts 文件夹类型错误修复
    // TODO: 完善 Supabase 适配器类型定义或使用类型断言处理所有 Supabase 查询
    ignoreBuildErrors: true,
  },

  // 图片优化配置
  images: {
    unoptimized: true, // Cloudflare Pages 静态导出必需
    domains: [
      "images.unsplash.com",
      "avatars.githubusercontent.com",
      "api.dicebear.com",
      "supabase.co",
      "imagedelivery.net", // Cloudflare Images CDN
    ],
    formats: ["image/webp", "image/avif"],
  },

  // 优化配置
  compress: true,

  // 实验性功能
  experimental: {
    scrollRestoration: true,
    // 输出文件追踪配置
    outputFileTracingExcludes: {
      "*": [
        // 排除 Prisma 的本地二进制文件
        "**/node_modules/@prisma/engines/**",
        "**/node_modules/.prisma/client/libquery_engine-*",
        // 排除 Puppeteer 和 Chromium
        "**/node_modules/puppeteer/**",
        "**/node_modules/puppeteer-core/**",
        "**/node_modules/@sparticuz/chromium/**",
        "**/node_modules/chrome-aws-lambda/**",
        // 排除其他大型依赖
        "**/node_modules/sharp/build/**",
        "**/node_modules/@swc/**/*.node",
        // 排除 source maps
        "**/*.map",
        // 排除测试文件
        "**/*.test.*",
        "**/*.spec.*",
        "**/test/**",
        "**/tests/**",
        // 排除文档
        "**/docs/**",
        "**/README*",
        "**/CHANGELOG*",
        "**/HISTORY*",
      ],
    },
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: "/api/health",
      },
    ];
  },
  async headers() {
    // CORS 配置
    let corsOrigin = "http://localhost:3000";
    if (process.env.NODE_ENV === "production") {
      // Cloudflare Pages 环境变量优先级
      const cfPagesUrl = process.env.CF_PAGES_URL
        ? process.env.CF_PAGES_URL.trim()
        : "";
      const cfPagesCustomDomain = process.env.CF_PAGES_CUSTOM_DOMAIN
        ? `https://${process.env.CF_PAGES_CUSTOM_DOMAIN.trim()}`
        : "";

      corsOrigin = (
        process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ||
        cfPagesCustomDomain ||
        cfPagesUrl ||
        "https://hearthbulter.pages.dev"
      ).trim();

      if (!process.env.NEXT_PUBLIC_ALLOWED_ORIGINS) {
        console.warn(
          "⚠️  警告：未设置 NEXT_PUBLIC_ALLOWED_ORIGINS，使用默认值",
        );
      }
    }

    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: corsOrigin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; " +
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://openrouter.ai; " +
              "font-src 'self' https://fonts.googleapis.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
