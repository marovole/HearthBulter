'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import TrendChart from '@/components/analytics/TrendChart';
import HealthScoreCard from '@/components/analytics/HealthScoreCard';
import AnomalyAlert from '@/components/analytics/AnomalyAlert';
import { TrendDataType } from '@prisma/client';

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [trendData, setTrendData] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载健康评分
  const loadHealthScore = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(
        `/api/analytics/health-score?memberId=${selectedMember}&days=7`
      );
      const data = await response.json();
      
      if (data.success) {
        // 计算最新评分
        const trend = data.data;
        if (trend.length > 0) {
          const latest = trend[trend.length - 1];
          // 需要获取完整的评分详情
          const scoreResponse = await fetch(
            `/api/analytics/health-score?memberId=${selectedMember}`
          );
          const scoreData = await scoreResponse.json();
          if (scoreData.success) {
            setHealthScore(scoreData.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load health score:', error);
    }
  };

  // 加载趋势数据
  const loadTrendData = async (dataType: TrendDataType) => {
    if (!selectedMember) return;

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const response = await fetch(
        `/api/analytics/trends?memberId=${selectedMember}&dataType=${dataType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('Failed to load trend data:', error);
    }
    return null;
  };

  // 加载异常记录
  const loadAnomalies = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(
        `/api/analytics/anomalies?memberId=${selectedMember}&status=PENDING&limit=5`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnomalies(data.data);
      }
    } catch (error) {
      console.error('Failed to load anomalies:', error);
    }
  };

  // 处理异常操作
  const handleAnomalyAction = async (anomalyId: string, action: string, resolution?: string) => {
    try {
      const response = await fetch('/api/analytics/anomalies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalyId, action, resolution }),
      });

      if (response.ok) {
        // 重新加载异常列表
        await loadAnomalies();
      }
    } catch (error) {
      console.error('Failed to update anomaly:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (selectedMember) {
        await Promise.all([
          loadHealthScore(),
          loadAnomalies(),
        ]);
      }
      setLoading(false);
    };
    init();
  }, [selectedMember]);

  // 加载体重趋势（示例）
  useEffect(() => {
    if (selectedMember) {
      loadTrendData('WEIGHT').then(data => {
        if (data) {
          setTrendData(data);
        }
      });
    }
  }, [selectedMember, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">健康分析</h1>
        <p className="text-gray-600">查看您的健康数据趋势和分析报告</p>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择成员
          </label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">请选择...</option>
            {/* 这里应该从API加载家庭成员列表 */}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            时间范围
          </label>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedMember ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-700">请先选择一个家庭成员查看分析数据</p>
        </div>
      ) : (
        <>
          {/* 健康评分卡片 */}
          {healthScore && (
            <div className="mb-6">
              <HealthScoreCard
                score={healthScore.overallScore}
                grade={healthScore.grade}
                components={healthScore.components}
                showDetails={true}
              />
            </div>
          )}

          {/* 异常警报 */}
          {anomalies.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">需要关注的异常</h2>
              {anomalies.map((anomaly) => (
                <AnomalyAlert
                  key={anomaly.id}
                  anomaly={anomaly}
                  onAcknowledge={(id) => handleAnomalyAction(id, 'acknowledge')}
                  onResolve={(id, resolution) => handleAnomalyAction(id, 'resolve', resolution)}
                  onIgnore={(id) => handleAnomalyAction(id, 'ignore')}
                />
              ))}
            </div>
          )}

          {/* 趋势图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {trendData && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <TrendChart
                  data={trendData.dataPoints}
                  title="体重趋势"
                  unit="kg"
                  showPredictions={true}
                  predictions={trendData.predictions}
                />
              </div>
            )}
          </div>

          {/* 快速操作 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">快速操作</h2>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.href = '/dashboard/analytics/reports'}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                查看报告历史
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/analytics/generate'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                生成新报告
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

