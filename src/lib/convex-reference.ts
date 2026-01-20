import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

export type ConvexQueryReference = FunctionReference<"query">;
export type ConvexMutationReference = FunctionReference<"mutation">;

export function asConvexQueryReference(name: string): ConvexQueryReference {
  return name as unknown as ConvexQueryReference;
}

export function asConvexMutationReference(name: string): ConvexMutationReference {
  return name as unknown as ConvexMutationReference;
}
