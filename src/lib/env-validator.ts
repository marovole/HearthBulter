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

  // 必需的环境变量
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

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
    // 检查NEXTAUTH_SECRET的强度
    const secret = process.env.NEXTAUTH_SECRET;
    if (secret) {
      if (secret.length < 32) {
        errors.push({
          variable: "NEXTAUTH_SECRET",
          message: "NEXTAUTH_SECRET 在生产环境中必须至少32个字符",
        });
      }
      if (
        secret.includes("please-change") ||
        secret.includes("example") ||
        secret.includes("your-")
      ) {
        errors.push({
          variable: "NEXTAUTH_SECRET",
          message: "NEXTAUTH_SECRET 使用了示例值，请在生产环境中设置安全的密钥",
        });
      }
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

  console.log("✅ 环境变量验证通过");
}

/**
 * 验证可选的环境变量并给出警告
 */
export function validateOptionalEnvironmentVariables(): void {
  const warnings: string[] = [];

  // 可选但推荐的环境变量
  const optionalVars = {
    REDIS_URL: "Redis缓存未配置，性能可能受影响",
    USDA_API_KEY: "USDA API未配置，食品数据功能将受限",
    GOOGLE_CLIENT_ID: "Google OAuth未配置，用户无法使用Google登录",
  };

  for (const [varName, warningMessage] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      warnings.push(`⚠️  ${varName}: ${warningMessage}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("\n可选环境变量警告:");
    warnings.forEach((w) => console.warn(w));
    console.warn("");
  }
}
