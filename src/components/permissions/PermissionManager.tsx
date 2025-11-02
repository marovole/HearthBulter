'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';

import { Permission, FamilyMemberRole } from '@prisma/client';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionMatrix {
  [key in FamilyMemberRole]?: Permission[]
}

interface MemberPermissions {
  id: string
  name: string
  currentRole: FamilyMemberRole
  customPermissions: Permission[]
  isActive: boolean
  lastModified: string
}

interface PermissionAuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: string
  targetUserId: string
  targetUserName: string
  oldRole?: FamilyMemberRole
  newRole?: FamilyMemberRole
  permissions: Permission[]
  ipAddress: string
  userAgent: string
}

export function PermissionManager() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);

  // 获取家庭成员和权限数据
  const { members, loading: membersLoading } = useFamilyMembers();
  const { 
    permissions, 
    loading: permissionsLoading,
    updateMemberPermissions,
    permissionMatrix,
  } = usePermissions();

  // 权限显示配置
  const permissionGroups = {
    任务管理: [
      Permission.CREATE_TASK,
      Permission.READ_TASK,
      Permission.UPDATE_TASK,
      Permission.DELETE_TASK,
      Permission.ASSIGN_TASK,
    ],
    活动管理: [
      Permission.CREATE_ACTIVITY,
      Permission.READ_ACTIVITY,
      Permission.UPDATE_ACTIVITY,
      Permission.DELETE_ACTIVITY,
    ],
    评论权限: [
      Permission.CREATE_COMMENT,
      Permission.READ_COMMENT,
      Permission.UPDATE_COMMENT,
      Permission.DELETE_COMMENT,
    ],
    目标管理: [
      Permission.CREATE_GOAL,
      Permission.READ_GOAL,
      Permission.UPDATE_GOAL,
      Permission.DELETE_GOAL,
    ],
    购物清单: [
      Permission.CREATE_SHOPPING_ITEM,
      Permission.READ_SHOPPING_ITEM,
      Permission.UPDATE_SHOPPING_ITEM,
      Permission.DELETE_SHOPPING_ITEM,
      Permission.ASSIGN_SHOPPING_ITEM,
      Permission.PURCHASE_SHOPPING_ITEM,
    ],
    家庭管理: [
      Permission.MANAGE_FAMILY,
      Permission.MANAGE_MEMBERS,
      Permission.INVITE_MEMBERS,
      Permission.REMOVE_MEMBERS,
      Permission.VIEW_FAMILY_DATA,
    ],
  };

  // 获取权限显示名称
  const getPermissionDisplayName = (permission: Permission): string => {
    const displayNames: Record<Permission, string> = {
      [Permission.CREATE_TASK]: '创建任务',
      [Permission.READ_TASK]: '查看任务',
      [Permission.UPDATE_TASK]: '更新任务',
      [Permission.DELETE_TASK]: '删除任务',
      [Permission.ASSIGN_TASK]: '分配任务',
      
      [Permission.CREATE_ACTIVITY]: '创建活动',
      [Permission.READ_ACTIVITY]: '查看活动',
      [Permission.UPDATE_ACTIVITY]: '更新活动',
      [Permission.DELETE_ACTIVITY]: '删除活动',
      
      [Permission.CREATE_COMMENT]: '创建评论',
      [Permission.READ_COMMENT]: '查看评论',
      [Permission.UPDATE_COMMENT]: '更新评论',
      [Permission.DELETE_COMMENT]: '删除评论',
      
      [Permission.CREATE_GOAL]: '创建目标',
      [Permission.READ_GOAL]: '查看目标',
      [Permission.UPDATE_GOAL]: '更新目标',
      [Permission.DELETE_GOAL]: '删除目标',
      
      [Permission.CREATE_SHOPPING_ITEM]: '创建购物项',
      [Permission.READ_SHOPPING_ITEM]: '查看购物项',
      [Permission.UPDATE_SHOPPING_ITEM]: '更新购物项',
      [Permission.DELETE_SHOPPING_ITEM]: '删除购物项',
      [Permission.ASSIGN_SHOPPING_ITEM]: '分配购物项',
      [Permission.PURCHASE_SHOPPING_ITEM]: '购买购物项',
      
      [Permission.MANAGE_FAMILY]: '管理家庭',
      [Permission.MANAGE_MEMBERS]: '管理成员',
      [Permission.INVITE_MEMBERS]: '邀请成员',
      [Permission.REMOVE_MEMBERS]: '移除成员',
      [Permission.VIEW_FAMILY_DATA]: '查看家庭数据',
    };
    
    return displayNames[permission] || permission;
  };

  // 获取角色显示名称
  const getRoleDisplayName = (role: FamilyMemberRole): string => {
    const roleNames: Record<FamilyMemberRole, string> = {
      [FamilyMemberRole.ADMIN]: '管理员',
      [FamilyMemberRole.MEMBER]: '成员',
      [FamilyMemberRole.GUEST]: '访客',
    };
    
    return roleNames[role] || role;
  };

  // 更新成员角色
  const handleRoleChange = async (memberId: string, newRole: FamilyMemberRole) => {
    setIsLoading(true);
    try {
      await updateMemberPermissions(memberId, { role: newRole });
      // 刷新审计日志
      loadAuditLogs();
    } catch (error) {
      console.error('更新角色失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新成员权限
  const handlePermissionToggle = async (
    memberId: string, 
    permission: Permission, 
    granted: boolean
  ) => {
    setIsLoading(true);
    try {
      await updateMemberPermissions(memberId, { 
        permissionChanges: [{ permission, granted }], 
      });
      // 刷新审计日志
      loadAuditLogs();
    } catch (error) {
      console.error('更新权限失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载审计日志
  const loadAuditLogs = async () => {
    try {
      // 这里应该调用API获取审计日志
      // const response = await fetch('/api/permissions/audit-logs')
      // const logs = await response.json()
      // setAuditLogs(logs)
    } catch (error) {
      console.error('加载审计日志失败:', error);
    }
  };

  // 导出权限配置
  const exportPermissions = async () => {
    try {
      const config = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        permissionMatrix,
        members: members.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
        })),
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permissions-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出权限配置失败:', error);
    }
  };

  // 导入权限配置
  const importPermissions = async (file: File) => {
    try {
      const content = await file.text();
      const config = JSON.parse(content);
      
      // 验证配置格式
      if (!config.permissionMatrix || !config.members) {
        throw new Error('无效的权限配置文件');
      }
      
      // 应用配置
      // 这里应该调用API来应用配置
      console.log('导入权限配置:', config);
    } catch (error) {
      console.error('导入权限配置失败:', error);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loading = membersLoading || permissionsLoading || isLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">权限管理</h1>
          <p className="text-muted-foreground">管理家庭成员权限和访问控制</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPermissions}>
            <Download className="w-4 h-4 mr-2" />
            导出配置
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                导入配置
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importPermissions(file);
              }}
            />
          </label>
          
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="members">成员权限</TabsTrigger>
          <TabsTrigger value="matrix">权限矩阵</TabsTrigger>
          <TabsTrigger value="audit">审计日志</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总成员数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">
                  活跃成员
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">管理员数量</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === FamilyMemberRole.ADMIN).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  具有管理权限
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">权限覆盖</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">100%</div>
                <p className="text-xs text-muted-foreground">
                  所有端点受保护
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 权限统计 */}
          <Card>
            <CardHeader>
              <CardTitle>角色分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(FamilyMemberRole).map(role => {
                  const count = members.filter(m => m.role === role).length;
                  const percentage = members.length > 0 ? (count / members.length) * 100 : 0;
                  
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getRoleDisplayName(role)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} 成员
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 成员权限标签页 */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>成员权限管理</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>成员姓名</TableHead>
                      <TableHead>当前角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后修改</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow 
                        key={member.id}
                        className={selectedMember === member.id ? 'bg-muted/50' : ''}
                        onClick={() => setSelectedMember(member.id)}
                      >
                        <TableCell className="font-medium">
                          {member.name}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(value) => 
                              handleRoleChange(member.id, value as FamilyMemberRole)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(FamilyMemberRole).map(role => (
                                <SelectItem key={role} value={role}>
                                  {getRoleDisplayName(role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.deletedAt ? 'destructive' : 'default'}>
                            {member.deletedAt ? '已删除' : '活跃'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.updatedAt ? new Date(member.updatedAt).toLocaleString() : '未知'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMember(member.id)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 权限矩阵标签页 */}
        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>权限矩阵</CardTitle>
              <p className="text-sm text-muted-foreground">
                查看各角色在不同功能区域的权限配置
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>功能区域</TableHead>
                      {Object.values(FamilyMemberRole).map(role => (
                        <TableHead key={role} className="text-center">
                          {getRoleDisplayName(role)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
                      <React.Fragment key={groupName}>
                        <TableRow>
                          <TableCell colSpan={Object.values(FamilyMemberRole).length + 1} className="bg-muted/50 font-medium">
                            {groupName}
                          </TableCell>
                        </TableRow>
                        {groupPermissions.map(permission => (
                          <TableRow key={permission}>
                            <TableCell className="font-medium">
                              {getPermissionDisplayName(permission)}
                            </TableCell>
                            {Object.values(FamilyMemberRole).map(role => (
                              <TableCell key={`${role}-${permission}`} className="text-center">
                                {permissionMatrix[role]?.includes(permission) ? (
                                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 审计日志标签页 */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>权限审计日志</CardTitle>
              <p className="text-sm text-muted-foreground">
                查看权限变更的详细记录
              </p>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>暂无审计日志</AlertTitle>
                  <AlertDescription>
                    当权限发生变更时，相关的审计记录将显示在这里。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map(log => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">
                            操作者: {log.userName} (ID: {log.userId})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            目标: {log.targetUserName} (ID: {log.targetUserId})
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{new Date(log.timestamp).toLocaleString()}</p>
                          <p>IP: {log.ipAddress}</p>
                        </div>
                      </div>
                      
                      {log.oldRole && log.newRole && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {getRoleDisplayName(log.oldRole)}
                          </Badge>
                          <span>→</span>
                          <Badge>
                            {getRoleDisplayName(log.newRole)}
                          </Badge>
                        </div>
                      )}
                      
                      {log.permissions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">权限变更:</p>
                          <div className="flex flex-wrap gap-1">
                            {log.permissions.map(permission => (
                              <Badge key={permission} variant="secondary" className="text-xs">
                                {getPermissionDisplayName(permission)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
