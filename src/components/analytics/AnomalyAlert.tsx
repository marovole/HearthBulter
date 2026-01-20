"use client";

import { useState } from "react";
import type { AnomalySeverity, AnomalyType } from "@/lib/types/analytics";

interface AnomalyAlertProps {
  anomaly: {
    id: string;
    anomalyType: AnomalyType;
    severity: AnomalySeverity;
    title: string;
    description: string;
    detectedAt: Date;
  };
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string, resolution: string) => void;
  onIgnore?: (id: string) => void;
}

const severityConfig = {
  CRITICAL: {
    label: "危急",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    icon: "🚨",
  },
  HIGH: {
    label: "严重",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    icon: "⚠️",
  },
  MEDIUM: {
    label: "中等",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    icon: "⚡",
  },
  LOW: {
    label: "轻微",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    icon: "ℹ️",
  },
};

export default function AnomalyAlert({
  anomaly,
  onAcknowledge,
  onResolve,
  onIgnore,
}: AnomalyAlertProps) {
  const [showResolution, setShowResolution] = useState(false);
  const [resolution, setResolution] = useState("");

  const config = severityConfig[anomaly.severity];

  const handleResolve = () => {
    if (resolution.trim() && onResolve) {
      onResolve(anomaly.id, resolution);
      setShowResolution(false);
      setResolution("");
    }
  };

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} mb-3 p-4`}>
      {/* 标题行 */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex flex-1 items-start gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${config.color}`}>{anomaly.title}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                {config.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">{anomaly.description}</p>
            <p className="mt-1 text-xs text-gray-500">
              检测时间：{new Date(anomaly.detectedAt).toLocaleString("zh-CN")}
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {!showResolution && (
        <div className="mt-3 flex gap-2">
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(anomaly.id)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50"
            >
              已确认
            </button>
          )}
          {onResolve && (
            <button
              onClick={() => setShowResolution(true)}
              className="rounded-md bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
            >
              标记解决
            </button>
          )}
          {onIgnore && (
            <button
              onClick={() => onIgnore(anomaly.id)}
              className="px-3 py-1 text-sm text-gray-600 transition-colors hover:text-gray-800"
            >
              忽略
            </button>
          )}
        </div>
      )}

      {/* 解决说明输入框 */}
      {showResolution && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="请输入解决方案或说明..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
            rows={3}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleResolve}
              disabled={!resolution.trim()}
              className="rounded-md bg-green-600 px-4 py-1 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              提交
            </button>
            <button
              onClick={() => {
                setShowResolution(false);
                setResolution("");
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-1 text-sm transition-colors hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
