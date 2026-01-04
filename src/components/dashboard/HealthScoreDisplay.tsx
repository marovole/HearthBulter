'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface HealthScoreData {
  currentScore: number;
  previousScore?: number;
  scoreHistory: Array<{
    date: Date;
    score: number;
    factors?: {
      exercise?: number;
      nutrition?: number;
      sleep?: number;
      stress?: number;
    };
  }>;
  recommendations: Array<{
    type: 'exercise' | 'nutrition' | 'sleep' | 'stress';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  breakdown: {
    exercise: number;
    nutrition: number;
    sleep: number;
    stress: number;
  };
}

interface HealthScoreDisplayProps {
  memberId: string;
  days?: number;
}

export function HealthScoreDisplay({
  memberId,
  days = 30,
}: HealthScoreDisplayProps) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 模拟API调用 - 实际应该调用真实的健康评分API
      const mockData: HealthScoreData = {
        currentScore: 85,
        previousScore: 82,
        scoreHistory: Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - i));
          return {
            date,
            score: 75 + Math.random() * 20,
            factors: {
              exercise: 70 + Math.random() * 30,
              nutrition: 75 + Math.random() * 25,
              sleep: 80 + Math.random() * 20,
              stress: 60 + Math.random() * 40,
            },
          };
        }),
        recommendations: [
          {
            type: 'exercise',
            title: '增加有氧运动',
            description:
              '建议每周增加2-3次有氧运动，每次30分钟，有助于提升心肺功能。',
            priority: 'high',
          },
          {
            type: 'sleep',
            title: '改善睡眠质量',
            description:
              '保持规律作息，确保每晚7-8小时睡眠，避免睡前使用电子设备。',
            priority: 'medium',
          },
          {
            type: 'nutrition',
            title: '优化营养摄入',
            description: '增加蔬菜水果摄入，减少加工食品，保持营养均衡。',
            priority: 'medium',
          },
        ],
        breakdown: {
          exercise: 88,
          nutrition: 82,
          sleep: 79,
          stress: 91,
        },
      };

      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <p className='mt-2 text-sm text-gray-500'>加载健康评分中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='bg-red-50 border border-red-200 rounded-md p-4'>
          <div className='flex items-center'>
            <AlertCircle className='h-5 w-5 text-red-400 mr-2' />
            <p className='text-sm text-red-800'>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-center h-64 text-gray-500'>
          <p>暂无健康评分数据</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 60) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '需改善';
    return '较差';
  };

  const scoreChange = data.previousScore
    ? data.currentScore - data.previousScore
    : 0;

  const factorIcons = {
    exercise: Activity,
    nutrition: Heart,
    sleep: Target,
    stress: TrendingDown,
  };

  const factorLabels = {
    exercise: '运动',
    nutrition: '营养',
    sleep: '睡眠',
    stress: '压力管理',
  };

  const factorColors = {
    exercise: 'text-blue-600 bg-blue-100',
    nutrition: 'text-green-600 bg-green-100',
    sleep: 'text-purple-600 bg-purple-100',
    stress: 'text-orange-600 bg-orange-100',
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const priorityLabels = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  };

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      {/* 头部 */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-3'>
          <Heart className='h-6 w-6 text-red-600' />
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>健康评分</h3>
            <p className='text-sm text-gray-500'>综合健康状况评估</p>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          {data.previousScore && (
            <div
              className={`flex items-center space-x-1 text-sm ${
                scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {scoreChange >= 0 ? (
                <TrendingUp className='h-4 w-4' />
              ) : (
                <TrendingDown className='h-4 w-4' />
              )}
              <span>
                {scoreChange >= 0 ? '+' : ''}
                {scoreChange}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 主要评分显示 */}
      <div className='text-center mb-8'>
        <div
          className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(data.currentScore)} mb-4`}
        >
          <div>
            <div
              className={`text-4xl font-bold ${getScoreColor(data.currentScore)}`}
            >
              {data.currentScore}
            </div>
            <div className={`text-sm ${getScoreColor(data.currentScore)}`}>
              {getScoreLevel(data.currentScore)}
            </div>
          </div>
        </div>
        <p className='text-gray-600'>
          您的健康评分处于{getScoreLevel(data.currentScore)}水平
        </p>
      </div>

      {/* 评分细分 */}
      <div className='mb-8'>
        <h4 className='text-sm font-medium text-gray-700 mb-4'>评分细分</h4>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {Object.entries(data.breakdown).map(([factor, score]) => {
            const Icon = factorIcons[factor as keyof typeof factorIcons];
            return (
              <div
                key={factor}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedFactor === factor
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                onClick={() =>
                  setSelectedFactor(selectedFactor === factor ? null : factor)
                }
              >
                <div className='flex items-center justify-between mb-2'>
                  <Icon className='h-5 w-5 text-gray-600' />
                  <span
                    className={`text-lg font-semibold ${getScoreColor(score)}`}
                  >
                    {score}
                  </span>
                </div>
                <div className='text-sm text-gray-600'>
                  {factorLabels[factor as keyof typeof factorLabels]}
                </div>
                <div className='mt-2 w-full bg-gray-200 rounded-full h-2'>
                  <div
                    className={`h-2 rounded-full ${
                      score >= 80
                        ? 'bg-green-600'
                        : score >= 70
                          ? 'bg-blue-600'
                          : score >= 60
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 健康建议 */}
      <div className='mb-6'>
        <h4 className='text-sm font-medium text-gray-700 mb-4'>个性化建议</h4>
        <div className='space-y-3'>
          {data.recommendations.map((rec, index) => {
            const Icon = factorIcons[rec.type];
            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${priorityColors[rec.priority]}`}
              >
                <div className='flex items-start space-x-3'>
                  <Icon className='h-5 w-5 mt-0.5' />
                  <div className='flex-1'>
                    <div className='flex items-center justify-between mb-1'>
                      <h5 className='font-medium text-gray-900'>{rec.title}</h5>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${priorityColors[rec.priority]}`}
                      >
                        {priorityLabels[rec.priority]}
                      </span>
                    </div>
                    <p className='text-sm text-gray-600'>{rec.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 历史趋势预览 */}
      <div>
        <h4 className='text-sm font-medium text-gray-700 mb-4'>
          评分趋势（最近7天）
        </h4>
        <div className='flex items-end space-x-2 h-20'>
          {data.scoreHistory.slice(-7).map((item, index) => (
            <div
              key={index}
              className='flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer'
              style={{ height: `${(item.score / 100) * 100}%` }}
              title={`${new Date(item.date).toLocaleDateString('zh-CN')}: ${item.score}分`}
            />
          ))}
        </div>
        <div className='flex justify-between text-xs text-gray-500 mt-2'>
          {data.scoreHistory.slice(-7).map((item, index) => (
            <span key={index}>
              {new Date(item.date).toLocaleDateString('zh-CN', {
                weekday: 'short',
              })}
            </span>
          ))}
        </div>
      </div>

      {/* 详细信息提示 */}
      <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
        <div className='flex items-start space-x-3'>
          <Info className='h-5 w-5 text-blue-600 mt-0.5' />
          <div>
            <h4 className='text-sm font-medium text-blue-900'>评分说明</h4>
            <p className='text-sm text-blue-700 mt-1'>
              健康评分基于运动、营养、睡眠和压力管理四个维度综合计算。
              评分范围0-100分，80分以上表示健康状况良好。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
