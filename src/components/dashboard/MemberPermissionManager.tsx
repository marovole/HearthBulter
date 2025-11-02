'use client'

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2,
  UserPlus,
  Crown,
  User,
  Baby,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock
} from 'lucide-react'

interface FamilyMember {
  id: string
  name: string
  email?: string
  avatar?: string
  role: 'admin' | 'member' | 'child'
  permissions: {
    viewHealthData: boolean
    editHealthData: boolean
    manageGoals: boolean
    viewNutrition: boolean
    editNutrition: boolean
    manageMembers: boolean
    exportData: boolean
  }
  joinedAt: Date
  lastActive: Date
}

interface MemberPermissionManagerProps {
  familyId: string
  onMemberUpdate?: (memberId: string, updates: Partial<FamilyMember>) => void
}

export function MemberPermissionManager({ 
  familyId, 
  onMemberUpdate 
}: MemberPermissionManagerProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [familyId])

  const loadMembers = async () => {
    try {
      setLoading(true)
      // 模拟API调用 - 实际应该调用真实的成员权限API
      const mockMembers: FamilyMember[] = [
        {
          id: '1',
          name: '张爸爸',
          email: 'dad@example.com',
          role: 'admin',
          permissions: {
            viewHealthData: true,
            editHealthData: true,
            manageGoals: true,
            viewNutrition: true,
            editNutrition: true,
            manageMembers: true,
            exportData: true,
          },
          joinedAt: new Date('2024-01-01'),
          lastActive: new Date()
        },
        {
          id: '2',
          name: '李妈妈',
          email: 'mom@example.com',
          role: 'admin',
          permissions: {
            viewHealthData: true,
            editHealthData: true,
            manageGoals: true,
            viewNutrition: true,
            editNutrition: true,
            manageMembers: true,
            exportData: true,
          },
          joinedAt: new Date('2024-01-01'),
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: '3',
          name: '小明',
          email: 'xiaoming@example.com',
          role: 'member',
          permissions: {
            viewHealthData: true,
            editHealthData: true,
            manageGoals: true,
            viewNutrition: true,
            editNutrition: false,
            manageMembers: false,
            exportData: false,
          },
          joinedAt: new Date('2024-02-01'),
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          id: '4',
          name: '小红',
          role: 'child',
          permissions: {
            viewHealthData: true,
            editHealthData: false,
            manageGoals: false,
            viewNutrition: true,
            editNutrition: false,
            manageMembers: false,
            exportData: false,
          },
          joinedAt: new Date('2024-03-01'),
          lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ]
      
      setMembers(mockMembers)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (memberId: string, permission: string, value: boolean) => {
    setMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { 
            ...member, 
            permissions: { 
              ...member.permissions, 
              [permission]: value 
            } 
          }
        : member
    ))
    
    onMemberUpdate?.(memberId, { 
      permissions: { 
        ...members.find(m => m.id === memberId)?.permissions, 
        [permission]: value 
      } 
    })
  }

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'member' | 'child') => {
    const defaultPermissions = {
      admin: {
        viewHealthData: true,
        editHealthData: true,
        manageGoals: true,
        viewNutrition: true,
        editNutrition: true,
        manageMembers: true,
        exportData: true,
      },
      member: {
        viewHealthData: true,
        editHealthData: true,
        manageGoals: true,
        viewNutrition: true,
        editNutrition: false,
        manageMembers: false,
        exportData: false,
      },
      child: {
        viewHealthData: true,
        editHealthData: false,
        manageGoals: false,
        viewNutrition: true,
        editNutrition: false,
        manageMembers: false,
        exportData: false,
      }
    }

    setMembers(prev => prev.map(member => 
      member.id === memberId 
        ? { 
            ...member, 
            role: newRole,
            permissions: defaultPermissions[newRole]
          }
        : member
    ))
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'member':
        return <User className="h-4 w-4 text-blue-500" />
      case 'child':
        return <Baby className="h-4 w-4 text-green-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员'
      case 'member':
        return '成员'
      case 'child':
        return '儿童'
      default:
        return '成员'
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return '拥有所有权限，可以管理家庭成员和设置'
      case 'member':
        return '可以查看和编辑自己的健康数据，管理个人目标'
      case 'child':
        return '只能查看自己的健康数据，适合未成年人使用'
      default:
        return ''
    }
  }

  const permissionLabels = {
    viewHealthData: '查看健康数据',
    editHealthData: '编辑健康数据',
    manageGoals: '管理目标',
    viewNutrition: '查看营养信息',
    editNutrition: '编辑营养信息',
    manageMembers: '管理成员',
    exportData: '导出数据',
  }

  const permissionDescriptions = {
    viewHealthData: '查看体重、血压、运动等健康指标',
    editHealthData: '记录和修改健康数据',
    manageGoals: '设置和管理健康目标',
    viewNutrition: '查看饮食记录和营养分析',
    editNutrition: '记录饮食和营养信息',
    manageMembers: '添加、删除和修改家庭成员',
    exportData: '导出健康数据报告',
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">加载成员权限中...</p>
          </div>
        </div>
      </div>
    )
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
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">成员权限管理</h3>
              <p className="text-sm text-gray-500">管理家庭成员的访问权限和角色</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>添加成员</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* 成员列表 */}
        <div className="space-y-6">
          {members.map((member) => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">{member.name}</h4>
                      {getRoleIcon(member.role)}
                      <span className="text-sm text-gray-500">{getRoleText(member.role)}</span>
                    </div>
                    {member.email && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      加入时间: {member.joinedAt.toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 角色选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户角色
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['admin', 'member', 'child'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(member.id, role)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        member.role === role
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {getRoleIcon(role)}
                        <span className="font-medium text-sm">{getRoleText(role)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{getRoleDescription(role)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 权限设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  详细权限
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {member.permissions[key as keyof typeof member.permissions] ? (
                            <Unlock className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900">{label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {permissionDescriptions[key as keyof typeof permissionDescriptions]}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePermissionChange(
                          member.id, 
                          key, 
                          !member.permissions[key as keyof typeof member.permissions]
                        )}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          member.permissions[key as keyof typeof member.permissions]
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            member.permissions[key as keyof typeof member.permissions]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 权限说明 */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">权限说明</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• <strong>管理员</strong>：拥有所有权限，可以管理家庭账户的所有设置</li>
                <li>• <strong>成员</strong>：可以管理自己的健康数据，查看家庭其他成员的基本信息</li>
                <li>• <strong>儿童</strong>：只能查看自己的健康数据，无法编辑敏感信息</li>
                <li>• 权限修改会立即生效，建议根据成员年龄和责任合理分配权限</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
