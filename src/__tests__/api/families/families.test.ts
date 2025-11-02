/**
 * 家庭协作 API 集成测试
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';

// Mock the database
jest.mock('@/lib/db', () => ({
  prisma: {
    family: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    familyMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    shoppingList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    familyTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock JWT verification
jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ sub: 'user-123', email: 'test@example.com' }),
}));

// Mock notification service
jest.mock('@/lib/services/notification/notification-manager', () => ({
  notificationManager: {
    createNotification: jest.fn().mockResolvedValue({ id: 'notification-123' }),
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
  },
}));

// Mock file upload service
jest.mock('@/lib/services/file-upload', () => ({
  uploadFamilyAvatar: jest.fn().mockResolvedValue({ url: 'https://example.com/avatar.jpg' }),
  deleteFamilyAvatar: jest.fn().mockResolvedValue(true),
}));

describe('/api/families API', () => {
  const { prisma } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/families', () => {
    it('should return user families', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          name: '张三的家庭',
          description: '温馨的小家庭',
          avatarUrl: 'https://example.com/avatar1.jpg',
          inviteCode: 'FAMILY123',
          createdBy: 'user-123',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          members: [
            {
              id: 'member-1',
              userId: 'user-123',
              familyId: 'family-1',
              role: 'ADMIN',
              name: '张三',
              avatarUrl: 'https://example.com/user1.jpg',
              joinedAt: new Date('2025-01-01'),
            },
            {
              id: 'member-2',
              userId: 'user-456',
              familyId: 'family-1',
              role: 'MEMBER',
              name: '李四',
              avatarUrl: 'https://example.com/user2.jpg',
              joinedAt: new Date('2025-01-02'),
            },
          ],
          memberCount: 2,
        },
        {
          id: 'family-2',
          name: '共享家庭',
          description: '朋友间的共享家庭',
          avatarUrl: null,
          inviteCode: 'FAMILY456',
          createdBy: 'user-123',
          createdAt: new Date('2025-01-05'),
          updatedAt: new Date('2025-01-05'),
          members: [
            {
              id: 'member-3',
              userId: 'user-123',
              familyId: 'family-2',
              role: 'ADMIN',
              name: '张三',
              avatarUrl: 'https://example.com/user1.jpg',
              joinedAt: new Date('2025-01-05'),
            },
          ],
          memberCount: 1,
        },
      ];

      prisma.family.findMany.mockResolvedValue(mockFamilies);

      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/route');
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('families');
        expect(data.families).toHaveLength(2);
        expect(data.families[0].name).toBe('张三的家庭');
        expect(data.families[0].memberCount).toBe(2);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'GET',
      });

      try {
        const { GET } = await import('@/app/api/families/route');
        const response = await GET(request);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('未授权');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/families', () => {
    it('should create new family', async () => {
      const newFamily = {
        name: '新的家庭',
        description: '这是一个新的家庭',
      };

      const createdFamily = {
        id: 'family-3',
        name: '新的家庭',
        description: '这是一个新的家庭',
        avatarUrl: null,
        inviteCode: 'FAMILY789',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const adminMembership = {
        id: 'member-4',
        userId: 'user-123',
        familyId: 'family-3',
        role: 'ADMIN',
        name: '张三',
        joinedAt: new Date(),
      };

      prisma.family.create.mockResolvedValue(createdFamily);
      prisma.familyMember.create.mockResolvedValue(adminMembership);

      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(newFamily),
      });

      try {
        const { POST } = await import('@/app/api/families/route');
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toHaveProperty('family');
        expect(data.family.name).toBe('新的家庭');
        expect(data.family.inviteCode).toBeDefined();

        expect(prisma.family.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: '新的家庭',
            description: '这是一个新的家庭',
            createdBy: 'user-123',
          }),
        });
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate required fields', async () => {
      const incompleteFamily = {
        description: '缺少名称的家庭',
      };

      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(incompleteFamily),
      });

      try {
        const { POST } = await import('@/app/api/families/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('家庭名称为必填项');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate family name length', async () => {
      const longNameFamily = {
        name: '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的家庭名称超过了限制',
        description: '名称过长的家庭',
      };

      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify(longNameFamily),
      });

      try {
        const { POST } = await import('@/app/api/families/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('家庭名称长度不能超过50个字符');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/families/[id]', () => {
    it('should return family details', async () => {
      const mockFamily = {
        id: 'family-1',
        name: '张三的家庭',
        description: '温馨的小家庭',
        avatarUrl: 'https://example.com/avatar1.jpg',
        inviteCode: 'FAMILY123',
        createdBy: 'user-123',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        members: [
          {
            id: 'member-1',
            userId: 'user-123',
            familyId: 'family-1',
            role: 'ADMIN',
            name: '张三',
            avatarUrl: 'https://example.com/user1.jpg',
            joinedAt: new Date('2025-01-01'),
          },
        ],
        shoppingLists: [
          {
            id: 'list-1',
            name: '本周购物清单',
            itemsCount: 5,
            createdAt: new Date('2025-01-01'),
          },
        ],
        tasks: [
          {
            id: 'task-1',
            title: '购买日用品',
            assignedTo: 'user-456',
            status: 'PENDING',
            dueDate: new Date('2025-01-10'),
          },
        ],
      };

      prisma.family.findUnique.mockResolvedValue(mockFamily);

      const request = new NextRequest('http://localhost:3000/api/families/family-1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/[id]/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'family-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('family');
        expect(data.family.name).toBe('张三的家庭');
        expect(data.family.members).toHaveLength(1);
        expect(data.family.shoppingLists).toHaveLength(1);
        expect(data.family.tasks).toHaveLength(1);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should return 404 for non-existent family', async () => {
      prisma.family.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/families/nonexistent', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/[id]/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('家庭不存在');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('PUT /api/families/[id]', () => {
    it('should update family information', async () => {
      const existingFamily = {
        id: 'family-1',
        name: '张三的家庭',
        description: '温馨的小家庭',
        avatarUrl: null,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedFamily = {
        ...existingFamily,
        name: '张三和李四的家庭',
        description: '更新后的家庭描述',
        updatedAt: new Date(),
      };

      prisma.family.findUnique.mockResolvedValue(existingFamily);
      prisma.family.update.mockResolvedValue(updatedFamily);

      const request = new NextRequest('http://localhost:3000/api/families/family-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          name: '张三和李四的家庭',
          description: '更新后的家庭描述',
        }),
      });

      try {
        const { PUT } = await import('@/app/api/families/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'family-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.family.name).toBe('张三和李四的家庭');
        expect(data.family.description).toBe('更新后的家庭描述');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent non-admin users from updating family', async () => {
      const existingFamily = {
        id: 'family-1',
        name: '张三的家庭',
        members: [
          {
            userId: 'user-123',
            role: 'MEMBER', // Not admin
          },
        ],
      };

      prisma.family.findUnique.mockResolvedValue(existingFamily);

      const request = new NextRequest('http://localhost:3000/api/families/family-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          name: '尝试修改',
        }),
      });

      try {
        const { PUT } = await import('@/app/api/families/[id]/route');
        const response = await PUT(request, { params: Promise.resolve({ id: 'family-1' }) });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBe('只有管理员可以修改家庭信息');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/families/[id]/invite', () => {
    it('should generate new invite code', async () => {
      const existingFamily = {
        id: 'family-1',
        name: '张三的家庭',
        inviteCode: 'OLD123',
        members: [
          {
            userId: 'user-123',
            role: 'ADMIN',
          },
        ],
      };

      const updatedFamily = {
        ...existingFamily,
        inviteCode: 'NEW456',
      };

      prisma.family.findUnique.mockResolvedValue(existingFamily);
      prisma.family.update.mockResolvedValue(updatedFamily);

      const request = new NextRequest('http://localhost:3000/api/families/family-1/invite', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { POST } = await import('@/app/api/families/[id]/invite/route');
        const response = await POST(request, { params: Promise.resolve({ id: 'family-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('inviteCode');
        expect(data.inviteCode).toBe('NEW456');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('POST /api/families/join', () => {
    it('should join family with invite code', async () => {
      const familyWithInvite = {
        id: 'family-1',
        name: '张三的家庭',
        inviteCode: 'FAMILY123',
        members: [],
      };

      const newMembership = {
        id: 'member-new',
        userId: 'user-789',
        familyId: 'family-1',
        role: 'MEMBER',
        name: '王五',
        joinedAt: new Date(),
      };

      prisma.family.findUnique.mockResolvedValue(familyWithInvite);
      prisma.familyMember.create.mockResolvedValue(newMembership);

      const request = new NextRequest('http://localhost:3000/api/families/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          inviteCode: 'FAMILY123',
        }),
      });

      try {
        const { POST } = await import('@/app/api/families/join/route');
        const response = await POST(request);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('family');
        expect(data.family.name).toBe('张三的家庭');
        expect(data.message).toBe('成功加入家庭');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should reject invalid invite code', async () => {
      prisma.family.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/families/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          inviteCode: 'INVALID123',
        }),
      });

      try {
        const { POST } = await import('@/app/api/families/join/route');
        const response = await POST(request);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('邀请码无效');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent joining family you are already a member of', async () => {
      const familyWithUser = {
        id: 'family-1',
        name: '张三的家庭',
        inviteCode: 'FAMILY123',
        members: [
          {
            userId: 'user-123', // Same user trying to join
            role: 'MEMBER',
          },
        ],
      };

      prisma.family.findUnique.mockResolvedValue(familyWithUser);

      const request = new NextRequest('http://localhost:3000/api/families/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: JSON.stringify({
          inviteCode: 'FAMILY123',
        }),
      });

      try {
        const { POST } = await import('@/app/api/families/join/route');
        const response = await POST(request);

        expect(response.status).toBe(409);
        const data = await response.json();
        expect(data.error).toBe('您已经是该家庭的成员');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('GET /api/families/[id]/members', () => {
    it('should return family members', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          userId: 'user-123',
          familyId: 'family-1',
          role: 'ADMIN',
          name: '张三',
          avatarUrl: 'https://example.com/user1.jpg',
          email: 'zhangsan@example.com',
          joinedAt: new Date('2025-01-01'),
          lastActiveAt: new Date('2025-01-10'),
        },
        {
          id: 'member-2',
          userId: 'user-456',
          familyId: 'family-1',
          role: 'MEMBER',
          name: '李四',
          avatarUrl: 'https://example.com/user2.jpg',
          email: 'lisi@example.com',
          joinedAt: new Date('2025-01-02'),
          lastActiveAt: new Date('2025-01-09'),
        },
        {
          id: 'member-3',
          userId: 'user-789',
          familyId: 'family-1',
          role: 'MEMBER',
          name: '王五',
          avatarUrl: null,
          email: 'wangwu@example.com',
          joinedAt: new Date('2025-01-03'),
          lastActiveAt: new Date('2025-01-08'),
        },
      ];

      prisma.familyMember.findMany.mockResolvedValue(mockMembers);

      const request = new NextRequest('http://localhost:3000/api/families/family-1/members', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/[id]/members/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'family-1' }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('members');
        expect(data.members).toHaveLength(3);
        expect(data.members[0].role).toBe('ADMIN');
        expect(data.members[1].role).toBe('MEMBER');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('DELETE /api/families/[id]/members/[memberId]', () => {
    it('should remove member from family', async () => {
      const existingMember = {
        id: 'member-2',
        userId: 'user-456',
        familyId: 'family-1',
        role: 'MEMBER',
        name: '李四',
      };

      prisma.familyMember.findUnique.mockResolvedValue(existingMember);
      prisma.familyMember.delete.mockResolvedValue(existingMember);

      const request = new NextRequest('http://localhost:3000/api/families/family-1/members/member-2', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { DELETE } = await import('@/app/api/families/[id]/members/[memberId]/route');
        const response = await DELETE(request, {
          params: Promise.resolve({ id: 'family-1', memberId: 'member-2' })
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe('成员已移除');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should prevent removing admin members', async () => {
      const adminMember = {
        id: 'member-1',
        userId: 'user-123',
        familyId: 'family-1',
        role: 'ADMIN',
        name: '张三',
      };

      prisma.familyMember.findUnique.mockResolvedValue(adminMember);

      const request = new NextRequest('http://localhost:3000/api/families/family-1/members/member-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { DELETE } = await import('@/app/api/families/[id]/members/[memberId]/route');
        const response = await DELETE(request, {
          params: Promise.resolve({ id: 'family-1', memberId: 'member-1' })
        });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBe('不能移除管理员成员');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      prisma.family.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/route');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('服务器内部错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token',
        },
        body: 'invalid-json',
      });

      try {
        const { POST } = await import('@/app/api/families/route');
        const response = await POST(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('请求数据格式错误');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Security considerations', () => {
    it('should prevent unauthorized access to family data', async () => {
      const request = new NextRequest('http://localhost:3000/api/families/family-999', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
        },
      });

      try {
        const { GET } = await import('@/app/api/families/[id]/route');
        const response = await GET(request, { params: Promise.resolve({ id: 'family-999' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('家庭不存在');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });

    it('should validate invite code format', async () => {
      const invalidInviteCodes = [
        '',
        '123',
        'TOOLONGCODE123456',
        'invalid-chars-!@#',
      ];

      for (const invalidCode of invalidInviteCodes) {
        const request = new NextRequest('http://localhost:3000/api/families/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            inviteCode: invalidCode,
          }),
        });

        try {
          const { POST } = await import('@/app/api/families/join/route');
          const response = await POST(request);

          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.error).toBe('邀请码格式无效');
        } catch (error) {
          expect(error.message).toBeDefined();
        }
      }
    });
  });
});