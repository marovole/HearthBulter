"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

/**
 * ConvexClientProvider - Optional Convex real-time provider
 *
 * This provider wraps children with Convex context when NEXT_PUBLIC_CONVEX_URL
 * is configured. If not configured, children are rendered directly without
 * Convex features (graceful degradation).
 *
 * This allows the app to work with or without Convex real-time features.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexClient = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      // Convex is optional - log warning in development only
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[ConvexClientProvider] NEXT_PUBLIC_CONVEX_URL is not set. " +
            "Convex real-time features are disabled.",
        );
      }
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  // If Convex is not configured, render children directly
  if (!convexClient) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
