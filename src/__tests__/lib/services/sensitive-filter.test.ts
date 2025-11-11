/**
 * Sensitive Filter Service 测试
 * 服务层测试 - 核心业务逻辑覆盖
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { sensitiveFilter, type FilterResult, type SensitiveInfoPattern, type FilterOptions } from '@/lib/services/sensitive-filter';

describe('SensitiveFilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filter - Basic Filtering', () => {
    it('should filter ID card numbers', () => {
      const text = '我的身份证号是11010519491231002X，请查收。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***身份证号已隐藏***');
      expect(result.filteredText).not.toContain('11010519491231002X');
      expect(result.detectedItems.some(item => item.type === 'id_card')).toBe(true);
    });

    it('should filter multiple ID card numbers', () => {
      const text = '父亲：11010519491231002X，母亲：320113195006152223。';
      const result = sensitiveFilter.filter(text);

      expect(result.detectedItems.length).toBe(2);
      expect(result.filteredText.split('***').length - 1).toBeGreaterThanOrEqual(2);
    });

    it('should filter 15-digit ID cards', () => {
      const text = '旧身份证号：110105491231002。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems.some(item => item.type === 'id_card')).toBe(true);
    });

    it('should filter Chinese mobile phones', () => {
      const text = '联系电话：13812345678，请及时联系。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***手机号已隐藏***');
      expect(result.detectedItems.some(item => item.type === 'phone')).toBe(true);
    });

    it('should filter landline numbers', () => {
      const text = '座机：010-12345678，总机。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***电话已隐藏***');
    });

    it('should filter email addresses', () => {
      const text = '邮箱：zhangsan@example.com，请查收邮件。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***邮箱已隐藏***');
      expect(result.detectedItems.some(item => item.type === 'email')).toBe(true);
    });

    it('should filter addresses', () => {
      const text = '地址：北京市朝阳区建国路88号院7号楼。';
      const result = sensitiveFilter.filter(text, { maskMode: 'full' });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***地址信息已隐藏***');
      expect(result.detectedItems.some(item => item.type === 'address')).toBe(true);
    });

    it('should filter medical record numbers', () => {
      const text = '病历号：JH2023001234，请携带就诊。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***病历号已隐藏***');
      expect(result.detectedItems.some(item => item.type === 'medical_record')).toBe(true);
    });

    it('should filter ages', () => {
      const text = '年龄：45岁';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***年龄已隐藏***');
    });

    it('should filter names', () => {
      const text = '患者姓名：张三';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***姓名已隐藏***');
    });

    it('should handle text without sensitive info', () => {
      const text = '今天天气很好，心情不错。';
      const result = sensitiveFilter.filter(text);

      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.filteredText).toBe(text);
      expect(result.detectedItems).toHaveLength(0);
      expect(result.riskLevel).toBe('none');
    });

    it('should handle empty text', () => {
      const result = sensitiveFilter.filter('');

      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.filteredText).toBe('');
    });

    it('should handle null text', () => {
      const result = sensitiveFilter.filter(null as any);

      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.hasSensitiveInfo).toBe(false);
    });

    it('should handle non-string input', () => {
      const result = sensitiveFilter.filter(123 as any);

      expect(result.hasSensitiveInfo).toBe(false);
      expect(result.originalText).toBe(123);
    });
  });

  describe('filter - Mask Modes', () => {
    const text = '身份证号11010519491231002X，电话13812345678。';

    it('should use redact mode by default', () => {
      const result = sensitiveFilter.filter(text);

      expect(result.filteredText).not.toContain('11010519491231002X');
      expect(result.filteredText).toContain('***');
    });

    it('should use full replacement in maskMode=full', () => {
      const result = sensitiveFilter.filter(text, { maskMode: 'full' });

      expect(result.filteredText).toContain('*'.repeat(20));
    });

    it('should use partial mask in maskMode=partial', () => {
      const result = sensitiveFilter.filter(text, { maskMode: 'partial' });

      expect(result.filterededText).toContain('110105****002X');
    });

    it('should use unique masks for different types', () => {
      const result = sensitiveFilter.filter(text, { maskMode: 'partial' });

      expect(result.filteredText).toContain('110105****002X');
      expect(result.filteredText).toContain('138****5678');
    });
  });

  describe('filter - Filtering Options', () => {
    const text = '身份证号11010519491231002X，电话13812345678，邮箱zhangsan@example.com。';

    it('should filter only included types', () => {
      const result = sensitiveFilter.filter(text, {
        includeTypes: ['id_card'],
      });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.detectedItems.every(item => item.type === 'id_card')).toBe(true);
      expect(result.filteredText).not.toContain('11010519491231002X');
      expect(result.filteredText).toContain('138');
    });

    it('should exclude specified types', () => {
      const result = sensitiveFilter.filter(text, {
        excludeTypes: ['phone', 'email'],
      });

      expect(result.detectedItems.every(item => item.type === 'id_card')).toBe(true);
      const phoneItem = result.detectedItems.find(item => item.type === 'phone');
      expect(phoneItem).toBeUndefined();
    });

    it('should use custom patterns', () => {
      const customPattern: SensitiveInfoPattern = {
        type: 'custom',
        pattern: /VIP12345/g,
        replacement: '***VIP隐藏***',
        description: 'VIP编号',
        severity: 'medium',
      };

      const result = sensitiveFilter.filter('我的VIP编号是VIP12345', {
        customPatterns: [customPattern],
      });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***VIP隐藏***');
      const customItem = result.detectedItems.find(item => item.type === 'custom');
      expect(customItem).toBeDefined();
      expect(customItem?.severity).toBe('medium');
    });

    it('should use preserveStructure mode', () => {
      const result = sensitiveFilter.filter('患者姓名：张三，年龄45岁', {
        preserveStructure: true,
        maskMode: 'full',
      });

      expect(result.filteredText).toContain('[患者姓名]');
      expect(result.filteredText).toContain('[年龄]');
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return none for no detected items', () => {
      const result = sensitiveFilter.filter('今天天气很好');
      expect(result.riskLevel).toBe('none');
    });

    it('should return critical for critical items', () => {
      const result = sensitiveFilter.filter('身份证号11010519491231002X');
      expect(result.riskLevel).toBe('critical');
    });

    it('should return high for high severity items', () => {
      const result = sensitiveFilter.filter('电话13812345678');
      expect(result.riskLevel).toBe('high');
    });

    it('should return medium for medium severity items', () => {
      const result = sensitiveFilter.filter('邮箱zhangsan@example.com');
      expect(result.riskLevel).toBe('medium');
    });

    it('should return low for low severity items', () => {
      // Assuming we create a low severity pattern
      expect(result.riskLevel).toMatch(/low|medium/);
    });

    it('should prioritize critical over others', () => {
      const result = sensitiveFilter.filter('身份证号11010519491231002X，邮箱test@example.com');
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('detect', () => {
    it('should detect sensitive info without filtering', () => {
      const text = '身份证号11010519491231002X';
      const result = sensitiveFilter.detect(text);

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.originalText).toBe(text);
      expect(result.filteredText).toBeUndefined();
      expect(result.riskLevel).toBe('critical');
    });

    it('should return correct structure', () => {
      const result = sensitiveFilter.detect('身份证号11010519491231002X');

      expect(result).toHaveProperty('originalText');
      expect(result).toHaveProperty('detectedItems');
      expect(result).toHaveProperty('hasSensitiveInfo');
      expect(result).toHaveProperty('riskLevel');
      expect(result).not.toHaveProperty('filteredText');
    });
  });

  describe('validateFilter', () => {
    it('should return true for valid filtered text', () => {
      const original = '身份证号11010519491231002X';
      const filtered = sensitiveFilter.filter(original).filteredText;
      const isValid = sensitiveFilter.validateFilter(original, filtered);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid filtered text', () => {
      const original = '身份证号11010519491231002X';
      const isValid = sensitiveFilter.validateFilter(original, '身份证号11010519491231002X');

      expect(isValid).toBe(false);
    });
  });

  describe('Pattern Management', () => {
    it('should add custom patterns', () => {
      sensitiveFilter.addPattern({
        type: 'custom',
        pattern: /TOKEN[A-Z0-9]{6}/g,
        replacement: '***TOKEN***',
        description: 'API Token',
        severity: 'high',
      });

      const result = sensitiveFilter.filter('Token: TOKENABCDEF');
      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).toContain('***TOKEN***');
    });

    it('should remove patterns', () => {
      // First check pattern works
      let result = sensitiveFilter.filter('地址：北京市朝阳区', {
        maskMode: 'full',
      });
      expect(result.hasSensitiveInfo).toBe(true);

      sensitiveFilter.removePattern('address');

      // After removal, should not detect
      result = sensitiveFilter.filter('地址：北京市朝阳区', {
        maskMode: 'full',
      });
      expect(result.hasSensitiveInfo).toBe(false);
    });

    it('should get all patterns', () => {
      const patterns = sensitiveFilter.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'id_card')).toBe(true);
    });
  });

  describe('Duplicate Detection and Priority', () => {
    it('should handle overlapping patterns with priority', () => {
      const text = '身份证号11010519491231002X';
      const result = sensitiveFilter.filter(text);

      // Should only detect as ID card, not bank account
      expect(result.detectedItems.filter(item => item.type === 'id_card').length).toBe(1);
    });

    it('should handle multiple matches of same type', () => {
      const text = '电话1：13812345678，电话2：13987654321';
      const result = sensitiveFilter.filter(text);

      expect(result.detectedItems.filter(item => item.type === 'phone').length).toBe(2);
    });
  });

  describe('Real-world Medical Report Scenarios', () => {
    it('should filter complete medical report', () => {
      const report = `
        患者姓名：张三
        性别：男 年龄：45岁
        身份证号：11010519491231002X
        联系电话：13812345678
        地址：北京市朝阳区建国路88号
        病历号：JH2023001234
        诊断结果：高血压
      `;

      const result = sensitiveFilter.filter(report, { maskMode: 'full' });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.riskLevel).toBe('critical');
      expect(result.detectedItems.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle AI conversation sanitization', () => {
      const conversation = `
        用户：我叫李四，今年32岁。
        AI：好的，李四先生。
        用户：我的手机号是13812345678。
        AI：已记录您的联系方式。
      `;

      const result = sensitiveFilter.filter(conversation, { maskMode: 'partial' });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.filteredText).not.toContain('李四');
      expect(result.filteredText).not.toContain('138');
    });

    it('should preserve medical content while filtering PII', () => {
      const content = `
        患者张三，男，45岁。身份证11010519491231002X。
        诊断：高血压，建议每日测量血压。
        检查项目：血常规、尿常规、心电图正常。
        用药：降压药，每日一次。
      `;

      const result = sensitiveFilter.filter(content, {
        preserveStructure: true,
        maskMode: 'full',
      });

      expect(result.filteredText).not.toContain('张三');
      expect(result.filteredText).not.toContain('身份证号');
      expect(result.filteredText).toContain('高血压');
      expect(result.filteredText).toContain('血常规');
      expect(result.filteredText).toContain('降压药');
    });

    it('should handle social sharing content', () => {
      const shareContent = `
        今天去体检了，一切正常！
        姓名：王五
        年龄：28岁
        身份证号：123456789012345678
        联系电话：18611112222
      `;

      const result = sensitiveFilter.filter(shareContent, { maskMode: 'full' });

      expect(result.hasSensitiveInfo).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('Performance with Large Texts', () => {
    it('should handle large documents efficiently', () => {
      const largeText = '身份证号11010519491231002X\n'.repeat(100);
      const start = Date.now();

      const result = sensitiveFilter.filter(largeText);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.detectedItems.length).toBe(100);
    });
  });
});
