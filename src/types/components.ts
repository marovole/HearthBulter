/**
 * 通用组件类型定义
 * 用于替换组件中的 any 类型
 */

import { TooltipProps } from 'recharts';

// 食材类型
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  price?: number;
}

// 营养信息类型
export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

// 图表数据点
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

// 图表 Tooltip Props
type TooltipFormatter = (
  value: any,
  name: string,
  props: any,
) => [string, string];

export interface CustomTooltipProps extends TooltipProps<any, any> {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: TooltipFormatter;
}

// 同意弹窗类型
export interface ConsentContext {
  [key: string]: string | number | boolean;
}

export interface ConsentData {
  type: string;
  granted: boolean;
  context?: ConsentContext;
  ipAddress?: string;
  userAgent?: string;
}

// 通用的选项类型
export interface OptionItem {
  label: string;
  value: string | number;
  disabled?: boolean;
}
