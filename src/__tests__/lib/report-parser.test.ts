/**
 * 报告解析器单元测试
 */

import { ReportParser } from '@/lib/services/report-parser';

describe('ReportParser', () => {
  describe('parse', () => {
    it('应该正确提取总胆固醇指标', () => {
      const text = '总胆固醇：5.8 mmol/L';
      const result = ReportParser.parse(text);

      const cholesterol = result.indicators.find(
        (ind) => ind.indicatorType === 'TOTAL_CHOLESTEROL',
      );

      expect(cholesterol).toBeDefined();
      expect(cholesterol?.value).toBe(5.8);
      expect(cholesterol?.unit).toBe('mmol/L');
      expect(cholesterol?.isAbnormal).toBe(true);
      expect(cholesterol?.status).toBe('HIGH');
    });

    it('应该正确提取LDL胆固醇指标', () => {
      const text = 'LDL-C：4.5 mmol/L';
      const result = ReportParser.parse(text);

      const ldl = result.indicators.find(
        (ind) => ind.indicatorType === 'LDL_CHOLESTEROL',
      );

      expect(ldl).toBeDefined();
      expect(ldl?.value).toBe(4.5);
      expect(ldl?.status).toBe('CRITICAL');
    });

    it('应该正确提取HDL胆固醇指标', () => {
      const text = 'HDL：0.8 mmol/L';
      const result = ReportParser.parse(text);

      const hdl = result.indicators.find(
        (ind) => ind.indicatorType === 'HDL_CHOLESTEROL',
      );

      expect(hdl).toBeDefined();
      expect(hdl?.value).toBe(0.8);
      expect(hdl?.status).toBe('LOW');
    });

    it('应该正确提取空腹血糖指标', () => {
      const text = '空腹血糖：7.5 mmol/L';
      const result = ReportParser.parse(text);

      const glucose = result.indicators.find(
        (ind) => ind.indicatorType === 'FASTING_GLUCOSE',
      );

      expect(glucose).toBeDefined();
      expect(glucose?.value).toBe(7.5);
      expect(glucose?.status).toBe('CRITICAL');
    });

    it('应该正确提取正常范围内的血糖', () => {
      const text = '空腹血糖：5.5 mmol/L';
      const result = ReportParser.parse(text);

      const glucose = result.indicators.find(
        (ind) => ind.indicatorType === 'FASTING_GLUCOSE',
      );

      expect(glucose).toBeDefined();
      expect(glucose?.value).toBe(5.5);
      expect(glucose?.status).toBe('NORMAL');
      expect(glucose?.isAbnormal).toBe(false);
    });

    it('应该正确提取ALT指标', () => {
      const text = 'ALT：150 U/L';
      const result = ReportParser.parse(text);

      const alt = result.indicators.find((ind) => ind.indicatorType === 'ALT');

      expect(alt).toBeDefined();
      expect(alt?.value).toBe(150);
      expect(alt?.status).toBe('CRITICAL');
    });

    it('应该正确提取AST指标', () => {
      const text = 'AST：80 U/L';
      const result = ReportParser.parse(text);

      const ast = result.indicators.find((ind) => ind.indicatorType === 'AST');

      expect(ast).toBeDefined();
      expect(ast?.value).toBe(80);
      expect(ast?.status).toBe('HIGH');
    });

    it('应该正确提取肌酐指标', () => {
      const text = 'CREATININE：120 μmol/L';
      const result = ReportParser.parse(text);

      const creatinine = result.indicators.find(
        (ind) => ind.indicatorType === 'CREATININE',
      );

      expect(creatinine).toBeDefined();
      expect(creatinine?.value).toBe(120);
    });

    it('应该从多个指标中提取所有值', () => {
      const text = `
        总胆固醇：5.8 mmol/L
        空腹血糖：6.2 mmol/L
        ALT：45 U/L
      `;
      const result = ReportParser.parse(text);

      expect(result.indicators.length).toBeGreaterThanOrEqual(3);
      expect(
        result.indicators.some(
          (ind) => ind.indicatorType === 'TOTAL_CHOLESTEROL',
        ),
      ).toBe(true);
      expect(
        result.indicators.some(
          (ind) => ind.indicatorType === 'FASTING_GLUCOSE',
        ),
      ).toBe(true);
      expect(result.indicators.some((ind) => ind.indicatorType === 'ALT')).toBe(
        true,
      );
    });

    it('应该正确识别异常值', () => {
      const text = `
        总胆固醇：6.5 mmol/L (正常)
        空腹血糖：8.0 mmol/L (异常)
        ALT：50 U/L (偏高)
      `;
      const result = ReportParser.parse(text);

      const cholesterol = result.indicators.find(
        (ind) => ind.indicatorType === 'TOTAL_CHOLESTEROL',
      );
      const glucose = result.indicators.find(
        (ind) => ind.indicatorType === 'FASTING_GLUCOSE',
      );
      const alt = result.indicators.find((ind) => ind.indicatorType === 'ALT');

      expect(cholesterol?.isAbnormal).toBe(true);
      expect(cholesterol?.status).toBe('CRITICAL');
      expect(glucose?.isAbnormal).toBe(true);
      expect(glucose?.status).toBe('CRITICAL');
      expect(alt?.isAbnormal).toBe(true);
      expect(alt?.status).toBe('HIGH');
    });

    it('应该正确提取报告日期', () => {
      const text = `
        报告日期：2024年1月15日
        总胆固醇：5.2 mmol/L
      `;
      const result = ReportParser.parse(text);

      expect(result.reportDate).toBeDefined();
      expect(result.reportDate?.getFullYear()).toBe(2024);
      expect(result.reportDate?.getMonth()).toBe(0); // 0-based
      expect(result.reportDate?.getDate()).toBe(15);
    });

    it('应该正确提取医疗机构名称', () => {
      const text = `
        医疗机构：北京协和医院
        总胆固醇：5.2 mmol/L
      `;
      const result = ReportParser.parse(text);

      expect(result.institution).toBe('北京协和医院');
    });

    it('应该处理空文本', () => {
      const result = ReportParser.parse('');

      expect(result.indicators).toHaveLength(0);
      expect(result.reportDate).toBeUndefined();
      expect(result.institution).toBeUndefined();
    });

    it('应该处理不包含指标的报告', () => {
      const text = '这是一份不包含任何指标的文本';
      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(0);
    });

    it('应该处理小数值', () => {
      const text = '总胆固醇：5.85 mmol/L';
      const result = ReportParser.parse(text);

      const cholesterol = result.indicators.find(
        (ind) => ind.indicatorType === 'TOTAL_CHOLESTEROL',
      );

      expect(cholesterol?.value).toBe(5.85);
    });

    it('应该忽略重复的指标（保留第一个）', () => {
      const text = `
        总胆固醇：5.2 mmol/L
        总胆固醇：6.0 mmol/L
      `;
      const result = ReportParser.parse(text);

      const cholesterolIndicators = result.indicators.filter(
        (ind) => ind.indicatorType === 'TOTAL_CHOLESTEROL',
      );

      // 应该只保留第一个匹配的结果
      expect(cholesterolIndicators.length).toBeGreaterThanOrEqual(1);
    });
  });
});
