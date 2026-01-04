/**
 * 体检报告解析服务单元测试
 */

import { ReportParser } from '@/lib/services/report-parser';

describe('ReportParser', () => {
  describe('parse', () => {
    it('应该正确解析包含血脂指标的文本', () => {
      const text = `
        体检报告
        总胆固醇：5.2 mmol/L
        低密度脂蛋白：3.1 mmol/L
        高密度脂蛋白：1.2 mmol/L
        甘油三酯：1.5 mmol/L
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(4);
      expect(result.indicators[0]).toMatchObject({
        indicatorType: 'TOTAL_CHOLESTEROL',
        name: '总胆固醇',
        value: 5.2,
        unit: 'mmol/L',
        isAbnormal: false,
        status: 'NORMAL',
      });
      expect(result.indicators[1]).toMatchObject({
        indicatorType: 'LDL_CHOLESTEROL',
        name: '低密度脂蛋白胆固醇',
        value: 3.1,
        unit: 'mmol/L',
        isAbnormal: false,
        status: 'NORMAL',
      });
    });

    it('应该正确解析包含血糖指标的文本', () => {
      const text = `
        空腹血糖：6.5 mmol/L
        餐后血糖：8.2 mmol/L
        糖化血红蛋白：7.0%
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(3);

      const fastingGlucose = result.indicators.find(
        (i) => i.indicatorType === 'FASTING_GLUCOSE',
      );
      expect(fastingGlucose).toMatchObject({
        indicatorType: 'FASTING_GLUCOSE',
        name: '空腹血糖',
        value: 6.5,
        unit: 'mmol/L',
        isAbnormal: true,
        status: 'HIGH',
      });

      const hba1c = result.indicators.find(
        (i) => i.indicatorType === 'GLYCATED_HEMOGLOBIN',
      );
      expect(hba1c).toMatchObject({
        indicatorType: 'GLYCATED_HEMOGLOBIN',
        name: '糖化血红蛋白',
        value: 7.0,
        unit: '%',
        isAbnormal: true,
        status: 'HIGH',
      });
    });

    it('应该正确解析包含肝功能指标的文本', () => {
      const text = `
        肝功能检查
        ALT：45 U/L
        AST：38 U/L
        总胆红素：18.5 μmol/L
        直接胆红素：5.2 μmol/L
        碱性磷酸酶：120 U/L
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(5);

      const alt = result.indicators.find((i) => i.indicatorType === 'ALT');
      expect(alt).toMatchObject({
        indicatorType: 'ALT',
        name: '丙氨酸氨基转移酶',
        value: 45,
        unit: 'U/L',
        isAbnormal: true,
        status: 'HIGH',
      });

      const alp = result.indicators.find((i) => i.indicatorType === 'ALP');
      expect(alp).toMatchObject({
        indicatorType: 'ALP',
        name: '碱性磷酸酶',
        value: 120,
        unit: 'U/L',
        isAbnormal: false,
        status: 'NORMAL',
      });
    });

    it('应该正确解析包含肾功能指标的文本', () => {
      const text = `
        肾功能
        肌酐：95 μmol/L
        尿素氮：6.2 mmol/L
        尿酸：380 μmol/L
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(3);

      const creatinine = result.indicators.find(
        (i) => i.indicatorType === 'CREATININE',
      );
      expect(creatinine).toMatchObject({
        indicatorType: 'CREATININE',
        name: '肌酐',
        value: 95,
        unit: 'μmol/L',
        isAbnormal: false,
        status: 'NORMAL',
      });
    });

    it('应该正确解析包含血常规指标的文本', () => {
      const text = `
        血常规
        白细胞：6.5×10^9/L
        红细胞：4.5×10^12/L
        血红蛋白：135 g/L
        血小板：220×10^9/L
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(4);

      const wbc = result.indicators.find(
        (i) => i.indicatorType === 'WHITE_BLOOD_CELL',
      );
      expect(wbc).toMatchObject({
        indicatorType: 'WHITE_BLOOD_CELL',
        name: '白细胞',
        value: 6.5,
        unit: '×10^9/L',
        isAbnormal: false,
        status: 'NORMAL',
      });

      const hb = result.indicators.find(
        (i) => i.indicatorType === 'HEMOGLOBIN',
      );
      expect(hb).toMatchObject({
        indicatorType: 'HEMOGLOBIN',
        name: '血红蛋白',
        value: 135,
        unit: 'g/L',
        isAbnormal: false,
        status: 'NORMAL',
      });
    });

    it('应该提取报告日期', () => {
      const text = `
        体检报告
        检查日期：2024-03-15
        总胆固醇：5.2 mmol/L
      `;

      const result = ReportParser.parse(text);

      // Check date components to avoid timezone issues
      const expectedDate = new Date('2024-03-15');
      const actualDate = result.reportDate;
      expect(actualDate).toBeDefined();
      expect(actualDate!.getFullYear()).toBe(expectedDate.getFullYear());
      expect(actualDate!.getMonth()).toBe(expectedDate.getMonth());
      expect(actualDate!.getDate()).toBe(expectedDate.getDate());
    });

    it('应该提取医疗机构名称', () => {
      const text = `
        北京协和医院体检报告
        总胆固醇：5.2 mmol/L
      `;

      const result = ReportParser.parse(text);

      expect(result.institution).toBe('北京协和医院');
    });

    it('应该识别报告类型', () => {
      const text1 = `
        体检报告
        总胆固醇：5.2 mmol/L
      `;
      const text2 = `
        血常规检查
        白细胞：6.5×10^9/L
      `;
      const text3 = `
        生化检查
        肌酐：95 μmol/L
      `;

      const result1 = ReportParser.parse(text1);
      const result2 = ReportParser.parse(text2);
      const result3 = ReportParser.parse(text3);

      expect(result1.reportType).toBe('体检报告');
      expect(result2.reportType).toBe('血常规');
      expect(result3.reportType).toBe('生化检查');
    });

    it('应该处理英文缩写格式的指标', () => {
      const text = `
        TC: 5.2 mmol/L
        LDL-C: 3.1 mmol/L
        HDL-C: 1.2 mmol/L
        TG: 1.5 mmol/L
        FBG: 6.5 mmol/L
        HbA1c: 7.0%
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(6);
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'TOTAL_CHOLESTEROL',
      );
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'LDL_CHOLESTEROL',
      );
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'HDL_CHOLESTEROL',
      );
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'TRIGLYCERIDES',
      );
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'FASTING_GLUCOSE',
      );
      expect(result.indicators.map((i) => i.indicatorType)).toContain(
        'GLYCATED_HEMOGLOBIN',
      );
    });

    it('应该处理异常值', () => {
      const text = `
        总胆固醇：6.5 mmol/L
        空腹血糖：7.5 mmol/L
        ALT：150 U/L
        血红蛋白：75 g/L
      `;

      const result = ReportParser.parse(text);

      const cholesterol = result.indicators.find(
        (i) => i.indicatorType === 'TOTAL_CHOLESTEROL',
      );
      expect(cholesterol?.status).toBe('CRITICAL'); // 6.5 > 6.2, so it's CRITICAL

      const glucose = result.indicators.find(
        (i) => i.indicatorType === 'FASTING_GLUCOSE',
      );
      expect(glucose?.status).toBe('CRITICAL');

      const alt = result.indicators.find((i) => i.indicatorType === 'ALT');
      expect(alt?.status).toBe('CRITICAL');

      const hb = result.indicators.find(
        (i) => i.indicatorType === 'HEMOGLOBIN',
      );
      expect(hb?.status).toBe('CRITICAL');
    });

    it('应该处理边界值', () => {
      const text = `
        总胆固醇：5.2 mmol/L
        空腹血糖：6.1 mmol/L
        高密度脂蛋白：1.0 mmol/L
      `;

      const result = ReportParser.parse(text);

      const cholesterol = result.indicators.find(
        (i) => i.indicatorType === 'TOTAL_CHOLESTEROL',
      );
      expect(cholesterol?.status).toBe('NORMAL'); // 边界值

      const glucose = result.indicators.find(
        (i) => i.indicatorType === 'FASTING_GLUCOSE',
      );
      expect(glucose?.status).toBe('HIGH'); // 边界值

      const hdl = result.indicators.find(
        (i) => i.indicatorType === 'HDL_CHOLESTEROL',
      );
      expect(hdl?.status).toBe('NORMAL'); // 边界值
    });

    it('应该忽略无效数值', () => {
      const text = `
        总胆固醇：abc mmol/L
        空腹血糖：-5.0 mmol/L
        肌酐：99999 μmol/L
        正常指标：95 μmol/L
      `;

      const result = ReportParser.parse(text);

      expect(result.indicators).toHaveLength(0);
    });

    it('应该处理空文本', () => {
      const result = ReportParser.parse('');

      expect(result.indicators).toHaveLength(0);
      expect(result.reportDate).toBeUndefined();
      expect(result.institution).toBeUndefined();
      expect(result.reportType).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('应该验证有效的解析结果', () => {
      const validReport = {
        indicators: [
          {
            indicatorType: 'TOTAL_CHOLESTEROL' as const,
            name: '总胆固醇',
            value: 5.2,
            unit: 'mmol/L',
            isAbnormal: false,
            status: 'NORMAL' as const,
          },
        ],
        reportDate: new Date(),
        institution: '测试医院',
        reportType: '体检报告',
      };

      const validation = ReportParser.validate(validReport);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该识别无效的解析结果', () => {
      const invalidReport = {
        indicators: [],
        reportDate: undefined,
        institution: undefined,
        reportType: undefined,
      };

      const validation = ReportParser.validate(invalidReport);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('未识别到任何健康指标');
    });

    it('应该处理包含异常值的结果', () => {
      const reportWithAbnormal = {
        indicators: [
          {
            indicatorType: 'FASTING_GLUCOSE' as const,
            name: '空腹血糖',
            value: 7.5,
            unit: 'mmol/L',
            isAbnormal: true,
            status: 'CRITICAL' as const,
          },
        ],
        reportDate: new Date(),
        institution: '测试医院',
        reportType: '体检报告',
      };

      const validation = ReportParser.validate(reportWithAbnormal);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0); // 异常值不算错误
    });
  });

  describe('复杂场景测试', () => {
    it('应该处理完整的体检报告文本', () => {
      const fullReportText = `
        北京协和医院体检报告
        检查日期：2024年3月15日
        
        血脂检查
        总胆固醇：5.8 mmol/L
        低密度脂蛋白胆固醇：3.8 mmol/L
        高密度脂蛋白胆固醇：1.1 mmol/L
        甘油三酯：2.1 mmol/L
        
        血糖检查
        空腹血糖：6.8 mmol/L
        糖化血红蛋白：7.2%
        
        肝功能检查
        ALT：58 U/L
        AST：45 U/L
        总胆红素：22.5 μmol/L
        直接胆红素：7.8 μmol/L
        碱性磷酸酶：165 U/L
        
        肾功能检查
        肌酐：125 μmol/L
        尿素氮：8.2 mmol/L
        尿酸：455 μmol/L
        
        血常规检查
        白细胞：5.8×10^9/L
        红细胞：4.2×10^12/L
        血红蛋白：115 g/L
        血小板：180×10^9/L
      `;

      const result = ReportParser.parse(fullReportText);

      expect(result.indicators.length).toBeGreaterThan(15);

      // Check date components to avoid timezone issues
      const expectedDate = new Date('2024-03-15');
      const actualDate = result.reportDate;
      expect(actualDate).toBeDefined();
      expect(actualDate!.getFullYear()).toBe(expectedDate.getFullYear());
      expect(actualDate!.getMonth()).toBe(expectedDate.getMonth());
      expect(actualDate!.getDate()).toBe(expectedDate.getDate());

      expect(result.institution).toBe('北京协和医院');
      expect(result.reportType).toBe('体检报告');

      // 检查异常值检测
      const abnormalIndicators = result.indicators.filter((i) => i.isAbnormal);
      expect(abnormalIndicators.length).toBeGreaterThan(0);

      // 验证特定指标
      const cholesterol = result.indicators.find(
        (i) => i.indicatorType === 'TOTAL_CHOLESTEROL',
      );
      expect(cholesterol?.status).toBe('HIGH'); // 5.8 > 5.2, so it's HIGH

      const glucose = result.indicators.find(
        (i) => i.indicatorType === 'FASTING_GLUCOSE',
      );
      expect(glucose?.status).toBe('HIGH'); // 6.8 > 6.1, so it's HIGH

      const alt = result.indicators.find((i) => i.indicatorType === 'ALT');
      expect(alt?.status).toBe('HIGH'); // 58 > 40, so it's HIGH
    });

    it('应该处理不同格式的日期', () => {
      const dateFormats = [
        '检查日期：2024-03-15',
        '检查日期：2024/03/15',
        '检查日期：2024年3月15日',
        '2024-03-15',
        '2024/03/15',
        '2024年3月15日',
      ];

      dateFormats.forEach((dateFormat) => {
        const text = `${dateFormat}\n总胆固醇：5.2 mmol/L`;
        const result = ReportParser.parse(text);
        // Normalize dates to UTC to avoid timezone issues
        const expectedDate = new Date('2024-03-15');
        const actualDate = result.reportDate;
        expect(actualDate).toBeDefined();
        expect(actualDate!.getFullYear()).toBe(expectedDate.getFullYear());
        expect(actualDate!.getMonth()).toBe(expectedDate.getMonth());
        expect(actualDate!.getDate()).toBe(expectedDate.getDate());
      });
    });

    it('应该处理重复指标（只取第一个）', () => {
      const text = `
        总胆固醇：5.2 mmol/L
        其他内容...
        总胆固醇：5.5 mmol/L
      `;

      const result = ReportParser.parse(text);

      const cholesterolIndicators = result.indicators.filter(
        (i) => i.indicatorType === 'TOTAL_CHOLESTEROL',
      );
      expect(cholesterolIndicators).toHaveLength(1);
      expect(cholesterolIndicators[0].value).toBe(5.2); // 取第一个值
    });
  });
});
