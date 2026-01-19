import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";

export type AppSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role?: string;
  };
};

export async function auth(): Promise<AppSession | null> {
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
