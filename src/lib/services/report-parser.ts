/**
 * 体检报告解析服务
 *
 * 从OCR识别的文本中提取关键健康指标，并进行异常值检测和结构化存储
 */

import type { IndicatorType, IndicatorStatus } from "@prisma/client";

/**
 * 解析出的指标数据
 */
export interface ParsedIndicator {
  indicatorType: IndicatorType;
  name: string;
  value: number;
  unit: string;
  referenceRange?: string;
  isAbnormal: boolean;
  status: IndicatorStatus;
}

/**
 * 解析结果
 */
export interface ParsedReport {
  indicators: ParsedIndicator[];
  reportDate?: Date;
  institution?: string;
  reportType?: string;
}

/**
 * 指标定义和参考范围
 */
interface IndicatorDefinition {
  type: IndicatorType;
  patterns: RegExp[]; // 匹配模式，支持多种表述
  unit: string;
  normalRange: {
    min?: number;
    max?: number;
  };
  getStatus: (value: number) => IndicatorStatus;
}

/**
 * 指标定义配置
 */
const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  // 血脂相关
  {
    type: "TOTAL_CHOLESTEROL",
    patterns: [
      /总胆固醇[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /TC[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /总胆固醇[：:]\s*(\d+\.?\d*)\s*mol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { max: 5.2 },
    getStatus: (value) => {
      if (value > 6.2) return "CRITICAL";
      if (value > 5.2) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "LDL_CHOLESTEROL",
    patterns: [
      /低密度脂蛋白[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /LDL[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /LDL-C[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { max: 3.4 },
    getStatus: (value) => {
      if (value > 4.1) return "CRITICAL";
      if (value > 3.4) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "HDL_CHOLESTEROL",
    patterns: [
      /高密度脂蛋白[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /HDL[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /HDL-C[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { min: 1.0 },
    getStatus: (value) => {
      if (value < 0.9) return "LOW";
      return "NORMAL";
    },
  },
  {
    type: "TRIGLYCERIDES",
    patterns: [
      /甘油三酯[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /TG[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /TRIG[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { max: 1.7 },
    getStatus: (value) => {
      if (value > 2.3) return "CRITICAL";
      if (value > 1.7) return "HIGH";
      return "NORMAL";
    },
  },

  // 血糖相关
  {
    type: "FASTING_GLUCOSE",
    patterns: [
      /空腹血糖[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /FBG[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /空腹葡萄糖[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { min: 3.9, max: 6.1 },
    getStatus: (value) => {
      if (value >= 7.0 || value < 3.0) return "CRITICAL";
      if (value >= 6.1 || value < 3.9) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "POSTPRANDIAL_GLUCOSE",
    patterns: [
      /餐后血糖[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /餐后2小时血糖[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /PPG[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { max: 7.8 },
    getStatus: (value) => {
      if (value >= 11.1) return "CRITICAL";
      if (value >= 7.8) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "GLYCATED_HEMOGLOBIN",
    patterns: [
      /糖化血红蛋白[：:]\s*(\d+\.?\d*)\s*%/gi,
      /HbA1c[：:]\s*(\d+\.?\d*)\s*%/gi,
      /HbA1C[：:]\s*(\d+\.?\d*)\s*%/gi,
    ],
    unit: "%",
    normalRange: { max: 6.5 },
    getStatus: (value) => {
      if (value >= 8.0) return "CRITICAL";
      if (value >= 6.5) return "HIGH";
      return "NORMAL";
    },
  },

  // 肝功能相关
  {
    type: "ALT",
    patterns: [
      /丙氨酸氨基转移酶[（(]ALT[）)][:：]\s*(\d+)\s*U\/L/gi,
      /ALT[：:]\s*(\d+)\s*U\/L/gi,
      /谷丙转氨酶[：:]\s*(\d+)\s*U\/L/gi,
    ],
    unit: "U/L",
    normalRange: { max: 40 },
    getStatus: (value) => {
      if (value > 120) return "CRITICAL";
      if (value > 40) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "AST",
    patterns: [
      /天门冬氨酸氨基转移酶[（(]AST[）)][:：]\s*(\d+)\s*U\/L/gi,
      /AST[：:]\s*(\d+)\s*U\/L/gi,
      /谷草转氨酶[：:]\s*(\d+)\s*U\/L/gi,
    ],
    unit: "U/L",
    normalRange: { max: 40 },
    getStatus: (value) => {
      if (value > 120) return "CRITICAL";
      if (value > 40) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "TOTAL_BILIRUBIN",
    patterns: [
      /总胆红素[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /TBIL[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /TB[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
    ],
    unit: "μmol/L",
    normalRange: { max: 21 },
    getStatus: (value) => {
      if (value > 34) return "CRITICAL";
      if (value > 21) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "DIRECT_BILIRUBIN",
    patterns: [
      /直接胆红素[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /DBIL[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /DB[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
    ],
    unit: "μmol/L",
    normalRange: { max: 6.8 },
    getStatus: (value) => {
      if (value > 10) return "CRITICAL";
      if (value > 6.8) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "ALP",
    patterns: [/碱性磷酸酶[：:]\s*(\d+)\s*U\/L/gi, /ALP[：:]\s*(\d+)\s*U\/L/gi],
    unit: "U/L",
    normalRange: { min: 40, max: 150 },
    getStatus: (value) => {
      if (value > 300 || value < 30) return "CRITICAL";
      if (value > 150 || value < 40) return "HIGH";
      return "NORMAL";
    },
  },

  // 肾功能相关
  {
    type: "CREATININE",
    patterns: [
      /肌酐[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /CREATININE[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /CREA[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /Cr[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
    ],
    unit: "μmol/L",
    normalRange: { max: 133 },
    getStatus: (value) => {
      if (value > 200) return "CRITICAL";
      if (value > 133) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "UREA_NITROGEN",
    patterns: [
      /尿素氮[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /BUN[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
      /UREA[：:]\s*(\d+\.?\d*)\s*mmol\/L/gi,
    ],
    unit: "mmol/L",
    normalRange: { max: 7.1 },
    getStatus: (value) => {
      if (value > 10) return "CRITICAL";
      if (value > 7.1) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "URIC_ACID",
    patterns: [
      /尿酸[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /UA[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
      /URIC[：:]\s*(\d+\.?\d*)\s*μmol\/L/gi,
    ],
    unit: "μmol/L",
    normalRange: { max: 420 },
    getStatus: (value) => {
      if (value > 600) return "CRITICAL";
      if (value > 420) return "HIGH";
      return "NORMAL";
    },
  },

  // 血常规相关
  {
    type: "WHITE_BLOOD_CELL",
    patterns: [
      /白细胞[：:]\s*(\d+\.?\d*)\s*×10\^9\/L/gi,
      /WBC[：:]\s*(\d+\.?\d*)\s*×10\^9\/L/gi,
      /白细胞计数[：:]\s*(\d+\.?\d*)\s*×10\^9\/L/gi,
    ],
    unit: "×10^9/L",
    normalRange: { min: 4.0, max: 10.0 },
    getStatus: (value) => {
      if (value > 15 || value < 2) return "CRITICAL";
      if (value > 10 || value < 4) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "RED_BLOOD_CELL",
    patterns: [
      /红细胞[：:]\s*(\d+\.?\d*)\s*×10\^12\/L/gi,
      /RBC[：:]\s*(\d+\.?\d*)\s*×10\^12\/L/gi,
      /红细胞计数[：:]\s*(\d+\.?\d*)\s*×10\^12\/L/gi,
    ],
    unit: "×10^12/L",
    normalRange: { min: 4.0, max: 5.5 },
    getStatus: (value) => {
      if (value > 6 || value < 3) return "CRITICAL";
      if (value > 5.5 || value < 4) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "HEMOGLOBIN",
    patterns: [
      /血红蛋白[：:]\s*(\d+\.?\d*)\s*g\/L/gi,
      /Hb[：:]\s*(\d+\.?\d*)\s*g\/L/gi,
      /HGB[：:]\s*(\d+\.?\d*)\s*g\/L/gi,
    ],
    unit: "g/L",
    normalRange: { min: 120, max: 160 },
    getStatus: (value) => {
      if (value > 180 || value < 80) return "CRITICAL";
      if (value > 160 || value < 120) return "HIGH";
      return "NORMAL";
    },
  },
  {
    type: "PLATELET",
    patterns: [
      /血小板[：:]\s*(\d+)\s*×10\^9\/L/gi,
      /PLT[：:]\s*(\d+)\s*×10\^9\/L/gi,
      /血小板计数[：:]\s*(\d+)\s*×10\^9\/L/gi,
    ],
    unit: "×10^9/L",
    normalRange: { min: 100, max: 300 },
    getStatus: (value) => {
      if (value > 500 || value < 50) return "CRITICAL";
      if (value > 300 || value < 100) return "HIGH";
      return "NORMAL";
    },
  },
];

/**
 * 获取指标名称
 */
function getIndicatorName(type: IndicatorType): string {
  const names: Record<IndicatorType, string> = {
    TOTAL_CHOLESTEROL: "总胆固醇",
    LDL_CHOLESTEROL: "低密度脂蛋白胆固醇",
    HDL_CHOLESTEROL: "高密度脂蛋白胆固醇",
    TRIGLYCERIDES: "甘油三酯",
    FASTING_GLUCOSE: "空腹血糖",
    POSTPRANDIAL_GLUCOSE: "餐后血糖",
    GLYCATED_HEMOGLOBIN: "糖化血红蛋白",
    ALT: "丙氨酸氨基转移酶",
    AST: "天门冬氨酸氨基转移酶",
    TOTAL_BILIRUBIN: "总胆红素",
    DIRECT_BILIRUBIN: "直接胆红素",
    ALP: "碱性磷酸酶",
    CREATININE: "肌酐",
    UREA_NITROGEN: "尿素氮",
    URIC_ACID: "尿酸",
    WHITE_BLOOD_CELL: "白细胞",
    RED_BLOOD_CELL: "红细胞",
    HEMOGLOBIN: "血红蛋白",
    PLATELET: "血小板",
    OTHER: "其他",
  };
  return names[type] || "未知指标";
}

/**
 * 获取参考范围字符串
 */
function getReferenceRange(def: IndicatorDefinition): string {
  const { min, max } = def.normalRange;
  if (min !== undefined && max !== undefined) {
    return `${min}-${max} ${def.unit}`;
  } else if (min !== undefined) {
    return `≥${min} ${def.unit}`;
  } else if (max !== undefined) {
    return `<${max} ${def.unit}`;
  }
  return "";
}

/**
 * 提取报告日期
 */
function extractReportDate(text: string): Date | undefined {
  // 匹配日期格式：2024-01-15、2024/01/15、2024年1月15日等
  const patterns = [
    /(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日]?/g,
    /(\d{4})-(\d{2})-(\d{2})/g,
    /(\d{4})\/(\d{2})\/(\d{2})/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[0]
        .replace(/年|月/g, "-")
        .replace(/日/g, "")
        .replace(/\//g, "-");
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  return undefined;
}

/**
 * 提取医疗机构名称
 */
function extractInstitution(text: string): string | undefined {
  // 匹配常见的医疗机构关键词
  const patterns = [
    /([\u4e00-\u9fa5]+医院)/,
    /([\u4e00-\u9fa5]+体检中心)/,
    /([\u4e00-\u9fa5]+医疗)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * 报告解析器类
 */
export class ReportParser {
  /**
   * 解析OCR文本，提取指标数据
   */
  static parse(text: string): ParsedReport {
    const indicators: ParsedIndicator[] = [];
    const foundTypes = new Set<IndicatorType>();

    // 遍历所有指标定义，提取数据
    for (const def of INDICATOR_DEFINITIONS) {
      // 避免重复提取同一指标
      if (foundTypes.has(def.type)) {
        continue;
      }

      // 尝试匹配所有模式
      for (const pattern of def.patterns) {
        const matches = Array.from(text.matchAll(pattern));

        if (matches.length > 0) {
          // 取第一个匹配的值（通常同一指标在报告中只出现一次）
          const match = matches[0];
          const valueStr = match[1];

          try {
            const value = parseFloat(valueStr);

            // 验证数值是否合理
            if (isNaN(value) || value < 0 || value > 10000) {
              continue;
            }

            // 判断状态
            const status = def.getStatus(value);
            const isAbnormal = status !== "NORMAL";

            // 获取参考范围
            const referenceRange = getReferenceRange(def);

            indicators.push({
              indicatorType: def.type,
              name: getIndicatorName(def.type),
              value,
              unit: def.unit,
              referenceRange,
              isAbnormal,
              status,
            });

            foundTypes.add(def.type);
            break; // 找到后跳出模式循环
          } catch (error) {
            console.warn(`解析指标值失败: ${valueStr}`, error);
          }
        }
      }
    }

    // 提取报告元数据
    const reportDate = extractReportDate(text);
    const institution = extractInstitution(text);
    const reportType = text.includes("体检报告")
      ? "体检报告"
      : text.includes("血常规")
        ? "血常规"
        : text.includes("生化")
          ? "生化检查"
          : undefined;

    return {
      indicators,
      reportDate,
      institution,
      reportType,
    };
  }

  /**
   * 验证解析结果
   */
  static validate(parsed: ParsedReport): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (parsed.indicators.length === 0) {
      errors.push("未识别到任何健康指标");
    }

    // 检查是否有异常值
    const abnormalCount = parsed.indicators.filter((i) => i.isAbnormal).length;
    if (abnormalCount > 0) {
      // 这不算错误，只是提醒
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例实例
export const reportParser = new ReportParser();
