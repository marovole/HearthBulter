import {
  formatDate,
  addDays,
  subtractDays,
  isToday,
  isYesterday,
  getWeekStart,
  getWeekEnd,
  calculateAge,
} from "@/lib/utils/date-utils";

describe("date-utils", () => {
  describe("formatDate", () => {
    it("formats a date with the default YYYY-MM-DD pattern", () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    });

    it("pads single-digit month, day and time components", () => {
      expect(formatDate(new Date(2026, 2, 7, 4, 3, 9), "YYYY-MM-DD HH:mm:ss")).toBe(
        "2026-03-07 04:03:09"
      );
    });

    it("substitutes every recognised token", () => {
      expect(formatDate(new Date(2026, 10, 20, 13, 45, 30), "DD/MM/YYYY HH:mm:ss")).toBe(
        "20/11/2026 13:45:30"
      );
    });

    it("throws on an invalid date", () => {
      expect(() => formatDate(new Date("nope"))).toThrow("Invalid date");
    });
  });

  describe("addDays / subtractDays", () => {
    it("adds days without mutating the input", () => {
      const base = new Date(2026, 0, 31);
      expect(formatDate(addDays(base, 1))).toBe("2026-02-01");
      expect(formatDate(base)).toBe("2026-01-31");
    });

    it("rolls back across a month boundary", () => {
      expect(formatDate(subtractDays(new Date(2026, 2, 1), 1))).toBe("2026-02-28");
    });

    it("handles negative amounts", () => {
      expect(formatDate(addDays(new Date(2026, 0, 10), -10))).toBe("2025-12-31");
    });
  });

  describe("isToday / isYesterday", () => {
    it("recognises the current day", () => {
      expect(isToday(new Date())).toBe(true);
      expect(isToday(addDays(new Date(), -1))).toBe(false);
    });

    it("recognises the previous day", () => {
      expect(isYesterday(addDays(new Date(), -1))).toBe(true);
      expect(isYesterday(new Date())).toBe(false);
    });
  });

  describe("getWeekStart / getWeekEnd", () => {
    it("starts the week on Monday and ends on Sunday", () => {
      // 2026-09-13 is a Sunday
      const sunday = new Date(2026, 8, 13);
      expect(formatDate(getWeekStart(sunday))).toBe("2026-09-07");
      expect(formatDate(getWeekEnd(sunday))).toBe("2026-09-13");
    });

    it("is stable for a mid-week date", () => {
      const wednesday = new Date(2026, 8, 9);
      expect(formatDate(getWeekStart(wednesday))).toBe("2026-09-07");
      expect(getWeekEnd(wednesday).getDay()).toBe(0);
    });
  });

  describe("calculateAge", () => {
    it("counts full years elapsed", () => {
      expect(calculateAge(new Date(1990, 0, 1), new Date(2026, 0, 1))).toBe(36);
    });

    it("does not count a birthday that has not arrived yet", () => {
      expect(calculateAge(new Date(1990, 11, 31), new Date(2026, 0, 1))).toBe(35);
    });

    it("does not count a birthday later in the same month", () => {
      expect(calculateAge(new Date(1990, 5, 20), new Date(2026, 5, 10))).toBe(35);
    });

    it("returns NaN for an invalid date", () => {
      expect(calculateAge(new Date("nope"))).toBeNaN();
    });
  });
});
