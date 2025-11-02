import { FamilyMemberRole } from '@prisma/client';

// 权限操作类型
export enum Permission {
  // 任务权限
  CREATE_TASK = 'CREATE_TASK',
  READ_TASK = 'READ_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  DELETE_TASK = 'DELETE_TASK',
  ASSIGN_TASK = 'ASSIGN_TASK',
  
  // 活动权限
  CREATE_ACTIVITY = 'CREATE_ACTIVITY',
  READ_ACTIVITY = 'READ_ACTIVITY',
  UPDATE_ACTIVITY = 'UPDATE_ACTIVITY',
  DELETE_ACTIVITY = 'DELETE_ACTIVITY',
  
  // 评论权限
  CREATE_COMMENT = 'CREATE_COMMENT',
  READ_COMMENT = 'READ_COMMENT',
  UPDATE_COMMENT = 'UPDATE_COMMENT',
  DELETE_COMMENT = 'DELETE_COMMENT',
  
  // 家庭目标权限
  CREATE_GOAL = 'CREATE_GOAL',
  READ_GOAL = 'READ_GOAL',
  UPDATE_GOAL = 'UPDATE_GOAL',
  DELETE_GOAL = 'DELETE_GOAL',
  
  // 购物清单权限
  CREATE_SHOPPING_ITEM = 'CREATE_SHOPPING_ITEM',
  READ_SHOPPING_ITEM = 'READ_SHOPPING_ITEM',
  UPDATE_SHOPPING_ITEM = 'UPDATE_SHOPPING_ITEM',
  DELETE_SHOPPING_ITEM = 'DELETE_SHOPPING_ITEM',
  ASSIGN_SHOPPING_ITEM = 'ASSIGN_SHOPPING_ITEM',
  PURCHASE_SHOPPING_ITEM = 'PURCHASE_SHOPPING_ITEM',
  
  // 家庭管理权限
  MANAGE_FAMILY = 'MANAGE_FAMILY',
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  REMOVE_MEMBERS = 'REMOVE_MEMBERS',
  
  // 通用权限
  VIEW_FAMILY_DATA = 'VIEW_FAMILY_DATA'
}

// 角色权限映射
export const ROLE_PERMISSIONS: Record<FamilyMemberRole, Permission[]> = {
  [FamilyMemberRole.ADMIN]: [
    // 管理员拥有所有权限
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    
    Permission.CREATE_ACTIVITY,
    Permission.READ_ACTIVITY,
    Permission.UPDATE_ACTIVITY,
    Permission.DELETE_ACTIVITY,
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT,
    
    Permission.CREATE_GOAL,
    Permission.READ_GOAL,
    Permission.UPDATE_GOAL,
    Permission.DELETE_GOAL,
    
    Permission.CREATE_SHOPPING_ITEM,
    Permission.READ_SHOPPING_ITEM,
    Permission.UPDATE_SHOPPING_ITEM,
    Permission.DELETE_SHOPPING_ITEM,
    Permission.ASSIGN_SHOPPING_ITEM,
    Permission.PURCHASE_SHOPPING_ITEM,
    
    Permission.MANAGE_FAMILY,
    Permission.MANAGE_MEMBERS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    
    Permission.VIEW_FAMILY_DATA,
  ],
  
  [FamilyMemberRole.MEMBER]: [
    // 普通成员权限
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK, // 只能更新自己创建或分配给自己的任务
    Permission.DELETE_TASK, // 只能删除自己创建的任务
    
    Permission.CREATE_ACTIVITY,
    Permission.READ_ACTIVITY,
    Permission.UPDATE_ACTIVITY, // 只能更新自己的活动
    Permission.DELETE_ACTIVITY, // 只能删除自己的活动
    
    Permission.CREATE_COMMENT,
    Permission.READ_COMMENT,
    Permission.UPDATE_COMMENT, // 只能更新自己的评论
    Permission.DELETE_COMMENT, // 只能删除自己的评论
    
    Permission.CREATE_GOAL,
    Permission.READ_GOAL,
    Permission.UPDATE_GOAL, // 只能更新自己创建的目标
    Permission.DELETE_GOAL, // 只能删除自己创建的目标
    
    Permission.CREATE_SHOPPING_ITEM,
    Permission.READ_SHOPPING_ITEM,
    Permission.UPDATE_SHOPPING_ITEM, // 只能更新自己添加的购物项
    Permission.DELETE_SHOPPING_ITEM, // 只能删除自己添加的购物项
    Permission.ASSIGN_SHOPPING_ITEM,
    Permission.PURCHASE_SHOPPING_ITEM,
    
    Permission.VIEW_FAMILY_DATA,
  ],
  
  [FamilyMemberRole.GUEST]: [
    // 访客权限（只读）
    Permission.READ_TASK,
    Permission.READ_ACTIVITY,
    Permission.READ_COMMENT,
    Permission.READ_GOAL,
    Permission.READ_SHOPPING_ITEM,
    
    Permission.CREATE_COMMENT, // 访客可以评论
    Permission.UPDATE_COMMENT, // 只能更新自己的评论
    Permission.DELETE_COMMENT, // 只能删除自己的评论
    
    Permission.VIEW_FAMILY_DATA,
  ],
};

// 权限检查函数
export function hasPermission(
  userRole: FamilyMemberRole,
  permission: Permission,
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  // 检查角色是否拥有该权限
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions.includes(permission)) {
    return false;
  }
  
  // 对于需要所有权的操作，检查资源所有者
  if (resourceOwnerId && currentUserId) {
    const ownershipRequiredPermissions = [
      Permission.UPDATE_TASK,
      Permission.DELETE_TASK,
      Permission.UPDATE_ACTIVITY,
      Permission.DELETE_ACTIVITY,
      Permission.UPDATE_COMMENT,
      Permission.DELETE_COMMENT,
      Permission.UPDATE_GOAL,
      Permission.DELETE_GOAL,
      Permission.UPDATE_SHOPPING_ITEM,
      Permission.DELETE_SHOPPING_ITEM,
    ];
    
    if (ownershipRequiredPermissions.includes(permission)) {
      // 管理员可以操作任何资源
      if (userRole === FamilyMemberRole.ADMIN) {
        return true;
      }
      
      // 其他角色只能操作自己的资源
      return resourceOwnerId === currentUserId;
    }
  }
  
  return true;
}

// 检查用户是否可以执行特定操作
export function canPerformAction(
  action: string,
  userRole: FamilyMemberRole,
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  const permission = action as Permission;
  return hasPermission(userRole, permission, resourceOwnerId, currentUserId);
}

// 获取用户在家庭中的角色
export async function getUserFamilyRole(
  userId: string,
  familyId: string,
  prisma: any
): Promise<FamilyMemberRole | null> {
  const member = await prisma.familyMember.findFirst({
    where: {
      userId,
      familyId,
      deletedAt: null,
    },
    select: {
      role: true,
    },
  });
  
  return member?.role || null;
}

// 检查用户是否是家庭管理员
export async function isFamilyAdmin(
  userId: string,
  familyId: string,
  prisma: any
): Promise<boolean> {
  const role = await getUserFamilyRole(userId, familyId, prisma);
  return role === FamilyMemberRole.ADMIN;
}

// 检查用户是否是家庭创建者
export async function isFamilyCreator(
  userId: string,
  familyId: string,
  prisma: any
): Promise<boolean> {
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      creatorId: userId,
      deletedAt: null,
    },
  });
  
  return !!family;
}

// 权限错误类
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

// 权限检查装饰器（用于API路由）
export function requirePermission(permission: Permission) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // 这里需要从请求中获取用户信息和家庭信息
      // 实际实现会在中间件中处理
      return method.apply(this, args);
    };
  };
}

// 常用权限组合
export const PERMISSIONS = {
  // 任务管理
  TASK_MANAGEMENT: [
    Permission.CREATE_TASK,
    Permission.READ_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
  ],
  
  // 活动管理
  ACTIVITY_MANAGEMENT: [
    Permission.CREATE_ACTIVITY,
    Permission.READ_ACTIVITY,
    Permission.UPDATE_ACTIVITY,
    Permission.DELETE_ACTIVITY,
  ],
  
  // 购物清单管理
  SHOPPING_MANAGEMENT: [
    Permission.CREATE_SHOPPING_ITEM,
    Permission.READ_SHOPPING_ITEM,
    Permission.UPDATE_SHOPPING_ITEM,
    Permission.DELETE_SHOPPING_ITEM,
    Permission.ASSIGN_SHOPPING_ITEM,
    Permission.PURCHASE_SHOPPING_ITEM,
  ],
  
  // 家庭管理
  FAMILY_MANAGEMENT: [
    Permission.MANAGE_FAMILY,
    Permission.MANAGE_MEMBERS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
  ],
  
  // 只读权限
  READ_ONLY: [
    Permission.READ_TASK,
    Permission.READ_ACTIVITY,
    Permission.READ_COMMENT,
    Permission.READ_GOAL,
    Permission.READ_SHOPPING_ITEM,
    Permission.VIEW_FAMILY_DATA,
  ],
};
