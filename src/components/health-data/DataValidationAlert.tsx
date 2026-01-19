"use client";

import React from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface DataValidationAlertProps {
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  suggestions?: string[];
  trend?: {
    direction: "up" | "down" | "stable";
    value: string;
    description: string;
  };
  onDismiss?: () => void;
  onAction?: () => void;
  actionText?: string;
}

export function DataValidationAlert({
  type,
  title,
  message,
  suggestions = [],
  trend,
  onDismiss,
  onAction,
  actionText,
}: DataValidationAlertProps) {
  const getAlertStyles = () => {
    switch (type) {
    case "error":
      return {
        container: "bg-red-50 border-red-200",
        icon: "text-red-400",
        title: "text-red-800",
        message: "text-red-700",
        button: "bg-red-100 text-red-800 hover:bg-red-200",
      };
    case "warning":
      return {
        container: "bg-yellow-50 border-yellow-200",
        icon: "text-yellow-400",
        title: "text-yellow-800",
        message: "text-yellow-700",
        button: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
      };
    case "success":
      return {
        container: "bg-green-50 border-green-200",
        icon: "text-green-400",
        title: "text-green-800",
        message: "text-green-700",
        button: "bg-green-100 text-green-800 hover:bg-green-200",
      };
    default:
      return {
        container: "bg-blue-50 border-blue-200",
        icon: "text-blue-400",
        title: "text-blue-800",
        message: "text-blue-700",
        button: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      };
    }
  };

  const getIcon = () => {
    switch (type) {
    case "error":
      return <AlertTriangle className="h-5 w-5" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5" />;
    case "success":
      return <CheckCircle className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
    }
  };

  const getTrendIcon = () => {
    switch (trend?.direction) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`border rounded-md p-4 ${styles.container}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <div className={styles.icon}>{getIcon()}</div>
        </div>

        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>

          <div className={`mt-2 text-sm ${styles.message}`}>
            <p>{message}</p>

            {/* 趋势信息 */}
            {trend && (
              <div className="mt-3 flex items-center space-x-2 p-3 bg-white bg-opacity-60 rounded-lg">
                {getTrendIcon()}
                <div>
                  <span className="font-medium">{trend.value}</span>
                  <span className="ml-2 text-gray-600">
                    {trend.description}
                  </span>
                </div>
              </div>
            )}

            {/* 建议列表 */}
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="font-medium mb-2">建议：</p>
                <ul className="list-disc list-inside space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {onAction && actionText && (
            <div className="mt-4">
              <button
                onClick={onAction}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium ${styles.button}`}
              >
                {actionText}
              </button>
            </div>
          )}
        </div>

        {/* 关闭按钮 */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:opacity-80`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 预定义的常用警告组件
export function WeightAnomalyAlert({
  currentWeight,
  previousWeight,
  onConfirm,
  onEdit,
}: {
  currentWeight: number;
  previousWeight: number;
  onConfirm?: () => void;
  onEdit?: () => void;
}) {
  const change = currentWeight - previousWeight;
  const changePercent = Math.abs((change / previousWeight) * 100).toFixed(1);

  return (
    <DataValidationAlert
      type="warning"
      title="体重变化异常"
      message={`您的体重从 ${previousWeight}kg 变化到 ${currentWeight}kg，${change > 0 ? "增加" : "减少"}了 ${Math.abs(change).toFixed(1)}kg (${changePercent}%)`}
      suggestions={[
        "请确认测量时间和条件是否一致",
        "检查测量设备是否正常",
        "如果是真实变化，建议咨询医生",
      ]}
      trend={{
        direction: change > 0 ? "up" : "down",
        value: `${change > 0 ? "+" : ""}${change.toFixed(1)}kg`,
        description: "较上次测量",
      }}
      onAction={onConfirm}
      actionText="确认数据正确"
    />
  );
}

export function BloodPressureAlert({
  systolic,
  diastolic,
  onConfirm,
}: {
  systolic: number;
  diastolic: number;
  onConfirm?: () => void;
}) {
  const getBPLevel = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80)
      return { level: "正常", type: "success" as const };
    if (sys < 130 && dia < 80)
      return { level: "升高", type: "warning" as const };
    if (sys < 140 || dia < 90)
      return { level: "高血压1期", type: "warning" as const };
    if (sys < 180 || dia < 120)
      return { level: "高血压2期", type: "error" as const };
    return { level: "高血压危象", type: "error" as const };
  };

  const { level, type } = getBPLevel(systolic, diastolic);

  return (
    <DataValidationAlert
      type={type}
      title="血压检测结果"
      message={`您的血压为 ${systolic}/${diastolic} mmHg，属于${level}范围`}
      suggestions={
        type === "error"
          ? ["请立即咨询医生", "避免剧烈运动", "监测症状变化"]
          : type === "warning"
            ? ["建议调整生活方式", "减少钠盐摄入", "增加运动量"]
            : ["继续保持健康的生活方式", "定期监测血压"]
      }
      onAction={onConfirm}
      actionText="我知道了"
    />
  );
}

export function BloodSugarAlert({
  bloodSugar,
  fasting,
  onConfirm,
}: {
  bloodSugar: number;
  fasting: boolean;
  onConfirm?: () => void;
}) {
  const getBSLevel = (bs: number, isFasting: boolean) => {
    if (isFasting) {
      if (bs < 6.1) return { level: "正常", type: "success" as const };
      if (bs < 7.0) return { level: "空腹血糖受损", type: "warning" as const };
      return { level: "糖尿病", type: "error" as const };
    } else {
      if (bs < 7.8) return { level: "正常", type: "success" as const };
      if (bs < 11.1) return { level: "糖耐量异常", type: "warning" as const };
      return { level: "糖尿病", type: "error" as const };
    }
  };

  const { level, type } = getBSLevel(bloodSugar, fasting);

  return (
    <DataValidationAlert
      type={type}
      title="血糖检测结果"
      message={`您的${fasting ? "空腹" : "餐后"}血糖为 ${bloodSugar} mmol/L，属于${level}范围`}
      suggestions={
        type === "error"
          ? ["请立即咨询医生", "控制饮食中的糖分摄入", "定期监测血糖"]
          : type === "warning"
            ? ["建议调整饮食结构", "增加运动量", "定期检查血糖"]
            : ["继续保持健康的饮食习惯", "定期监测血糖"]
      }
      onAction={onConfirm}
      actionText="我知道了"
    />
  );
}

export function DataEntrySuccessAlert({
  metrics,
  onViewHistory,
}: {
  metrics: string[];
  onViewHistory?: () => void;
}) {
  return (
    <DataValidationAlert
      type="success"
      title="数据录入成功"
      message={`已成功录入 ${metrics.join("、")} 等健康数据`}
      suggestions={[
        "建议定期测量并记录健康数据",
        "保持良好的生活习惯",
        "如有异常请及时咨询医生",
      ]}
      onAction={onViewHistory}
      actionText="查看历史记录"
    />
  );
}
