/**
 * 环境变量验证器
 * 在应用启动时验证必需的环境变量
 */

interface EnvValidationError {
  variable: string;
  message: string;
}

/**
 * 验证环境变量
 * @throws {Error} 如果必需的环境变量缺失或无效
 */
export function validateEnvironmentVariables(): void {
  const errors: EnvValidationError[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  // 已迁移到 Neon + Clerk，移除 Supabase 依赖
  const requiredVars = ["DATABASE_URL", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];

  // 检查必需的环境变量
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push({
        variable: varName,
        message: `环境变量 ${varName} 未设置`,
      });
    }
  }

  // 生产环境特殊检查
  if (isProduction) {
    // 检查 Clerk 密钥
    if (!process.env.CLERK_SECRET_KEY) {
      errors.push({
        variable: "CLERK_SECRET_KEY",
        message: "生产环境需要配置 Clerk 认证密钥",
      });
    }

    // 检查数据库URL是否为localhost
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1"))) {
      errors.push({
        variable: "DATABASE_URL",
        message: "生产环境不应使用localhost数据库",
      });
    }
  }

  // 如果有错误，在开发环境抛出异常，生产环境仅记录警告
  if (errors.length > 0) {
    const errorMessage = [
      "❌ 环境变量验证失败:",
      "",
      ...errors.map((e) => `  • ${e.variable}: ${e.message}`),
      "",
      "请检查您的 .env 文件并确保所有必需的环境变量都已正确设置。",
      "参考 .env.example 文件了解所需的环境变量。",
    ].join("\n");

    if (isProduction) {
      console.error("❌ 生产环境环境变量错误:", errorMessage);
      throw new Error(errorMessage); // 生产环境必须严格验证，阻止启动
    } else {
      throw new Error(errorMessage);
    }
  }

  if (!isProduction) {
    console.log("✅ 环境变量验证通过");
  }
}

/**
 * 验证可选的环境变量并给出警告
 */
export function validateOptionalEnvironmentVariables(): void {
  const warnings: string[] = [];

  // 可选但推荐的环境变量
  const optionalVars = {
    REDIS_URL: "Redis缓存未配置，性能可能受影响",
    UPSTASH_REDIS_REST_URL: "Upstash Redis 未配置，缓存将降级为内存或跳过",
    UPSTASH_REDIS_REST_TOKEN: "Upstash Redis 未配置，缓存将降级为内存或跳过",
    USDA_API_KEY: "USDA API未配置，食品数据功能将受限",
    GOOGLE_CLIENT_ID: "Google OAuth未配置，用户无法使用Google登录",
    OPENROUTER_API_KEY: "OpenRouter 未配置，将无法使用该模型",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "Web Push 公钥未配置，浏览器推送不可用",
    LOG_LEVEL: "未设置 LOG_LEVEL，将使用默认日志级别",
  };

  for (const [varName, warningMessage] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      warnings.push(`⚠️  ${varName}: ${warningMessage}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("\n可选环境变量警告:");
    for (const w of warnings) {
      console.warn(w);
    }
    console.warn("");
  }
}
