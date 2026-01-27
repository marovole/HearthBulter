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
import { AddMemberDialog } from "./AddMemberDialog";

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
  familyId?: string;
  onMemberAdded?: () => void;
}

export function FamilyMembersCard({
  members,
  currentMemberId,
  onMemberSelect,
  familyId,
  onMemberAdded,
}: FamilyMembersCardProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "刚刚活跃";
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInHours < 48) return "昨天";
    if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const MemberCard = ({ member }: { member: FamilyMember }) => (
    <div
      className={`cursor-pointer rounded-lg border-2 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        currentMemberId === member.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
      onClick={() => onMemberSelect(member.id)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
            <span className="text-lg font-semibold text-white">{member.name.charAt(0)}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{member.name}</h4>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              {getRoleIcon(member.role)}
              <span>{getRoleText(member.role)}</span>
            </div>
          </div>
        </div>
        <button className="rounded-full p-1 hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-2">
        {/* 健康评分 */}
        {member.healthScore && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">健康评分</span>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${getHealthScoreColor(member.healthScore)}`}
            >
              {member.healthScore}
            </span>
          </div>
        )}

        {/* 最后活跃 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">最后活跃</span>
          <span className="text-sm text-gray-500">{formatLastActive(member.lastActive)}</span>
        </div>

        {/* 健康目标进度 */}
        {member.healthGoals && member.healthGoals.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="mb-1 text-sm text-gray-600">目标进度</div>
            {member.healthGoals.slice(0, 2).map((goal, index) => (
              <div key={index} className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-500">{goal.goalType}</span>
                <div className="flex items-center space-x-2">
                  <div className="h-1.5 w-16 rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
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
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-red-600">⚠️ 过敏:</span>
              <span className="text-xs text-red-600">{member.allergies.join(", ")}</span>
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
            <h3 className="text-lg font-semibold text-gray-900">家庭成员管理</h3>
            <p className="text-sm text-gray-500">共 {members.length} 位成员</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 视图切换 */}
          <div className="flex items-center rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              列表
            </button>
          </div>

          {/* 添加成员按钮 */}
          <button
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setAddDialogOpen(true)}
            disabled={!familyId}
          >
            <UserPlus className="h-4 w-4" />
            <span>添加成员</span>
          </button>
        </div>
      </div>

      {/* 添加成员对话框 */}
      {familyId && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          familyId={familyId}
          onSuccess={onMemberAdded}
        />
      )}

      {/* 成员列表 */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  成员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  健康评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  最后活跃
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    currentMemberId === member.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => onMemberSelect(member.id)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                        <span className="text-sm font-semibold text-white">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      {getRoleIcon(member.role)}
                      <span className="ml-2">{getRoleText(member.role)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {member.healthScore && (
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getHealthScoreColor(member.healthScore)}`}
                      >
                        {member.healthScore}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatLastActive(member.lastActive)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <button className="mr-3 text-blue-600 hover:text-blue-900">查看</button>
                    <button className="text-gray-600 hover:text-gray-900">编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 家庭统计 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">家庭成员</p>
              <p className="text-xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">平均健康评分</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.round(
                  members.reduce((acc, m) => acc + (m.healthScore || 0), 0) / members.length
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">活跃成员</p>
              <p className="text-xl font-semibold text-gray-900">
                {
                  members.filter(
                    (m) =>
                      m.lastActive && m.lastActive > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
