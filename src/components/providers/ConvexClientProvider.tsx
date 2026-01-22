"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useState, useEffect, createContext, useContext } from "react";

// ============================================================
// Convex Ready Context - 让子组件检测 Convex 是否就绪
// ============================================================
interface ConvexReadyContextValue {
  isReady: boolean;
  isLoading: boolean;
}

const ConvexReadyContext = createContext<ConvexReadyContextValue>({
  isReady: false,
  isLoading: true,
});

export function useConvexReady(): ConvexReadyContextValue {
  return useContext(ConvexReadyContext);
}

// ============================================================
// ConvexClientProvider - SSR-Safe Convex Real-time Provider
// ============================================================
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convexClient, setConvexClient] = useState<ConvexReactClient | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [initError, setInitError] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set.");
      }
      setInitError(true);
      return;
    }

    try {
      const client = new ConvexReactClient(convexUrl);
      setConvexClient(client);
    } catch (error) {
      console.error("[ConvexClientProvider] Failed to initialize:", error);
      setInitError(true);
    }
  }, []);

  const isReady = isClient && convexClient !== null;
  const isLoading = isClient && !convexClient && !initError;

  // SSR 或 Convex 未配置时,仍然需要提供 Context
  if (!isClient || !convexClient) {
    return (
      <ConvexReadyContext.Provider value={{ isReady: false, isLoading: !initError }}>
        {children}
      </ConvexReadyContext.Provider>
    );
  }

  return (
    <ConvexReadyContext.Provider value={{ isReady, isLoading }}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ConvexReadyContext.Provider>
  );
}
