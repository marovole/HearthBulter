import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

/**
 * OpenNext Cloudflare 配置
 *
 * 注意: @opennextjs/cloudflare 的类型定义可能不完整
 * 使用 as any 绕过类型检查,配置项参考官方文档
 */
export default defineCloudflareConfig({
  // 优化构建配置
  build: {
    // 排除大型依赖项
    external: [
      // 排除Prisma的其他数据库引擎WASM文件
      "@prisma/client/runtime/query_engine_bg.mysql.wasm",
      "@prisma/client/runtime/query_engine_bg.sqlite.wasm",
      "@prisma/client/runtime/query_engine_bg.sqlserver.wasm",
      "@prisma/client/runtime/query_engine_bg.cockroachdb.wasm",
      "@prisma/client/runtime/query_compiler_bg.mysql.wasm",
      "@prisma/client/runtime/query_compiler_bg.sqlite.wasm",
      "@prisma/client/runtime/query_compiler_bg.sqlserver.wasm",
      "@prisma/client/runtime/query_compiler_bg.cockroachdb.wasm",
      // 排除Puppeteer和相关大型依赖
      "puppeteer",
      "@sparticuz/chromium",
      "chrome-aws-lambda",
      "puppeteer-core",
      // 排除jsdom（仅用于测试环境和客户端组件）
      "jsdom",
      // 排除其他大型WASM文件
      "**/*.wasm",
      "**/*.wasm-base64.js",
    ],
    // 优化chunk分割
    splitChunks: {
      chunks: 'all',
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
    // 启用压缩
    minify: true,
    // 移除source map以减小大小
    sourcemap: false,
  },
  // 函数配置
  functions: {
    // 优化中间件配置
    middleware: {
      external: [
        "puppeteer",
        "@sparticuz/chromium",
        "chrome-aws-lambda",
        "puppeteer-core",
        "jsdom",
        "**/*.wasm",
        "**/*.wasm-base64.js",
      ],
    },
  },
} as any);
