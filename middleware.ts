import { NextResponse, type NextRequest } from "next/server";
import { rateLimiter } from "@/lib/middleware/rate-limit-middleware";

const AUTH_BYPASS = process.env.AUTH_BYPASS === "1";

function createRouteMatcher(patterns: string[]) {
  const regexes = patterns.map((pattern) => new RegExp(`^${pattern}$`));
  return (req: NextRequest) => regexes.some((regex) => regex.test(req.nextUrl.pathname));
}

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

async function handleRequest(req: NextRequest, getUserId: () => Promise<string | null>) {
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
    if ((pathname === "/" || pathname === "") && method === "GET") {
      const signedInUserId = await getUserId();
      if (signedInUserId) {
        let redirect = NextResponse.redirect(new URL("/dashboard", req.url));
        redirect = applyBasicSecurityHeaders(req, redirect, cors);
        return redirect;
      }
    }

    const requiresAuth =
      isProtectedRoute(req) || (pathname.startsWith("/api/") && !isPublicApiRoute(req));

    const userId = requiresAuth ? await getUserId() : null;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("x-auth-user-id");
    if (userId) {
      requestHeaders.set("x-auth-user-id", userId);
    }

    if (isProtectedRoute(req) && !userId) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    if (pathname.startsWith("/api/") && !isPublicApiRoute(req) && !userId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response = applyBasicSecurityHeaders(req, response, cors);

    let limit: Awaited<ReturnType<typeof rateLimiter.checkLimit>> | null = null;

    try {
      limit = await rateLimiter.checkLimit(req, {
        windowMs: 60_000,
        maxRequests: pathname.startsWith("/api/auth") ? 20 : 100,
        identifier: "ip",
        storage: "memory",
        message: "请求过于频繁",
      });
    } catch (limitError) {
      console.error("Rate limit check failed:", limitError);
      limit = null;
    }

    if (limit && !limit.allowed) {
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

    console.error("Middleware error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: "服务器内部错误",
        message: errorMessage,
        stack: process.env.NODE_ENV !== "production" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

const bypassHandler = async (req: NextRequest) => {
  return handleRequest(req, async () => req.headers.get("x-auth-user-id"));
};

let clerkHandler: ((req: NextRequest) => Promise<Response>) | null = null;

async function getClerkHandler(): Promise<(req: NextRequest) => Promise<Response>> {
  if (clerkHandler) {
    return clerkHandler;
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  clerkHandler = clerkMiddleware(async (auth: any, req: NextRequest) => {
    return handleRequest(req, async () => {
      try {
        const authResult = await auth();
        return authResult.userId ?? null;
      } catch (authError) {
        console.error("Middleware auth error:", authError);
        return null;
      }
    });
  }) as any;

  return clerkHandler!;
}

const middleware = AUTH_BYPASS
  ? bypassHandler
  : async (req: NextRequest) => {
      const handler = await getClerkHandler();
      return handler(req);
    };

export default middleware;

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
  _req: NextRequest,
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
