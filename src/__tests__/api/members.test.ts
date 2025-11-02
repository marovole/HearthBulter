/**
 * Members API Tests
 * Unit tests for member management business logic
 */

import { z } from 'zod';

// 创建成员的验证 schema
const createMemberSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '无效的日期格式',
  }),
  height: z.number().min(30).max(250).optional(),
  weight: z.number().min(2).max(300).optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

describe('Member Management', () => {
  describe('createMemberSchema validation', () => {
    it('should accept valid member data', () => {
      const validData = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        height: 175,
        weight: 70,
      };

      const result = createMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('张三');
        expect(result.data.gender).toBe('MALE');
        expect(result.data.height).toBe(175);
        expect(result.data.weight).toBe(70);
      }
    });

    it('should accept optional fields', () => {
      const minimalData = {
        name: '李四',
        gender: 'FEMALE' as const,
        birthDate: '1995-06-15',
      };

      const result = createMemberSchema.safeParse(minimalData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.height).toBeUndefined();
        expect(result.data.weight).toBeUndefined();
        expect(result.data.avatar).toBeUndefined();
        expect(result.data.role).toBeUndefined();
      }
    });

    it('should reject name less than 2 characters', () => {
      const invalidData = {
        name: '李',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
      };

      const result = createMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.errors[0].message).toBe('姓名至少需要2个字符');
      }
    });

    it('should reject invalid gender', () => {
      const invalidData = {
        name: '张三',
        gender: 'UNKNOWN',
        birthDate: '1990-01-01',
      };

      const result = createMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid birthDate format', () => {
      const invalidData = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: 'not-a-date',
      };

      const result = createMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.errors[0].message).toBe('无效的日期格式');
      }
    });

    it('should reject height out of range', () => {
      const invalidDataTooLow = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        height: 20,
      };

      const result1 = createMemberSchema.safeParse(invalidDataTooLow);
      expect(result1.success).toBe(false);

      const invalidDataTooHigh = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        height: 300,
      };

      const result2 = createMemberSchema.safeParse(invalidDataTooHigh);
      expect(result2.success).toBe(false);
    });

    it('should reject weight out of range', () => {
      const invalidDataTooLow = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        weight: 1,
      };

      const result1 = createMemberSchema.safeParse(invalidDataTooLow);
      expect(result1.success).toBe(false);

      const invalidDataTooHigh = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        weight: 350,
      };

      const result2 = createMemberSchema.safeParse(invalidDataTooHigh);
      expect(result2.success).toBe(false);
    });

    it('should reject invalid avatar URL', () => {
      const invalidData = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        avatar: 'not-a-url',
      };

      const result = createMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid avatar URL', () => {
      const validData = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        avatar: 'https://example.com/avatar.jpg',
      };

      const result = createMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept ADMIN role', () => {
      const validData = {
        name: '管理员',
        gender: 'MALE' as const,
        birthDate: '1980-01-01',
        role: 'ADMIN' as const,
      };

      const result = createMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.role).toBe('ADMIN');
      }
    });

    it('should accept MEMBER role', () => {
      const validData = {
        name: '普通成员',
        gender: 'FEMALE' as const,
        birthDate: '1990-01-01',
        role: 'MEMBER' as const,
      };

      const result = createMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.role).toBe('MEMBER');
      }
    });

    it('should reject invalid role', () => {
      const invalidData = {
        name: '张三',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        role: 'SUPERUSER',
      };

      const result = createMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept various date formats', () => {
      const testCases = [
        '1990-01-01',
        '1990/01/01',
        '2000-12-31',
        '1985-06-15',
      ];

      testCases.forEach((birthDate) => {
        const data = {
          name: '测试',
          gender: 'MALE' as const,
          birthDate,
        };

        const result = createMemberSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should handle edge case dates', () => {
      const edgeCases = [
        '1900-01-01', // Very old
        '2024-12-31', // Recent
        '2000-02-29', // Leap year
      ];

      edgeCases.forEach((birthDate) => {
        const data = {
          name: '测试',
          gender: 'MALE' as const,
          birthDate,
        };

        const result = createMemberSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should handle minimum valid height and weight', () => {
      const data = {
        name: '小宝宝',
        gender: 'MALE' as const,
        birthDate: '2024-01-01',
        height: 30, // minimum
        weight: 2, // minimum
      };

      const result = createMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle maximum valid height and weight', () => {
      const data = {
        name: '巨人',
        gender: 'MALE' as const,
        birthDate: '1990-01-01',
        height: 250, // maximum
        weight: 300, // maximum
      };

      const result = createMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Member data combinations', () => {
    it('should accept child data', () => {
      const childData = {
        name: '小明',
        gender: 'MALE' as const,
        birthDate: '2020-01-01',
        height: 100,
        weight: 18,
      };

      const result = createMemberSchema.safeParse(childData);
      expect(result.success).toBe(true);
    });

    it('should accept teenager data', () => {
      const teenData = {
        name: '小红',
        gender: 'FEMALE' as const,
        birthDate: '2010-01-01',
        height: 160,
        weight: 50,
      };

      const result = createMemberSchema.safeParse(teenData);
      expect(result.success).toBe(true);
    });

    it('should accept adult data', () => {
      const adultData = {
        name: '张先生',
        gender: 'MALE' as const,
        birthDate: '1985-01-01',
        height: 175,
        weight: 70,
        role: 'ADMIN' as const,
      };

      const result = createMemberSchema.safeParse(adultData);
      expect(result.success).toBe(true);
    });

    it('should accept elderly data', () => {
      const elderlyData = {
        name: '李奶奶',
        gender: 'FEMALE' as const,
        birthDate: '1950-01-01',
        height: 155,
        weight: 55,
      };

      const result = createMemberSchema.safeParse(elderlyData);
      expect(result.success).toBe(true);
    });
  });
});
