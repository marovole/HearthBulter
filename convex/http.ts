import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Add Convex Auth routes (JWKS, OpenID Connect, OAuth callbacks)
auth.addHttpRoutes(http);

/**
 * Health check endpoint
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "health-butler-convex",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

/**
 * Webhook for e-commerce platform order updates
 */
http.route({
  path: "/webhooks/ecommerce/order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const platform = request.headers.get("X-Platform") ?? "unknown";
      const signature = request.headers.get("X-Signature");

      // TODO: Verify webhook signature based on platform

      console.log(`Received order webhook from ${platform}:`, body);

      // Process the order update
      // await ctx.runMutation(api.ecommerce.processOrderWebhook, {
      //   platform,
      //   data: body,
      // });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Webhook processing failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Webhook for device sync callbacks
 */
http.route({
  path: "/webhooks/devices/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const deviceType = request.headers.get("X-Device-Type") ?? "unknown";

      console.log(`Received device sync from ${deviceType}:`, body);

      // Process device data
      // await ctx.runMutation(api.devices.processSyncData, {
      //   deviceType,
      //   data: body,
      // });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Device sync error:", error);
      return new Response(
        JSON.stringify({ error: "Sync processing failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Public API for shared shopping list
 */
http.route({
  path: "/api/shared-list/:token",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const token = pathParts[pathParts.length - 1];

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const list = await ctx.runQuery(api.shoppingLists.getByShareToken, { token });

      if (!list) {
        return new Response(
          JSON.stringify({ error: "List not found or expired" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Increment view count
      await ctx.runMutation(api.shoppingLists.incrementShareView, { token });

      return new Response(
        JSON.stringify(list),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );
    } catch (error) {
      console.error("Shared list error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get list" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Public API for shared health report
 */
http.route({
  path: "/api/shared-report/:token",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const token = pathParts[pathParts.length - 1];

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // TODO: Implement shared report lookup
      // const report = await ctx.runQuery(api.health.getSharedReport, { token });

      return new Response(
        JSON.stringify({ message: "Shared report endpoint - TODO" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Shared report error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get report" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
