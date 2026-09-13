import { getParam, getParams } from "@/lib/utils/route-params";

describe("route-params", () => {
  describe("getParam", () => {
    it("awaits a single-param promise", async () => {
      await expect(getParam(Promise.resolve({ id: "abc" }))).resolves.toEqual({ id: "abc" });
    });

    it("preserves additional keys", async () => {
      await expect(getParam(Promise.resolve({ id: "1", extra: "x" }))).resolves.toEqual({
        id: "1",
        extra: "x",
      });
    });

    it("propagates rejection", async () => {
      await expect(getParam(Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    });
  });

  describe("getParams", () => {
    it("awaits a multi-param promise", async () => {
      await expect(getParams(Promise.resolve({ familyId: "f1", taskId: "t1" }))).resolves.toEqual({
        familyId: "f1",
        taskId: "t1",
      });
    });

    it("propagates rejection", async () => {
      await expect(getParams(Promise.reject(new Error("nope")))).rejects.toThrow("nope");
    });
  });
});
