// 医疗相关类型定义

export enum IndicatorType {
  // 血脂相关
  TOTAL_CHOLESTEROL = 'TOTAL_CHOLESTEROL',
  LDL_CHOLESTEROL = 'LDL_CHOLESTEROL',
  HDL_CHOLESTEROL = 'HDL_CHOLESTEROL',
  TRIGLYCERIDES = 'TRIGLYCERIDES',

  // 血糖相关
  FASTING_GLUCOSE = 'FASTING_GLUCOSE',
  POSTPRANDIAL_GLUCOSE = 'POSTPRANDIAL_GLUCOSE',
  GLYCATED_HEMOGLOBIN = 'GLYCATED_HEMOGLOBIN',

  // 肝功能相关
  ALT = 'ALT',
  AST = 'AST',
  TOTAL_BILIRUBIN = 'TOTAL_BILIRUBIN',
  DIRECT_BILIRUBIN = 'DIRECT_BILIRUBIN',
  ALP = 'ALP',

  // 肾功能相关
  CREATININE = 'CREATININE',
  UREA_NITROGEN = 'UREA_NITROGEN',
  URIC_ACID = 'URIC_ACID',

  // 其他
  WHITE_BLOOD_CELL = 'WHITE_BLOOD_CELL',
  RED_BLOOD_CELL = 'RED_BLOOD_CELL',
  HEMOGLOBIN = 'HEMOGLOBIN',
  PLATELET = 'PLATELET',
  OTHER = 'OTHER',
}

export enum IndicatorStatus {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OcrStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// 体检指标接口
export interface MedicalIndicator {
  id: string;
  reportId: string;
  indicatorType: IndicatorType;
  name: string;
  value: number;
  unit: string;
  referenceRange?: string;
  isAbnormal: boolean;
  status: IndicatorStatus;
  isCorrected: boolean;
  originalValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 体检报告接口
export interface MedicalReport {
  id: string;
  memberId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ocrStatus: OcrStatus;
  ocrText?: string;
  ocrError?: string;
  reportDate?: Date;
  institution?: string;
  reportType?: string;
  isCorrected: boolean;
  correctedAt?: Date;
  indicators: MedicalIndicator[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
