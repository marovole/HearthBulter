import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // Use workerd conditions for better compatibility with Cloudflare Workers
  cloudflare: {
    useWorkerdCondition: true,
    // 只包含PostgreSQL引擎，排除其他数据库引擎以减少包大小
    includeDatabases: ["postgresql"],
  },
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
        "**/*.wasm",
        "**/*.wasm-base64.js",
      ],
    },
  },
});
