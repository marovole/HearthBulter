import { neon, neonConfig, NeonQueryFunction } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

function getNeonConfig() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    const error = "Missing Neon configuration. Please set DATABASE_URL environment variable";
    console.error("❌ Neon 配置错误:", error);
    console.error("环境变量状态:", {
      DATABASE_URL: process.env.DATABASE_URL ? "✅" : "❌",
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? "✅" : "❌",
    });
    throw new Error(error);
  }

  return { databaseUrl };
}

export class NeonClientManager {
  private static instance: NeonQueryFunction<boolean, boolean>;

  static getInstance(): NeonQueryFunction<boolean, boolean> {
    if (!NeonClientManager.instance) {
      const { databaseUrl } = getNeonConfig();
      NeonClientManager.instance = neon(databaseUrl);
    }
    return NeonClientManager.instance;
  }

  static async query<T = Record<string, unknown>>(
    queryText: string,
    params?: unknown[]
  ): Promise<T[]> {
    const sql = NeonClientManager.getInstance();
    try {
      const result = await sql(queryText as unknown as TemplateStringsArray, params as never);
      return result as T[];
    } catch (error) {
      console.error("Neon query error:", error);
      throw error;
    }
  }
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function keysToCamelCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase) as T;
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as object).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      (result as Record<string, unknown>)[camelKey] = keysToCamelCase(
        (obj as Record<string, unknown>)[key]
      );
      return result;
    }, {} as T);
  }

  return obj as T;
}

export function keysToSnakeCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase) as T;
  }

  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.keys(obj as object).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      (result as Record<string, unknown>)[snakeKey] = keysToSnakeCase(
        (obj as Record<string, unknown>)[key]
      );
      return result;
    }, {} as T);
  }

  return obj as T;
}

export async function testNeonConnection(): Promise<boolean> {
  try {
    const sql = NeonClientManager.getInstance();
    await sql`SELECT 1 as test`;
    console.log("✅ Neon 数据库连接成功");
    return true;
  } catch (error) {
    console.error("❌ Neon 数据库连接失败:", error);
    return false;
  }
}

export async function ensureNeonConnection(): Promise<void> {
  const isConnected = await testNeonConnection();
  if (!isConnected) {
    throw new Error("Failed to connect to Neon database");
  }
}

export { neon, neonConfig };
