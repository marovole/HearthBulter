"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useState, useEffect } from "react";

// ============================================================
// ConvexClientProvider - SSR-Safe Convex Real-time Provider
// ============================================================
// 关键设计:
// 1. 使用 useState + useEffect 确保 ConvexReactClient 只在客户端初始化
// 2. 服务端渲染时返回 children 直接渲染,避免 Worker 环境异常
// 3. 优雅降级:无 CONVEX_URL 时功能正常,仅禁用实时特性
// ============================================================

/**
 * ConvexClientProvider - Optional Convex real-time provider
 *
 * This provider wraps children with Convex context when NEXT_PUBLIC_CONVEX_URL
 * is configured. If not configured, children are rendered directly without
 * Convex features (graceful degradation).
 *
 * SSR Safety: ConvexReactClient is only instantiated in browser environment
 * to prevent Cloudflare Workers from throwing exceptions during server-side
 * rendering.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // 使用 useState 延迟初始化,确保只在客户端创建 ConvexReactClient
  const [convexClient, setConvexClient] = useState<ConvexReactClient | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 标记已在客户端环境
    setIsClient(true);

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set. " +
            "Convex real-time features are disabled."
        );
      }
      return;
    }

    // 仅在客户端创建 Convex 客户端实例
    try {
      const client = new ConvexReactClient(convexUrl);
      setConvexClient(client);
    } catch (error) {
      console.error("[ConvexClientProvider] Failed to initialize Convex client:", error);
    }
  }, []);

  // SSR 阶段或客户端初始化前,直接渲染 children
  // 这避免了 Cloudflare Workers 在服务端渲染时执行 Convex 代码
  if (!isClient || !convexClient) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
