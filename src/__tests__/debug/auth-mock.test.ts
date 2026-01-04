/**
 * Debug test to verify auth mock is working
 */

import { describe, it, expect } from "@jest/globals";
import { auth } from "@/lib/auth";

describe("Auth Mock Debug", () => {
  it("should use mocked auth", async () => {
    expect(auth).toBeDefined();
    expect(typeof auth).toBe("function");

    const result = await auth();
    expect(result).toHaveProperty("user");
    expect(result.user).toHaveProperty("id", "test-user-id");
  });
});
