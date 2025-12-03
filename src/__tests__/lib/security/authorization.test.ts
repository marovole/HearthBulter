/**
 * 授权中间件单元测试
 */

// Mock dependencies BEFORE imports
const mockAuth = jest.fn();
const mockSupabaseAdapter = {
  familyMember: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  inventoryItem: {
    findUnique: jest.fn(),
  },
  healthReport: {
    findUnique: jest.fn(),
  },
  mealPlan: {
    findUnique: jest.fn(),
  },
  recipe: {
    findUnique: jest.fn(),
  },
  notification: {
    findUnique: jest.fn(),
  },
  budget: {
    findUnique: jest.fn(),
  },
  healthGoal: {
    findUnique: jest.fn(),
  },
  medicalReport: {
    findUnique: jest.fn(),
  },
  aiConversation: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

jest.mock('@/lib/db/supabase-adapter', () => ({
  supabaseAdapter: mockSupabaseAdapter,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  requireFamilyMembership,
  requireAdmin,
  requireOwnership,
  requireFamilyAccess,
  getAuthenticatedUser,
} from '@/lib/middleware/authorization';

describe('Authorization Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireFamilyMembership', () => {
    const userId = 'user-123';
    const memberId = 'member-456';
    const familyId = 'family-789';

    it('应该在成员不存在时返回未授权', async () => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue(null);

      const result = await requireFamilyMembership(userId, memberId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('家庭成员不存在');
    });

    it('应该在成员已删除时返回未授权', async () => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue({
        id: memberId,
        userId: 'other-user',
        familyId,
        deletedAt: new Date(),
      });

      const result = await requireFamilyMembership(userId, memberId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('家庭成员已被删除');
    });

    it('应该在用户是成员本人时返回授权', async () => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue({
        id: memberId,
        userId,
        familyId,
        deletedAt: null,
      });

      const result = await requireFamilyMembership(userId, memberId);

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
    });

    it('应该在用户是同一家庭成员时返回授权', async () => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue({
        id: memberId,
        userId: 'other-user',
        familyId,
        deletedAt: null,
      });

      mockSupabaseAdapter.familyMember.findFirst.mockResolvedValue({
        id: 'user-member-id',
        userId,
        familyId,
      });

      const result = await requireFamilyMembership(userId, memberId);

      expect(result.authorized).toBe(true);
    });

    it('应该在用户不是家庭成员时返回未授权', async () => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue({
        id: memberId,
        userId: 'other-user',
        familyId,
        deletedAt: null,
      });

      mockSupabaseAdapter.familyMember.findFirst.mockResolvedValue(null);

      const result = await requireFamilyMembership(userId, memberId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('无权访问此家庭成员数据');
    });
  });

  describe('requireAdmin', () => {
    const userId = 'user-123';

    it('应该在用户不存在时返回未授权', async () => {
      mockSupabaseAdapter.user.findUnique.mockResolvedValue(null);

      const result = await requireAdmin(userId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('用户不存在');
    });

    it('应该在用户不是管理员时返回未授权', async () => {
      mockSupabaseAdapter.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'USER',
      });

      const result = await requireAdmin(userId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('需要管理员权限');
    });

    it('应该在用户是管理员时返回授权', async () => {
      mockSupabaseAdapter.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
      });

      const result = await requireAdmin(userId);

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(userId);
    });
  });

  describe('requireOwnership', () => {
    const userId = 'user-123';
    const memberId = 'member-456';
    const familyId = 'family-789';

    beforeEach(() => {
      mockSupabaseAdapter.familyMember.findUnique.mockResolvedValue({
        id: memberId,
        userId,
        familyId,
        deletedAt: null,
      });
    });

    it('应该验证库存项所有权', async () => {
      mockSupabaseAdapter.inventoryItem.findUnique.mockResolvedValue({
        memberId,
      });

      const result = await requireOwnership(userId, 'inventory_item', 'item-123');

      expect(result.authorized).toBe(true);
    });

    it('应该在资源不存在时返回未授权', async () => {
      mockSupabaseAdapter.inventoryItem.findUnique.mockResolvedValue(null);

      const result = await requireOwnership(userId, 'inventory_item', 'item-123');

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('资源不存在');
    });

    it('应该验证食谱所有权', async () => {
      mockSupabaseAdapter.recipe.findUnique.mockResolvedValue({
        creatorId: userId,
      });

      const result = await requireOwnership(userId, 'recipe', 'recipe-123');

      expect(result.authorized).toBe(true);
    });

    it('应该在用户不是食谱创建者时返回未授权', async () => {
      mockSupabaseAdapter.recipe.findUnique.mockResolvedValue({
        creatorId: 'other-user',
      });

      const result = await requireOwnership(userId, 'recipe', 'recipe-123');

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('无权访问此食谱');
    });

    it('应该返回不支持的资源类型错误', async () => {
      const result = await requireOwnership(userId, 'unknown_type' as any, 'id-123');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('不支持的资源类型');
    });
  });

  describe('requireFamilyAccess', () => {
    const userId = 'user-123';
    const familyId = 'family-789';

    it('应该在用户是家庭成员时返回授权', async () => {
      mockSupabaseAdapter.familyMember.findFirst.mockResolvedValue({
        id: 'member-id',
        userId,
        familyId,
      });

      const result = await requireFamilyAccess(userId, familyId);

      expect(result.authorized).toBe(true);
    });

    it('应该在用户不是家庭成员时返回未授权', async () => {
      mockSupabaseAdapter.familyMember.findFirst.mockResolvedValue(null);

      const result = await requireFamilyAccess(userId, familyId);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('无权访问此家庭');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('应该返回认证用户的 ID', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const userId = await getAuthenticatedUser();

      expect(userId).toBe('user-123');
    });

    it('应该在未认证时返回 null', async () => {
      mockAuth.mockResolvedValue(null);

      const userId = await getAuthenticatedUser();

      expect(userId).toBeNull();
    });

    it('应该在发生错误时返回 null', async () => {
      mockAuth.mockRejectedValue(new Error('Auth error'));

      const userId = await getAuthenticatedUser();

      expect(userId).toBeNull();
    });
  });
});
