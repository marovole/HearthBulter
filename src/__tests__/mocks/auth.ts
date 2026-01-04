/**
 * Mock for @/lib/auth to avoid next-auth ES module issues in Jest
 */

// Mock auth function
export const auth = jest.fn().mockResolvedValue({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "USER",
  },
});

// Mock authOptions
export const authOptions = {
  providers: [],
  callbacks: {},
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
  },
};

// Mock getServerSession
export const getServerSession = jest.fn().mockResolvedValue({
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "USER",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

export default {
  auth,
  authOptions,
  getServerSession,
};
