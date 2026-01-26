import {
  getFunctionName,
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
} from "convex/server";
import { convexToJson, jsonToConvex } from "convex/values";
import { api } from "../../convex/_generated/api";

type UdfResponseSuccess = {
  status: "success";
  value: unknown;
  logLines?: string[];
};

type UdfResponseError = {
  status: "error";
  errorMessage: string;
  errorData?: unknown;
  logLines?: string[];
};

type UdfResponse = UdfResponseSuccess | UdfResponseError;

class WorkersConvexHttpClient {
  private authToken: string | null = null;

  constructor(private readonly address: string) {}

  setAuth(token: string | null) {
    this.authToken = token;
  }

  async query<Query extends FunctionReference<"query">>(
    query: Query,
    args?: FunctionArgs<Query>
  ): Promise<FunctionReturnType<Query>> {
    return this.call("query", query, args);
  }

  async mutation<Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    args?: FunctionArgs<Mutation>
  ): Promise<FunctionReturnType<Mutation>> {
    return this.call("mutation", mutation, args);
  }

  async action<Action extends FunctionReference<"action">>(
    action: Action,
    args?: FunctionArgs<Action>
  ): Promise<FunctionReturnType<Action>> {
    return this.call("action", action, args);
  }

  private async call<T extends "query" | "mutation" | "action", Fn extends FunctionReference<T>>(
    type: T,
    fn: Fn,
    args?: FunctionArgs<Fn>
  ): Promise<FunctionReturnType<Fn>> {
    const name = getFunctionName(fn as unknown as Parameters<typeof getFunctionName>[0]);
    const body = JSON.stringify({
      path: name,
      format: "convex_encoded_json",
      args: [convexToJson((args ?? {}) as any)],
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Convex-Client": "health-butler",
    };
    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.address}/api/${type}`, {
      method: "POST",
      headers,
      body,
    });

    // Convex uses 560 for UDF errors; those are returned as JSON payloads.
    if (!response.ok && response.status !== 560) {
      let text = "";
      try {
        text = await response.text();
      } catch {
        text = "";
      }
      throw new Error(
        `Convex request failed (${response.status} ${response.statusText})${text ? `: ${text}` : ""}`
      );
    }

    let data: UdfResponse;
    try {
      data = (await response.json()) as UdfResponse;
    } catch (error) {
      const err = new Error(
        `Convex response was not valid JSON (${response.status} ${response.statusText})`
      );
      (err as any).cause = error;
      throw err;
    }
    if (data.status === "success") {
      return jsonToConvex(data.value as any) as FunctionReturnType<Fn>;
    }

    throw new Error(data.errorMessage || "Convex request failed");
  }
}

// Lazy initialization to avoid runtime errors when CONVEX_URL is not set
let _convexClient: WorkersConvexHttpClient | null = null;

export function getConvexClient(): WorkersConvexHttpClient {
  if (!_convexClient) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set. Convex features are unavailable.");
    }
    _convexClient = new WorkersConvexHttpClient(convexUrl);
  }
  return _convexClient;
}

function query<T>(query: FunctionReference<"query">, args?: Record<string, unknown>): Promise<T>;
function query<Query extends FunctionReference<"query">>(
  query: Query,
  args?: FunctionArgs<Query>
): Promise<FunctionReturnType<Query>>;
function query(query: any, args?: any) {
  return getConvexClient().query(query, args);
}

function mutation<T>(
  mutation: FunctionReference<"mutation">,
  args?: Record<string, unknown>
): Promise<T>;
function mutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  args?: FunctionArgs<Mutation>
): Promise<FunctionReturnType<Mutation>>;
function mutation(mutation: any, args?: any) {
  return getConvexClient().mutation(mutation, args);
}

function action<T>(action: FunctionReference<"action">, args?: Record<string, unknown>): Promise<T>;
function action<Action extends FunctionReference<"action">>(
  action: Action,
  args?: FunctionArgs<Action>
): Promise<FunctionReturnType<Action>>;
function action(action: any, args?: any) {
  return getConvexClient().action(action, args);
}

// Back-compat: keeps the existing `convexClient.query<T>(...)` call sites working.
export const convexClient = { query, mutation, action };

export { api };
