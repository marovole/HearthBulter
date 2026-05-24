// API 测试前置环境变量（当前架构：Convex + Clerk）
process.env.NEXT_PUBLIC_CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://test-convex.convex.cloud";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "sk_test_placeholder";
