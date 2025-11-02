'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Heart, 
  Activity,
  Target,
  Calendar,
  Trophy,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface MemberHealthScore {
  memberId: string
  memberName: string
  avatar?: string
  currentScore: number
  previousScore?: number
  breakdown: {
    exercise: number
    nutrition: number
    sleep: number
    stress: number
  }
  weeklyTrend: Array<{
    date: Date
    score: number
  }>
  achievements: number
  goalsCompleted: number
}

interface FamilyScoreComparisonProps {
  familyId: string
  days?: number
}

export function FamilyScoreComparison({ 
  familyId, 
  days = 30, 
}: FamilyScoreComparisonProps) {
  const [members, setMembers] = useState<MemberHealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'breakdown' | 'trends' | 'achievements'>('overview');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [familyId, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 模拟API调用 - 实际应该调用真实的家庭评分对比API
      const mockMembers: MemberHealthScore[] = [
        {
          memberId: '1',
          memberName: '张爸爸',
          currentScore: 85,
          previousScore: 82,
          breakdown: {
            exercise: 88,
            nutrition: 82,
            sleep: 79,
            stress: 91,
          },
          weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            score: 80 + Math.random() * 10,
          })),
          achievements: 12,
          goalsCompleted: 8,
        },
        {
          memberId: '2',
          memberName: '李妈妈',
          currentScore: 88,
          previousScore: 86,
          breakdown: {
            exercise: 85,
            nutrition: 90,
            sleep: 88,
            stress: 89,
          },
          weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            score: 83 + Math.random() * 10,
          })),
          achievements: 15,
          goalsCompleted: 10,
        },
        {
          memberId: '3',
          memberName: '小明',
          currentScore: 78,
          previousScore: 75,
          breakdown: {
            exercise: 82,
            nutrition: 75,
            sleep: 70,
            stress: 85,
          },
          weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            score: 73 + Math.random() * 10,
          })),
          achievements: 8,
          goalsCompleted: 5,
        },
        {
          memberId: '4',
          memberName: '小红',
          currentScore: 82,
          previousScore: 80,
          breakdown: {
            exercise: 90,
            nutrition: 78,
            sleep: 85,
            stress: 75,
          },
          weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            score: 77 + Math.random() * 10,
          })),
          achievements: 10,
          goalsCompleted: 7,
        },
      ];
      
      setMembers(mockMembers);
      setSelectedMembers(mockMembers.map(m => m.memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">加载家庭评分对比中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredMembers = members.filter(m => selectedMembers.includes(m.memberId));
  
  // 准备图表数据
  const scoreComparisonData = filteredMembers.map(member => ({
    name: member.memberName,
    当前评分: member.currentScore,
    上期评分: member.previousScore || 0,
    变化: member.previousScore ? member.currentScore - member.previousScore : 0,
  }));

  const breakdownData = filteredMembers.map(member => ({
    member: member.memberName,
    运动: member.breakdown.exercise,
    营养: member.breakdown.nutrition,
    睡眠: member.breakdown.sleep,
    压力: member.breakdown.stress,
  }));

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const dataPoint: any = {
      date: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
    };
    
    filteredMembers.forEach(member => {
      dataPoint[member.memberName] = member.weeklyTrend[i]?.score || 0;
    });
    
    return dataPoint;
  });

  const achievementData = filteredMembers.map(member => ({
    name: member.memberName,
    成就数: member.achievements,
    完成目标: member.goalsCompleted,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    if (score >= 60) return '#f97316';
    return '#ef4444';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '需改善';
    return '较差';
  };

  const renderOverviewView = () => (
    <div className="space-y-6">
      {/* 评分对比柱状图 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">健康评分对比</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scoreComparisonData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="当前评分" fill="#3b82f6" />
            <Bar dataKey="上期评分" fill="#e5e7eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 排行榜 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">家庭健康排行榜</h4>
        <div className="space-y-3">
          {filteredMembers
            .sort((a, b) => b.currentScore - a.currentScore)
            .map((member, index) => (
              <div key={member.memberId} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  {index + 1}
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {member.memberName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{member.memberName}</span>
                    {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>评分: {member.currentScore}</span>
                    <span>({getScoreLevel(member.currentScore)})</span>
                    {member.previousScore && (
                      <span className={member.currentScore >= member.previousScore ? 'text-green-600' : 'text-red-600'}>
                        {member.currentScore >= member.previousScore ? '+' : ''}
                        {member.currentScore - member.previousScore}
                      </span>
                    )}
                  </div>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getScoreColor(member.currentScore) }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderBreakdownView = () => (
    <div className="space-y-6">
      {/* 雷达图 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">健康维度对比</h4>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={breakdownData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="member" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar name="运动" dataKey="运动" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            <Radar name="营养" dataKey="营养" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="睡眠" dataKey="睡眠" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            <Radar name="压力" dataKey="压力" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 详细对比表 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">详细评分对比</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  总分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  运动
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  营养
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  睡眠
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  压力
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.memberId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.memberName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={'font-semibold'} style={{ color: getScoreColor(member.currentScore) }}>
                      {member.currentScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.breakdown.exercise}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.breakdown.nutrition}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.breakdown.sleep}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.breakdown.stress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTrendsView = () => (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-4">7天评分趋势</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[60, 100]} />
          <Tooltip />
          <Legend />
          {filteredMembers.map((member, index) => (
            <Line
              key={member.memberId}
              type="monotone"
              dataKey={member.memberName}
              stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderAchievementsView = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">成就与目标完成情况</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={achievementData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="成就数" fill="#fbbf24" />
            <Bar dataKey="完成目标" fill="#34d399" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map((member) => (
          <div key={member.memberId} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {member.memberName.charAt(0)}
                </span>
              </div>
              <h5 className="font-medium text-gray-900">{member.memberName}</h5>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">获得成就</span>
                <span className="font-medium text-gray-900">{member.achievements} 个</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">完成目标</span>
                <span className="font-medium text-gray-900">{member.goalsCompleted} 个</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">健康评分</span>
                <span className={'font-medium'} style={{ color: getScoreColor(member.currentScore) }}>
                  {member.currentScore} 分
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">家庭评分对比</h3>
            <p className="text-sm text-gray-500">家庭成员健康数据对比分析</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            <option value={7}>7天</option>
            <option value={30}>30天</option>
            <option value={90}>90天</option>
          </select>
        </div>
      </div>

      {/* 成员选择器 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择成员</label>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member.memberId}
              onClick={() => {
                setSelectedMembers(prev => 
                  prev.includes(member.memberId)
                    ? prev.filter(id => id !== member.memberId)
                    : [...prev, member.memberId]
                );
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMembers.includes(member.memberId)
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
              } border`}
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {member.memberName.charAt(0)}
                </span>
              </div>
              <span>{member.memberName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 视图选择器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'overview'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
          } border`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>总览</span>
        </button>
        <button
          onClick={() => setViewMode('breakdown')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'breakdown'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
          } border`}
        >
          <Heart className="h-4 w-4" />
          <span>细分对比</span>
        </button>
        <button
          onClick={() => setViewMode('trends')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'trends'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
          } border`}
        >
          <Activity className="h-4 w-4" />
          <span>趋势分析</span>
        </button>
        <button
          onClick={() => setViewMode('achievements')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'achievements'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
          } border`}
        >
          <Trophy className="h-4 w-4" />
          <span>成就对比</span>
        </button>
      </div>

      {/* 内容区域 */}
      <div>
        {viewMode === 'overview' && renderOverviewView()}
        {viewMode === 'breakdown' && renderBreakdownView()}
        {viewMode === 'trends' && renderTrendsView()}
        {viewMode === 'achievements' && renderAchievementsView()}
      </div>

      {/* 家庭健康建议 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">家庭健康建议</h4>
            <p className="text-sm text-blue-700 mt-1">
              {filteredMembers.length > 0 && (
                <>
                  家庭平均健康评分为 {Math.round(filteredMembers.reduce((acc, m) => acc + m.currentScore, 0) / filteredMembers.length)} 分。
                  {filteredMembers.some(m => m.currentScore < 80) && 
                    ' 建议关注评分较低的成员，共同制定健康改善计划。'
                  }
                  {filteredMembers.every(m => m.currentScore >= 80) && 
                    ' 家庭整体健康状况良好，继续保持健康的生活方式！'
                  }
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
