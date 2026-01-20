import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Lazy initialization to avoid build-time errors when CONVEX_URL is not set
let _convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!_convexClient) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Convex features are unavailable.");
    }
    _convexClient = new ConvexHttpClient(convexUrl);
  }
  return _convexClient;
}

// For backward compatibility - will throw at runtime if CONVEX_URL is not set
export const convexClient = {
  query: <T>(
    ...args: [query: Parameters<ConvexHttpClient["query"]>[0], ...rest: unknown[]]
  ): Promise<T> => getConvexClient().query(args[0], args[1] as never) as Promise<T>,
  mutation: <T>(
    ...args: [mutation: Parameters<ConvexHttpClient["mutation"]>[0], ...rest: unknown[]]
  ): Promise<T> => getConvexClient().mutation(args[0], args[1] as never) as Promise<T>,
  action: <T>(
    ...args: [action: Parameters<ConvexHttpClient["action"]>[0], ...rest: unknown[]]
  ): Promise<T> => getConvexClient().action(args[0], args[1] as never) as Promise<T>,
};

export { api };
