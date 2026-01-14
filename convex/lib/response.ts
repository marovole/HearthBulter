import { ConvexError } from "convex/values";

/**
 * Unified response wrapper for Convex mutations and queries.
 */
export function apiSuccess<T>(data: T) {
  return {
    success: true as const,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Unified error thrower for Convex functions.
 */
export function apiError(message: string, code?: string) {
  throw new ConvexError({
    message,
    code: code || "INTERNAL_ERROR",
    timestamp: Date.now(),
  });
}
