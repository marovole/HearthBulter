import { safeParseArray, safeParseObject } from "@/lib/utils/json-helpers";

describe("json-helpers", () => {
  describe("safeParseArray", () => {
    it("passes an existing array through untouched", () => {
      const input = [1, 2, 3];
      expect(safeParseArray(input)).toBe(input);
    });

    it("parses a JSON array string", () => {
      expect(safeParseArray('["a","b"]')).toEqual(["a", "b"]);
    });

    it("falls back for null and undefined", () => {
      expect(safeParseArray(null)).toEqual([]);
      expect(safeParseArray(undefined)).toEqual([]);
    });

    it("falls back for malformed JSON", () => {
      expect(safeParseArray("{not json")).toEqual([]);
    });

    it("rejects valid JSON that is not an array", () => {
      expect(safeParseArray('{"a":1}')).toEqual([]);
      expect(safeParseArray(42)).toEqual([]);
    });

    it("honours a custom fallback", () => {
      expect(safeParseArray(null, ["fallback"])).toEqual(["fallback"]);
    });
  });

  describe("safeParseObject", () => {
    it("passes an existing plain object through untouched", () => {
      const input = { a: 1 };
      expect(safeParseObject(input)).toBe(input);
    });

    it("parses a JSON object string", () => {
      expect(safeParseObject('{"a":1,"b":"two"}')).toEqual({ a: 1, b: "two" });
    });

    it("falls back for null and undefined", () => {
      expect(safeParseObject(null)).toEqual({});
      expect(safeParseObject(undefined)).toEqual({});
    });

    it("falls back for malformed JSON", () => {
      expect(safeParseObject("{nope")).toEqual({});
    });

    it("rejects arrays and primitives", () => {
      expect(safeParseObject([1, 2, 3])).toEqual({});
      expect(safeParseObject("plain string")).toEqual({});
      expect(safeParseObject('"a string"')).toEqual({});
    });

    it("honours a custom fallback", () => {
      expect(safeParseObject(null, { safe: true })).toEqual({ safe: true });
    });
  });
});
