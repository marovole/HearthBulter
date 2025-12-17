/**
 * API 中间件单元测试
 *
 * 测试中间件的核心逻辑，不涉及实际的认证和服务
 */

import { NextRequest, NextResponse } from "next/server";
import { withMiddleware, MiddlewareResult } from "@/lib/middleware/compose";

describe("API Middleware Compose", () => {
  describe("withMiddleware", () => {
    it("should execute handler when middleware succeeds", async () => {
      const mockHandler = jest
        .fn()
        .mockResolvedValue(NextResponse.json({ data: "success" }));

      const mockMiddleware = jest.fn().mockResolvedValue({
        success: true,
        context: { userId: "user-123" },
      });

      const wrappedHandler = withMiddleware(mockMiddleware, mockHandler);
      const mockRequest = new NextRequest("http://localhost/api/test");

      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, {
        userId: "user-123",
      });
    });

    it("should return error response when middleware fails", async () => {
      const mockHandler = jest.fn();

      const errorResponse = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      const mockMiddleware = jest.fn().mockResolvedValue({
        success: false,
        response: errorResponse,
      });

      const wrappedHandler = withMiddleware(mockMiddleware, mockHandler);
      const mockRequest = new NextRequest("http://localhost/api/test");

      const result = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });

    it("should pass context from middleware to handler", async () => {
      let receivedContext: Record<string, unknown> | null = null;
      const mockHandler = jest.fn().mockImplementation((_req, ctx) => {
        receivedContext = ctx;
        return NextResponse.json({ ok: true });
      });

      const mockMiddleware = jest.fn().mockResolvedValue({
        success: true,
        context: {
          userId: "user-123",
          roles: ["admin"],
          permissions: { canEdit: true },
        },
      });

      const wrappedHandler = withMiddleware(mockMiddleware, mockHandler);
      const mockRequest = new NextRequest("http://localhost/api/test");

      await wrappedHandler(mockRequest);

      expect(receivedContext).toEqual({
        userId: "user-123",
        roles: ["admin"],
        permissions: { canEdit: true },
      });
    });
  });

  describe("MiddlewareResult type", () => {
    it("should allow success result with context", () => {
      const result: MiddlewareResult<{ userId: string }> = {
        success: true,
        context: { userId: "test-123" },
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userId).toBe("test-123");
      }
    });

    it("should allow failure result with response", () => {
      const result: MiddlewareResult<{ userId: string }> = {
        success: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(401);
      }
    });
  });
});
