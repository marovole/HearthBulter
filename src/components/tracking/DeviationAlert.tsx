'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Info, X, ChevronRight } from 'lucide-react';

interface Deviation {
  id: string;
  type: 'PROTEIN_DEFICIENCY' | 'CARB_EXCESS' | 'FAT_EXCESS' | 'CALORIE_DEFICIENCY' | 'CALORIE_EXCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  nutrient: string;
  currentValue: number;
  targetValue: number;
  deviationPercent: number;
  days: number;
  message: string;
  suggestions: string[];
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE';
}

interface DeviationAlertProps {
  memberId: string;
  onDismiss?: (deviationId: string) => void;
  onViewDetails?: (deviation: Deviation) => void;
}

export function DeviationAlert({ memberId, onDismiss, onViewDetails }: DeviationAlertProps) {
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDeviations();
  }, [memberId]);

  const loadDeviations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracking/deviation?memberId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setDeviations(data);
      }
    } catch (error) {
      console.error('加载偏差分析失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (deviationId: string) => {
    setDismissedIds(new Set([...dismissedIds, deviationId]));
    onDismiss?.(deviationId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
    case 'HIGH': return 'bg-red-50 border-red-200 text-red-800';
    case 'MEDIUM': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'LOW': return 'bg-blue-50 border-blue-200 text-blue-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
    case 'HIGH': return <AlertTriangle className="w-5 h-5 text-red-600" />;
    case 'MEDIUM': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    case 'LOW': return <Info className="w-5 h-5 text-blue-600" />;
    default: return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
    case 'IMPROVING': return <TrendingDown className="w-4 h-4 text-green-600" />;
    case 'WORSENING': return <TrendingUp className="w-4 h-4 text-red-600" />;
    case 'STABLE': return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    default: return null;
    }
  };

  const getNutrientLabel = (nutrient: string) => {
    const labels = {
      protein: '蛋白质',
      carbs: '碳水化合物',
      fat: '脂肪',
      calories: '热量',
    };
    return labels[nutrient as keyof typeof labels] || nutrient;
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
    case 'IMPROVING': return '趋势改善';
    case 'WORSENING': return '趋势恶化';
    case 'STABLE': return '保持稳定';
    default: return '';
    }
  };

  const activeDeviations = deviations.filter(d => !dismissedIds.has(d.id));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">营养偏差分析</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeDeviations.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">营养偏差分析</h3>
        <div className="text-center py-8 border-2 border-dashed border-green-200 rounded-lg bg-green-50">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingDown className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="text-green-800 font-medium mb-1">营养摄入均衡</h4>
          <p className="text-green-600 text-sm">
            近期营养指标都在正常范围内，继续保持！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">营养偏差分析</h3>
        <span className="text-sm text-gray-500">
          发现 {activeDeviations.length} 项异常
        </span>
      </div>

      {/* Deviation Alerts */}
      <div className="space-y-3">
        {activeDeviations.map((deviation) => (
          <div
            key={deviation.id}
            className={`border rounded-lg p-4 ${getSeverityColor(deviation.severity)}`}
          >
            {/* Alert Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3">
                {getSeverityIcon(deviation.severity)}
                <div className="flex-1">
                  <h4 className="font-medium mb-1">
                    {getNutrientLabel(deviation.nutrient)}摄入{deviation.type.includes('DEFICIENCY') ? '不足' : '超标'}
                  </h4>
                  <p className="text-sm opacity-80">
                    当前 {deviation.currentValue}g / 目标 {deviation.targetValue}g
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-xs">
                  {getTrendIcon(deviation.trend)}
                  <span>{getTrendText(deviation.trend)}</span>
                </div>
                <button
                  onClick={() => handleDismiss(deviation.id)}
                  className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deviation Details */}
            <div className="space-y-2 mb-3">
              <p className="text-sm">{deviation.message}</p>
              
              <div className="flex items-center space-x-4 text-xs">
                <span>
                  偏差程度: {Math.abs(deviation.deviationPercent)}%
                </span>
                <span>
                  持续时间: {deviation.days} 天
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  deviation.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                    deviation.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                }`}>
                  {deviation.severity === 'HIGH' ? '严重' :
                    deviation.severity === 'MEDIUM' ? '中等' : '轻微'}
                </span>
              </div>
            </div>

            {/* Suggestions */}
            {deviation.suggestions.length > 0 && (
              <div className="border-t border-current border-opacity-20 pt-3">
                <p className="text-sm font-medium mb-2">调整建议:</p>
                <ul className="space-y-1">
                  {deviation.suggestions.slice(0, 2).map((suggestion, index) => (
                    <li key={index} className="text-xs flex items-start space-x-1">
                      <span className="mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                  {deviation.suggestions.length > 2 && (
                    <li className="text-xs opacity-80">
                      还有 {deviation.suggestions.length - 2} 条建议...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => onViewDetails?.(deviation)}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-current bg-opacity-10 rounded hover:bg-opacity-20"
              >
                <span>查看详情</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleDismiss(deviation.id)}
                className="px-3 py-1 text-xs border border-current border-opacity-30 rounded hover:bg-current hover:bg-opacity-10"
              >
                知道了
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-center">
        <button
          onClick={loadDeviations}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          刷新分析
        </button>
      </div>
    </div>
  );
}
