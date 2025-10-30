/**
 * Invite System Tests
 * Unit tests for invitation code generation and validation
 */

/**
 * Generate random invite code
 * Avoids confusing characters like O, 0, I, 1, L
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // Removed: O, 0, I, 1, L
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Validate invite code format
 */
export function isValidInviteCode(code: string): boolean {
  if (typeof code !== 'string') return false
  if (code.length !== 8) return false

  const validChars = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/
  return validChars.test(code)
}

describe('Invite System', () => {
  describe('generateInviteCode', () => {
    it('should generate 8-character code', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(8)
    })

    it('should only use valid characters', () => {
      const code = generateInviteCode()
      const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/
      expect(code).toMatch(validChars)
    })

    it('should not contain confusing characters', () => {
      const code = generateInviteCode()
      // Should not contain O, 0, I, 1, L
      expect(code).not.toMatch(/[O0I1L]/)
    })

    it('should generate unique codes', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode())
      }
      // With 32 possible characters and 8 positions,
      // collision chance is extremely low for 100 codes
      expect(codes.size).toBeGreaterThan(95)
    })

    it('should generate uppercase codes only', () => {
      const code = generateInviteCode()
      expect(code).toBe(code.toUpperCase())
    })
  })

  describe('isValidInviteCode', () => {
    it('should accept valid 8-character codes', () => {
      expect(isValidInviteCode('ABCD2345')).toBe(true)
      expect(isValidInviteCode('XYZ89ABC')).toBe(true)
      expect(isValidInviteCode('AAAA2222')).toBe(true)
    })

    it('should reject codes with wrong length', () => {
      expect(isValidInviteCode('ABC123')).toBe(false) // Too short
      expect(isValidInviteCode('ABCD12345')).toBe(false) // Too long
      expect(isValidInviteCode('')).toBe(false) // Empty
    })

    it('should reject codes with invalid characters', () => {
      expect(isValidInviteCode('ABCD123O')).toBe(false) // Contains O
      expect(isValidInviteCode('ABCD1230')).toBe(false) // Contains 0
      expect(isValidInviteCode('ABCD123I')).toBe(false) // Contains I
      expect(isValidInviteCode('ABCD123L')).toBe(false) // Contains L
      expect(isValidInviteCode('abcd1234')).toBe(false) // Lowercase
      expect(isValidInviteCode('ABCD-234')).toBe(false) // Special char
      expect(isValidInviteCode('ABCD 234')).toBe(false) // Space
    })

    it('should reject non-string inputs', () => {
      expect(isValidInviteCode(null as any)).toBe(false)
      expect(isValidInviteCode(undefined as any)).toBe(false)
      expect(isValidInviteCode(12345678 as any)).toBe(false)
      expect(isValidInviteCode({} as any)).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isValidInviteCode('abcd2345')).toBe(false)
      expect(isValidInviteCode('Abcd2345')).toBe(false)
      expect(isValidInviteCode('ABCD2345')).toBe(true)
    })
  })

  describe('Code collision probability', () => {
    it('should have low collision rate', () => {
      // With 32 characters and 8 positions: 32^8 = 1,099,511,627,776 possibilities
      // Generating 1000 codes should have negligible collision probability
      const codes = new Set<string>()
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        codes.add(generateInviteCode())
      }

      // We expect at least 99% unique codes
      expect(codes.size).toBeGreaterThanOrEqual(iterations * 0.99)
    })
  })

  describe('Code format consistency', () => {
    it('should always produce valid format', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode()
        expect(isValidInviteCode(code)).toBe(true)
      }
    })

    it('should be URL-safe', () => {
      const code = generateInviteCode()
      const encoded = encodeURIComponent(code)
      expect(encoded).toBe(code) // Should not need encoding
    })
  })
})
