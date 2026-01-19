"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Settings,
  Shield,
  Activity,
  Heart,
  Calendar,
  Mail,
  MoreHorizontal,
  Crown,
  User,
} from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member" | "child";
  email?: string;
  healthScore?: number;
  lastActive?: Date;
  healthGoals?: Array<{
    goalType: string;
    target: number;
    current: number;
  }>;
  allergies?: string[];
  emergencyContact?: string;
}

interface FamilyMembersCardProps {
  members: FamilyMember[];
  currentMemberId: string;
  onMemberSelect: (memberId: string) => void;
}

export function FamilyMembersCard({
  members,
  currentMemberId,
  onMemberSelect,
}: FamilyMembersCardProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null,
  );

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 75) return "text-blue-600 bg-blue-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
    case "admin":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "member":
      return <User className="h-4 w-4 text-blue-500" />;
    case "child":
      return <User className="h-4 w-4 text-green-500" />;
    default:
      return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
    case "admin":
      return "管理员";
    case "member":
      return "成员";
    case "child":
      return "儿童";
    default:
      return "成员";
    }
  };

  const formatLastActive = (date?: Date) => {
    if (!date) return "从未活跃";

    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "刚刚活跃";
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInHours < 48) return "昨天";
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const MemberCard = ({ member }: { member: FamilyMember }) => (
    <div
      className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        currentMemberId === member.id
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200"
      }`}
      onClick={() => onMemberSelect(member.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <span className="text-lg font-semibold text-white">
              {member.name.charAt(0)}
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{member.name}</h4>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              {getRoleIcon(member.role)}
              <span>{getRoleText(member.role)}</span>
            </div>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-2">
        {/* 健康评分 */}
        {member.healthScore && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">健康评分</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthScoreColor(member.healthScore)}`}
            >
              {member.healthScore}
            </span>
          </div>
        )}

        {/* 最后活跃 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">最后活跃</span>
          <span className="text-sm text-gray-500">
            {formatLastActive(member.lastActive)}
          </span>
        </div>

        {/* 健康目标进度 */}
        {member.healthGoals && member.healthGoals.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-sm text-gray-600 mb-1">目标进度</div>
            {member.healthGoals.slice(0, 2).map((goal, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs mb-1"
              >
                <span className="text-gray-500">{goal.goalType}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-600">
                    {Math.round((goal.current / goal.target) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 过敏信息 */}
        {member.allergies && member.allergies.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-red-600">⚠️ 过敏:</span>
              <span className="text-xs text-red-600">
                {member.allergies.join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              家庭成员管理
            </h3>
            <p className="text-sm text-gray-500">共 {members.length} 位成员</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              列表
            </button>
          </div>

          {/* 添加成员按钮 */}
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlus className="h-4 w-4" />
            <span>添加成员</span>
          </button>
        </div>
      </div>

      {/* 成员列表 */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  成员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  健康评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后活跃
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    currentMemberId === member.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => onMemberSelect(member.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {getRoleIcon(member.role)}
                      <span className="ml-2">{getRoleText(member.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.healthScore && (
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getHealthScoreColor(member.healthScore)}`}
                      >
                        {member.healthScore}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastActive(member.lastActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      查看
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 家庭统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">家庭成员</p>
              <p className="text-xl font-semibold text-gray-900">
                {members.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">平均健康评分</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.round(
                  members.reduce((acc, m) => acc + (m.healthScore || 0), 0) /
                    members.length,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">活跃成员</p>
              <p className="text-xl font-semibold text-gray-900">
                {
                  members.filter(
                    (m) =>
                      m.lastActive &&
                      m.lastActive >
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
