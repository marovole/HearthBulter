import { headers } from "next/headers";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role?: string;
  };
};

export async function auth(): Promise<AppSession | null> {
  // Cloudflare/OpenNext may run API routes in an environment where Clerk server helpers
  // cannot read secrets; we pass the authenticated userId from middleware via header.
  try {
    const userIdFromMiddleware = headers().get("x-auth-user-id");
    if (userIdFromMiddleware) {
      return {
        user: {
          id: userIdFromMiddleware,
          email: null,
          name: null,
          role: "USER",
        },
      };
    }
  } catch {
    // headers() not available outside request scope
  }

  try {
    const { auth: clerkAuth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await clerkAuth();
    if (!userId) {
      return null;
    }

    const user = await currentUser();

    return {
      user: {
        id: userId,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        name: user?.fullName ?? user?.firstName ?? null,
        role: "USER",
      },
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function testAuthSystem() {
  try {
    const session = await auth();
    return {
      healthy: !!session,
      user: session?.user ?? null,
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      user: null,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

export function checkAuthConfiguration() {
  const issues: string[] = [];
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey) {
    issues.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 未设置");
  }

  if (!secretKey) {
    issues.push("CLERK_SECRET_KEY 未设置");
  }

  return {
    configured: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}
