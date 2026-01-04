/**
 * Validation Tests
 * Unit tests for validation functions
 */

import {
  validateRegistration,
  isValidEmail,
  isStrongPassword,
  sanitizeString,
  registerSchema,
  memberSchema,
  healthGoalSchema,
  allergySchema,
} from '@/lib/validation';

describe('Validation Functions', () => {
  describe('validateRegistration', () => {
    it('should accept valid registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
      };

      const result = validateRegistration(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should trim and lowercase email', () => {
      const data = {
        name: 'John Doe',
        email: '  JOHN@EXAMPLE.COM  ',
        password: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should trim name', () => {
      const data = {
        name: '  John Doe  ',
        email: 'john@example.com',
        password: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should reject empty name', () => {
      const data = {
        name: '',
        email: 'john@example.com',
        password: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const data = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });

    it('should reject weak password (too short)', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass1',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });

    it('should reject password without letters', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '12345678',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });

    it('should reject password without numbers', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });

    it('should reject very long name', () => {
      const data = {
        name: 'A'.repeat(51),
        email: 'john@example.com',
        password: 'Password123',
      };

      const result = validateRegistration(data);

      expect(result.success).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong passwords', () => {
      expect(isStrongPassword('Password123')).toBe(true);
      expect(isStrongPassword('MyPass123word')).toBe(true);
      expect(isStrongPassword('12345Abc')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isStrongPassword('short1')).toBe(false); // Too short
      expect(isStrongPassword('12345678')).toBe(false); // No letters
      expect(isStrongPassword('Password')).toBe(false); // No numbers
      expect(isStrongPassword('')).toBe(false); // Empty
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeString('Hello<script>alert(1)</script>')).toBe(
        'Helloscriptalert(1)/script',
      );
    });

    it('should limit length', () => {
      const longString = 'A'.repeat(1500);
      const result = sanitizeString(longString);

      expect(result.length).toBe(1000);
    });
  });

  describe('memberSchema', () => {
    it('should accept valid member data', () => {
      const validData = {
        name: 'John Doe',
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        height: 175,
        weight: 70,
      };

      const result = memberSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should accept optional height and weight', () => {
      const validData = {
        name: 'John Doe',
        gender: 'FEMALE',
        birthDate: new Date('1995-06-15'),
      };

      const result = memberSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid gender', () => {
      const invalidData = {
        name: 'John Doe',
        gender: 'OTHER',
        birthDate: new Date('1990-01-01'),
      };

      const result = memberSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject height out of range', () => {
      const invalidData = {
        name: 'John Doe',
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        height: 300,
      };

      const result = memberSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject weight out of range', () => {
      const invalidData = {
        name: 'John Doe',
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        weight: 10,
      };

      const result = memberSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('healthGoalSchema', () => {
    it('should accept valid health goal data', () => {
      const validData = {
        goalType: 'LOSE_WEIGHT',
        targetWeight: 70,
        targetWeeks: 12,
        activityLevel: 'MODERATE',
        carbRatio: 0.5,
        proteinRatio: 0.2,
        fatRatio: 0.3,
      };

      const result = healthGoalSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should use default ratios if not provided', () => {
      const validData = {
        goalType: 'MAINTAIN',
        activityLevel: 'LIGHT',
      };

      const result = healthGoalSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.carbRatio).toBe(0.5);
        expect(result.data.proteinRatio).toBe(0.2);
        expect(result.data.fatRatio).toBe(0.3);
      }
    });

    it('should reject invalid goal type', () => {
      const invalidData = {
        goalType: 'INVALID_TYPE',
        activityLevel: 'MODERATE',
      };

      const result = healthGoalSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject target weeks out of range', () => {
      const invalidData = {
        goalType: 'LOSE_WEIGHT',
        targetWeeks: 100,
        activityLevel: 'MODERATE',
      };

      const result = healthGoalSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject ratio out of range', () => {
      const invalidData = {
        goalType: 'LOSE_WEIGHT',
        activityLevel: 'MODERATE',
        carbRatio: 1.5,
      };

      const result = healthGoalSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('allergySchema', () => {
    it('should accept valid allergy data', () => {
      const validData = {
        allergenType: 'FOOD',
        allergenName: '花生',
        severity: 'SEVERE',
        description: '接触后出现呼吸困难',
      };

      const result = allergySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should accept optional description', () => {
      const validData = {
        allergenType: 'ENVIRONMENTAL',
        allergenName: '花粉',
        severity: 'MILD',
      };

      const result = allergySchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid allergen type', () => {
      const invalidData = {
        allergenType: 'UNKNOWN',
        allergenName: '花生',
        severity: 'SEVERE',
      };

      const result = allergySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty allergen name', () => {
      const invalidData = {
        allergenType: 'FOOD',
        allergenName: '',
        severity: 'MODERATE',
      };

      const result = allergySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject very long description', () => {
      const invalidData = {
        allergenType: 'MEDICATION',
        allergenName: '青霉素',
        severity: 'LIFE_THREATENING',
        description: 'A'.repeat(501),
      };

      const result = allergySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});
