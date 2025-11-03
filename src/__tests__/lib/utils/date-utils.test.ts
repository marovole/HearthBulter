/**
 * 日期工具函数测试
 */

import {
  formatDate,
  addDays,
  subtractDays,
  isToday,
  isYesterday,
  getWeekStart,
  getWeekEnd,
  calculateAge,
} from '@/lib/utils/date-utils';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
    });

    it('should handle different formats', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2024');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDate(new Date('invalid'), 'YYYY-MM-DD')).toThrow();
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('should handle negative days', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -3);
      expect(result.getDate()).toBe(12);
    });

    it('should not mutate original date', () => {
      const date = new Date('2024-01-15');
      addDays(date, 5);
      expect(date.getDate()).toBe(15);
    });
  });

  describe('subtractDays', () => {
    it('should subtract days correctly', () => {
      const date = new Date('2024-01-15');
      const result = subtractDays(date, 3);
      expect(result.getDate()).toBe(12);
    });

    it('should not mutate original date', () => {
      const date = new Date('2024-01-15');
      subtractDays(date, 3);
      expect(date.getDate()).toBe(15);
    });
  });

  describe('isToday', () => {
    it('should identify today correctly', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should identify non-today dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should identify yesterday correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should identify non-yesterday dates', () => {
      const today = new Date();
      expect(isYesterday(today)).toBe(false);
    });
  });

  describe('getWeekStart', () => {
    it('should return start of week (Monday)', () => {
      const wednesday = new Date('2024-01-17');
      const weekStart = getWeekStart(wednesday);
      expect(weekStart.getDay()).toBe(1);
      expect(weekStart.getDate()).toBe(15);
    });
  });

  describe('getWeekEnd', () => {
    it('should return end of week (Sunday)', () => {
      const wednesday = new Date('2024-01-17');
      const weekEnd = getWeekEnd(wednesday);
      expect(weekEnd.getDay()).toBe(0);
      expect(weekEnd.getDate()).toBe(21);
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const currentDate = new Date('2024-01-15');
      expect(calculateAge(birthDate, currentDate)).toBe(34);
    });

    it('should handle birthdays that have not occurred this year', () => {
      const birthDate = new Date('1990-12-15');
      const currentDate = new Date('2024-01-15');
      expect(calculateAge(birthDate, currentDate)).toBe(33);
    });

    it('should handle invalid dates', () => {
      const birthDate = new Date('invalid');
      const currentDate = new Date();
      expect(calculateAge(birthDate, currentDate)).toBeNaN();
    });
  });
});
