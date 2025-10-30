import { sensitiveFilter, filterSensitiveInfo, hasSensitiveInfo, getSensitiveInfoRisk } from '@/lib/services/sensitive-filter';

describe('SensitiveFilterService', () => {
  describe('filter', () => {
    it('should filter Chinese ID card numbers', () => {
      const text = '患者身份证号是123456789012345678，年龄25岁。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems).toHaveLength(3); // 姓名、身份证号、年龄
      expect(result.filteredText).not.toContain('123456789012345678');
      expect(result.filteredText).not.toContain('25岁');
    });

    it('should filter phone numbers', () => {
      const text = '联系电话：13800138000 或 010-12345678';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems.some(item => item.type === 'phone')).toBe(true);
      expect(result.filteredText).not.toContain('13800138000');
      expect(result.filteredText).not.toContain('010-12345678');
    });

    it('should filter email addresses', () => {
      const text = '邮箱：patient@example.com';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).not.toContain('patient@example.com');
    });

    it('should filter address information', () => {
      const text = '地址：北京市朝阳区某某街道123号';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).not.toContain('北京市朝阳区');
    });

    it('should handle partial mask mode', () => {
      const text = '身份证：123456789012345678';
      const result = sensitiveFilter.filter(text, { maskMode: 'partial' });

      expect(result.filteredText).toContain('123456****5678');
      expect(result.filteredText).not.toContain('123456789012345678');
    });

    it('should preserve structure when requested', () => {
      const text = '患者张三，身份证123456789012345678';
      const result = sensitiveFilter.filter(text, { preserveStructure: true });

      expect(result.filteredText).toContain('[患者姓名]');
      expect(result.filteredText).toContain('[身份证号]');
      expect(result.filteredText).not.toContain('123456789012345678');
    });

    it('should calculate correct risk levels', () => {
      const criticalText = '身份证：123456789012345678';
      const highText = '电话：13800138000';
      const mediumText = '邮箱：test@example.com';
      const cleanText = '这是一个正常的句子。';

      expect(getSensitiveInfoRisk(criticalText)).toBe('critical');
      expect(getSensitiveInfoRisk(highText)).toBe('high');
      expect(getSensitiveInfoRisk(mediumText)).toBe('medium');
      expect(getSensitiveInfoRisk(cleanText)).toBe('none');
    });
  });

  describe('detect', () => {
    it('should detect sensitive information without filtering', () => {
      const text = '患者身份证：123456789012345678，电话13800138000';
      const result = sensitiveFilter.detect(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems.length).toBeGreaterThanOrEqual(2); // 至少包含身份证和电话
      expect(result.riskLevel).toBe('critical');
      // detect 不返回 filteredText
      expect(result).not.toHaveProperty('filteredText');
    });
  });

  describe('filterBatch', () => {
    it('should filter multiple texts', () => {
      const texts = [
        '身份证：123456789012345678',
        '电话：13800138000',
        '正常文本',
      ];

      const results = sensitiveFilter.filterBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].hasSensitiveInfo).toBe(true);
      expect(results[1].hasSensitiveInfo).toBe(true);
      expect(results[2].hasSensitiveInfo).toBe(false);
    });
  });

  describe('validateFilter', () => {
    it('should validate that filtered text has no sensitive info', () => {
      const originalText = '身份证：123456789012345678';
      const filteredText = sensitiveFilter.filter(originalText).filteredText;

      const isValid = sensitiveFilter.validateFilter(originalText, filteredText);
      expect(isValid).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('filterSensitiveInfo should work as standalone function', () => {
      const text = '身份证：123456789012345678';
      const result = filterSensitiveInfo(text);

      expect(result).not.toContain('123456789012345678');
      expect(result).toContain('***身份证号已隐藏***');
      expect(result).toContain('身份证：'); // 保持原文结构
    });

    it('hasSensitiveInfo should detect presence', () => {
      expect(hasSensitiveInfo('身份证：123456789012345678')).toBe(true);
      expect(hasSensitiveInfo('这是正常文本')).toBe(false);
    });
  });

  describe('custom patterns', () => {
    it('should support custom patterns', () => {
      const customPattern = {
        type: 'custom' as const,
        pattern: /secret\d+/g,
        replacement: '[SECRET]',
        description: 'Custom secret pattern',
        severity: 'high' as const,
      };

      sensitiveFilter.addPattern(customPattern);

      const text = '这是secret123和secret456';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems.some(item => item.type === 'custom')).toBe(true);
      expect(result.filteredText).toContain('[SECRET]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = sensitiveFilter.filter('');
      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.riskLevel).toBe('none');
    });

    it('should handle null/undefined', () => {
      expect(() => sensitiveFilter.filter(null as any)).not.toThrow();
      expect(() => sensitiveFilter.filter(undefined as any)).not.toThrow();
    });

    it('should handle overlapping matches', () => {
      const text = '身份证123456789012345678和13800138000';
      const result = sensitiveFilter.filter(text);

      expect(result.detectedItems.length).toBeGreaterThanOrEqual(1);
    });

    it('should exclude specified types', () => {
      const text = '身份证123456789012345678，邮箱test@example.com';
      const result = sensitiveFilter.filter(text, { excludeTypes: ['email'] });

      expect(result.detectedItems.some(item => item.type === 'id_card')).toBe(true);
      expect(result.detectedItems.every(item => item.type !== 'email')).toBe(true);
    });

    it('should include only specified types', () => {
      const text = '身份证123456789012345678，邮箱test@example.com';
      const result = sensitiveFilter.filter(text, { includeTypes: ['email'] });

      expect(result.detectedItems.some(item => item.type === 'id_card')).toBe(false);
      expect(result.detectedItems.some(item => item.type === 'email')).toBe(true);
    });
  });
});
