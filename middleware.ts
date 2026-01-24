import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { ClerkMiddlewareAuth } from "@clerk/nextjs/server";
import { rateLimiter } from "@/lib/middleware/rate-limit-middleware";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/families(.*)",
  "/profile(.*)",
  "/settings(.*)",
  "/health-data(.*)",
  "/meal-planning(.*)",
  "/shopping-list(.*)",
]);

const isPublicApiRoute = createRouteMatcher(["/api/health(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  const startTime = Date.now();
  const { pathname } = req.nextUrl;
  const method = req.method;
  const cors = resolveCors(req);

  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  if (method === "OPTIONS") {
    if (!cors.allowed) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const preflight = NextResponse.json({}, { status: 200 });
    applyBasicSecurityHeaders(req, preflight, cors);
    return preflight;
  }

  try {
    let response = NextResponse.next();
    response = applyBasicSecurityHeaders(req, response, cors);

    if (isProtectedRoute(req)) {
      await auth.protect();
    }

    if (pathname.startsWith("/api/") && !isPublicApiRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "未授权访问" }, { status: 401 });
      }
    }

    const limit = await rateLimiter.checkLimit(req, {
      windowMs: 60_000,
      maxRequests: pathname.startsWith("/api/auth") ? 20 : 100,
      identifier: "ip",
      storage: "memory",
      message: "请求过于频繁",
    });

    if (!limit.allowed) {
      const retryAfter = limit.retryAfter ?? 60;
      return new NextResponse(JSON.stringify({ error: "请求过于频繁" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      });
    }

    response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
    response.headers.set("X-Middleware-Version", "optimized-v2");

    return response;
  } catch (error) {
    // Clerk's auth.protect() throws redirect responses for unauthenticated users
    // These must be passed through, not caught as errors
    if (error instanceof Response) {
      return error;
    }

    // Check for Next.js redirect errors (thrown by Clerk and other redirects)
    // These have digest property containing "NEXT_REDIRECT"
    if (error && typeof error === "object") {
      const errObj = error as { digest?: string; message?: string };
      if (
        errObj.digest?.includes("NEXT_REDIRECT") ||
        errObj.message?.includes("NEXT_REDIRECT") ||
        errObj.message?.includes("redirect")
      ) {
        throw error;
      }
    }

    console.error("Middleware error:", error instanceof Error ? error.message : "Unknown error");

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
});

function shouldSkipMiddleware(pathname: string): boolean {
  const skipPatterns = [
    "/_next",
    "/api/health",
    "/api/debug",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ];

  return skipPatterns.some((pattern) => pathname.startsWith(pattern));
}

function applyBasicSecurityHeaders(
  req: NextRequest,
  response: NextResponse,
  cors: ReturnType<typeof resolveCors>
): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (cors.allowed) {
    response.headers.set("Access-Control-Allow-Origin", cors.origin ?? "*");
    response.headers.set("Access-Control-Allow-Methods", cors.allowMethods);
    response.headers.set("Access-Control-Allow-Headers", cors.allowHeaders);
    if (cors.allowCredentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    response.headers.append("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};

function resolveCors(req: NextRequest): {
  allowed: boolean;
  origin: string | null;
  allowCredentials: boolean;
  allowMethods: string;
  allowHeaders: string;
} {
  const origin = req.headers.get("origin");
  const allowMethods = "GET, POST, PUT, DELETE, OPTIONS";
  const allowHeaders = "Content-Type, Authorization";

  if (process.env.NODE_ENV !== "production") {
    return {
      allowed: true,
      origin: "*",
      allowCredentials: false,
      allowMethods,
      allowHeaders,
    };
  }

  const whitelist = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const matched = origin && whitelist.includes(origin);

  return {
    allowed: Boolean(matched),
    origin: matched ? origin : null,
    allowCredentials: Boolean(matched),
    allowMethods,
    allowHeaders,
  };
}
