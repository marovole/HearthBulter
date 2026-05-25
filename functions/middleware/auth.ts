/**
 * Cloudflare Functions 认证中间件
 *
 * 验证 JWT Token 并提取用户信息
 *
 * [已迁移至 Clerk，env 仅供旧 Workers 层兼容]
 * NEXTAUTH_SECRET / DATABASE_URL 等环境变量已不再为主线使用，
 * 保留仅为 Cloudflare Functions 遗留接口兼容。
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface CloudflareContext {
  request: Request;
  env: {
    NEXTAUTH_SECRET: string;
    DATABASE_URL: string;
    [key: string]: string;
  };
  waitUntil: (promise: Promise<unknown>) => void;
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7);
}

async function verifyToken(
  _token: string,
  _env: CloudflareContext["env"]
): Promise<{ id: string; email: string; role: string } | null> {
  // TODO: Implement JWT verification with jose library
  // For now, return null to indicate auth is not implemented
  console.warn("Auth middleware: JWT verification not implemented for Neon migration");
  return null;
}

export async function requireAuth(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  const token = extractBearerToken(context.request);

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await verifyToken(token, context.env);

  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  (context.request as AuthenticatedRequest).user = user;

  return next();
}

export async function optionalAuth(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  const token = extractBearerToken(context.request);

  if (token) {
    const user = await verifyToken(token, context.env);
    if (user) {
      (context.request as AuthenticatedRequest).user = user;
    }
  }

  return next();
}

export function requireRole(allowedRoles: string[]) {
  return async (context: CloudflareContext, next: () => Promise<Response>): Promise<Response> => {
    const user = (context.request as AuthenticatedRequest).user;

    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return next();
  };
}

export async function cors(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = await next();

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function errorHandler(
  _context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  try {
    return await next();
  } catch (error) {
    console.error("Unhandled error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export function composeMiddlewares(
  ...middlewares: Array<
    (context: CloudflareContext, next: () => Promise<Response>) => Promise<Response>
  >
) {
  return async (
    context: CloudflareContext,
    handler: () => Promise<Response>
  ): Promise<Response> => {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= middlewares.length) {
        return handler();
      }

      const middleware = middlewares[index++];
      return middleware!(context, next);
    };

    return next();
  };
}
