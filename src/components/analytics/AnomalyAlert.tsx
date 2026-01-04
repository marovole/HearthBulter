'use client';

import { useState } from 'react';
import type { AnomalySeverity, AnomalyType } from '@/lib/types/analytics';

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
    label: '危急',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: '🚨',
  },
  HIGH: {
    label: '严重',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: '⚠️',
  },
  MEDIUM: {
    label: '中等',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: '⚡',
  },
  LOW: {
    label: '轻微',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: 'ℹ️',
  },
};

export default function AnomalyAlert({
  anomaly,
  onAcknowledge,
  onResolve,
  onIgnore,
}: AnomalyAlertProps) {
  const [showResolution, setShowResolution] = useState(false);
  const [resolution, setResolution] = useState('');

  const config = severityConfig[anomaly.severity];

  const handleResolve = () => {
    if (resolution.trim() && onResolve) {
      onResolve(anomaly.id, resolution);
      setShowResolution(false);
      setResolution('');
    }
  };

  return (
    <div
      className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-4 mb-3`}
    >
      {/* 标题行 */}
      <div className='flex items-start justify-between mb-2'>
        <div className='flex items-start gap-2 flex-1'>
          <span className='text-2xl'>{config.icon}</span>
          <div>
            <div className='flex items-center gap-2'>
              <h4 className={`font-semibold ${config.color}`}>
                {anomaly.title}
              </h4>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                {config.label}
              </span>
            </div>
            <p className='text-sm text-gray-700 mt-1'>{anomaly.description}</p>
            <p className='text-xs text-gray-500 mt-1'>
              检测时间：{new Date(anomaly.detectedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {!showResolution && (
        <div className='flex gap-2 mt-3'>
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(anomaly.id)}
              className='px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
            >
              已确认
            </button>
          )}
          {onResolve && (
            <button
              onClick={() => setShowResolution(true)}
              className='px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
            >
              标记解决
            </button>
          )}
          {onIgnore && (
            <button
              onClick={() => onIgnore(anomaly.id)}
              className='px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors'
            >
              忽略
            </button>
          )}
        </div>
      )}

      {/* 解决说明输入框 */}
      {showResolution && (
        <div className='mt-3 pt-3 border-t border-gray-200'>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder='请输入解决方案或说明...'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm'
            rows={3}
          />
          <div className='flex gap-2 mt-2'>
            <button
              onClick={handleResolve}
              disabled={!resolution.trim()}
              className='px-4 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
            >
              提交
            </button>
            <button
              onClick={() => {
                setShowResolution(false);
                setResolution('');
              }}
              className='px-4 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
