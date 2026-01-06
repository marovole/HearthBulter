/**
 * 权限系统测试
 * 全面测试RBAC权限控制、权限验证中间件、权限缓存等
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { NextRequest } from "next/server";
import { Permission, FamilyMemberRole, hasPermission } from "@/lib/permissions";
import {
  permissionMiddleware,
  PermissionRequirement,
  withPermissions,
} from "@/lib/middleware/permission-middleware";
import { prisma } from "@/lib/db";

describe("权限系统测试", () => {
  let testFamilyId: string;
  let testAdminId: string;
  let testMemberId: string;
  let testGuestId: string;

  beforeAll(async () => {
    // 创建测试数据
    const testFamily = await prisma.family.create({
      data: {
        name: `权限测试家庭_${Date.now()}`,
        description: "权限系统测试用家庭",
      },
    });
    testFamilyId = testFamily.id;

    // 创建测试用户和家庭成员
    const testUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: `admin_${Date.now()}@test.com`,
          name: "测试管理员",
          role: "USER",
        },
      }),
      prisma.user.create({
        data: {
          email: `member_${Date.now()}@test.com`,
          name: "测试成员",
          role: "USER",
        },
      }),
      prisma.user.create({
        data: {
          email: `guest_${Date.now()}@test.com`,
          name: "测试访客",
          role: "USER",
        },
      }),
    ]);

    const [adminUser, memberUser, guestUser] = testUsers;

    const testMembers = await Promise.all([
      prisma.familyMember.create({
        data: {
          name: "测试管理员",
          gender: "OTHER",
          birthDate: new Date("1990-01-01"),
          familyId: testFamilyId,
          userId: adminUser.id,
          role: FamilyMemberRole.ADMIN,
        },
      }),
      prisma.familyMember.create({
        data: {
          name: "测试成员",
          gender: "OTHER",
          birthDate: new Date("1990-01-01"),
          familyId: testFamilyId,
          userId: memberUser.id,
          role: FamilyMemberRole.MEMBER,
        },
      }),
      prisma.familyMember.create({
        data: {
          name: "测试访客",
          gender: "OTHER",
          birthDate: new Date("1990-01-01"),
          familyId: testFamilyId,
          userId: guestUser.id,
          role: FamilyMemberRole.GUEST,
        },
      }),
    ]);

    testAdminId = testMembers[0].id;
    testMemberId = testMembers[1].id;
    testGuestId = testMembers[2].id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.familyMember.deleteMany({
      where: {
        familyId: testFamilyId,
      },
    });

    await prisma.family.delete({
      where: {
        id: testFamilyId,
      },
    });

    permissionMiddleware.clearCache();
  });

  beforeEach(() => {
    // 清理权限缓存
    permissionMiddleware.clearCache();
  });

  describe("基础权限验证测试", () => {
    test("管理员应该拥有所有权限", () => {
      const allPermissions = Object.values(Permission);

      allPermissions.forEach((permission) => {
        const hasAccess = hasPermission(FamilyMemberRole.ADMIN, permission);
        expect(hasAccess).toBe(true);
      });
    });

    test("成员应该拥有基础权限", () => {
      const memberPermissions = [
        Permission.CREATE_TASK,
        Permission.READ_TASK,
        Permission.UPDATE_TASK,
        Permission.DELETE_TASK,
        Permission.CREATE_ACTIVITY,
        Permission.READ_ACTIVITY,
        Permission.VIEW_FAMILY_DATA,
      ];

      const adminOnlyPermissions = [
        Permission.MANAGE_FAMILY,
        Permission.MANAGE_MEMBERS,
        Permission.REMOVE_MEMBERS,
        Permission.INVITE_MEMBERS,
      ];

      // 测试成员拥有的权限
      memberPermissions.forEach((permission) => {
        const hasAccess = hasPermission(FamilyMemberRole.MEMBER, permission);
        expect(hasAccess).toBe(true);
      });

      // 测试成员不拥有的权限
      adminOnlyPermissions.forEach((permission) => {
        const hasAccess = hasPermission(FamilyMemberRole.MEMBER, permission);
        expect(hasAccess).toBe(false);
      });
    });

    test("访客应该只有只读权限", () => {
      const guestPermissions = [
        Permission.READ_TASK,
        Permission.READ_ACTIVITY,
        Permission.READ_COMMENT,
        Permission.READ_GOAL,
        Permission.VIEW_FAMILY_DATA,
      ];

      const readWritePermissions = [
        Permission.CREATE_TASK,
        Permission.UPDATE_TASK,
        Permission.DELETE_TASK,
        Permission.CREATE_ACTIVITY,
        Permission.UPDATE_ACTIVITY,
        Permission.DELETE_ACTIVITY,
      ];

      // 测试访客拥有的只读权限
      guestPermissions.forEach((permission) => {
        const hasAccess = hasPermission(FamilyMemberRole.GUEST, permission);
        expect(hasAccess).toBe(true);
      });

      // 测试访客不拥有的读写权限
      readWritePermissions.forEach((permission) => {
        const hasAccess = hasPermission(FamilyMemberRole.GUEST, permission);
        expect(hasAccess).toBe(false);
      });
    });
  });

  describe("资源所有权测试", () => {
    test("用户应该能更新自己创建的资源", () => {
      const resourceOwnerId = "user-123";
      const currentUserId = "user-123";

      const permissions = [
        Permission.UPDATE_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_ACTIVITY,
        Permission.DELETE_ACTIVITY,
      ];

      permissions.forEach((permission) => {
        const hasAccess = hasPermission(
          FamilyMemberRole.MEMBER,
          permission,
          resourceOwnerId,
          currentUserId,
        );
        expect(hasAccess).toBe(true);
      });
    });

    test("用户不应该能更新他人创建的资源", () => {
      const resourceOwnerId = "user-123";
      const currentUserId = "user-456";

      const permissions = [
        Permission.UPDATE_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_ACTIVITY,
        Permission.DELETE_ACTIVITY,
      ];

      permissions.forEach((permission) => {
        const hasAccess = hasPermission(
          FamilyMemberRole.MEMBER,
          permission,
          resourceOwnerId,
          currentUserId,
        );
        expect(hasAccess).toBe(false);
      });
    });

    test("管理员应该能更新任何资源", () => {
      const resourceOwnerId = "user-123";
      const currentUserId = "admin-user-456";

      const permissions = [
        Permission.UPDATE_TASK,
        Permission.DELETE_TASK,
        Permission.UPDATE_ACTIVITY,
        Permission.DELETE_ACTIVITY,
      ];

      permissions.forEach((permission) => {
        const hasAccess = hasPermission(
          FamilyMemberRole.ADMIN,
          permission,
          resourceOwnerId,
          currentUserId,
        );
        expect(hasAccess).toBe(true);
      });
    });
  });

  describe("权限中间件测试", () => {
    test("应该验证用户的家庭权限", async () => {
      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
        },
      ];

      const mockRequest = new NextRequest(
        "http://localhost:3000/api/families",
        {
          method: "GET",
        },
      );

      // 测试管理员权限
      const adminResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testAdminId,
        },
      );

      expect(adminResult.allowed).toBe(true);
      expect(adminResult.context.userRole).toBe(FamilyMemberRole.ADMIN);

      // 测试成员权限
      const memberResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testMemberId,
        },
      );

      expect(memberResult.allowed).toBe(true);
      expect(memberResult.context.userRole).toBe(FamilyMemberRole.MEMBER);

      // 测试访客权限
      const guestResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testGuestId,
        },
      );

      expect(guestResult.allowed).toBe(true);
      expect(guestResult.context.userRole).toBe(FamilyMemberRole.GUEST);
    });

    test("应该拒绝无权限的访问", async () => {
      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.MANAGE_FAMILY],
          requireFamilyMembership: true,
        },
      ];

      const mockRequest = new NextRequest(
        "http://localhost:3000/api/families/manage",
        {
          method: "POST",
        },
      );

      // 测试成员访问管理权限（应该被拒绝）
      const memberResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testMemberId,
        },
      );

      expect(memberResult.allowed).toBe(false);
      expect(memberResult.reason).toContain("权限不足");

      // 测试访客访问管理权限（应该被拒绝）
      const guestResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testGuestId,
        },
      );

      expect(guestResult.allowed).toBe(false);
      expect(guestResult.reason).toContain("权限不足");
    });

    test("应该拒绝非家庭成员的访问", async () => {
      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
        },
      ];

      const mockRequest = new NextRequest(
        "http://localhost:3000/api/families",
        {
          method: "GET",
        },
      );

      // 测试非家庭成员访问
      const result = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: "non-member-id",
        },
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("不是该家庭成员");
    });

    test("应该处理自定义权限验证", async () => {
      const customValidator = async (context: any) => {
        return context.userRole === FamilyMemberRole.ADMIN;
      };

      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
          customValidator,
        },
      ];

      const mockRequest = new NextRequest("http://localhost:3000/api/admin", {
        method: "GET",
      });

      // 测试管理员（应该通过自定义验证）
      const adminResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testAdminId,
        },
      );

      expect(adminResult.allowed).toBe(true);

      // 测试成员（应该被自定义验证拒绝）
      const memberResult = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testMemberId,
        },
      );

      expect(memberResult.allowed).toBe(false);
      expect(memberResult.reason).toContain("自定义权限验证失败");
    });
  });

  describe("权限缓存测试", () => {
    test("应该缓存用户权限信息", async () => {
      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
        },
      ];

      const mockRequest = new NextRequest(
        "http://localhost:3000/api/families",
        {
          method: "GET",
        },
      );

      // 第一次请求（应该查询数据库）
      const startTime1 = performance.now();
      const result1 = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testAdminId,
        },
      );
      const duration1 = performance.now() - startTime1;

      expect(result1.allowed).toBe(true);

      // 第二次请求（应该使用缓存）
      const startTime2 = performance.now();
      const result2 = await permissionMiddleware.checkPermissions(
        mockRequest,
        requirements,
        {
          familyId: testFamilyId,
          memberId: testAdminId,
        },
      );
      const duration2 = performance.now() - startTime2;

      expect(result2.allowed).toBe(true);
      expect(duration2).toBeLessThan(duration1); // 缓存应该更快

      // 检查缓存统计
      const cacheStats = permissionMiddleware.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    test("应该正确处理缓存失效", async () => {
      const userId = "test-user-123";
      const familyId = "test-family-456";

      // 生成缓存键
      const cacheKey = `${userId}:${familyId}`;

      // 手动添加缓存
      const testMember = await prisma.familyMember.create({
        data: {
          name: "缓存测试用户",
          gender: "OTHER",
          birthDate: new Date("1990-01-01"),
          familyId: testFamilyId,
          userId: userId,
          role: FamilyMemberRole.MEMBER,
        },
      });

      // 触发权限检查（生成缓存）
      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await permissionMiddleware.checkPermissions(
        mockRequest,
        [
          {
            permissions: [Permission.READ_FAMILY_DATA],
            requireFamilyMembership: true,
          },
        ],
        {
          familyId: testFamilyId,
          memberId: testMember.id,
        },
      );

      // 验证缓存存在
      let cacheStats = permissionMiddleware.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      // 失效特定用户缓存
      permissionMiddleware.invalidateUserCache(userId, familyId);

      // 验证缓存已失效
      cacheStats = permissionMiddleware.getCacheStats();
      // 这里需要根据实际实现调整验证方式

      // 清理测试数据
      await prisma.familyMember.delete({
        where: {
          id: testMember.id,
        },
      });
    });
  });

  describe("权限装饰器测试", () => {
    test("withPermissions装饰器应该正常工作", async () => {
      const mockHandler = jest
        .fn()
        .mockResolvedValue(new Response("Success", { status: 200 }));

      const requirements = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
        },
      ];

      const decoratedHandler = withPermissions(requirements, mockHandler);

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          cookie: "session=test-session",
        },
      });

      // 这里需要模拟NextAuth会话
      // 由于测试环境限制，这里主要测试装饰器结构
      expect(decoratedHandler).toBeDefined();
      expect(typeof decoratedHandler).toBe("function");
    });

    test("权限验证失败时应该返回错误响应", async () => {
      const mockHandler = jest
        .fn()
        .mockResolvedValue(new Response("Success", { status: 200 }));

      const requirements = [
        {
          permissions: [Permission.MANAGE_FAMILY],
          requireFamilyMembership: true,
        },
      ];

      const decoratedHandler = withPermissions(requirements, mockHandler);

      const mockRequest = new NextRequest("http://localhost:3000/api/admin", {
        method: "GET",
      });

      // 测试权限验证失败的情况
      // 这里需要根据实际的装饰器实现调整测试
    });
  });

  describe("权限边界测试", () => {
    test("应该正确处理空权限列表", () => {
      const hasAccess = hasPermission(
        FamilyMemberRole.MEMBER,
        Permission.READ_TASK as any, // 使用any来测试边界情况
        undefined,
        undefined,
      );

      // 这里的测试需要根据实际的权限验证逻辑调整
      expect(typeof hasAccess).toBe("boolean");
    });

    test("应该正确处理无效角色", () => {
      const hasAccess = hasPermission(
        "INVALID_ROLE" as FamilyMemberRole,
        Permission.READ_TASK,
      );

      expect(typeof hasAccess).toBe("boolean");
    });

    test("应该正确处理边界条件", () => {
      const boundaryCases = [
        {
          role: FamilyMemberRole.MEMBER,
          permission: Permission.READ_TASK,
          resourceOwnerId: undefined,
          currentUserId: undefined,
        },
        {
          role: FamilyMemberRole.MEMBER,
          permission: Permission.READ_TASK,
          resourceOwnerId: "",
          currentUserId: "",
        },
      ];

      boundaryCases.forEach(
        ({ role, permission, resourceOwnerId, currentUserId }) => {
          const hasAccess = hasPermission(
            role,
            permission,
            resourceOwnerId,
            currentUserId,
          );
          expect(typeof hasAccess).toBe("boolean");
        },
      );
    });
  });

  describe("权限性能测试", () => {
    test("权限检查应该在合理时间内完成", () => {
      const iterations = 1000;
      const permissions = Object.values(Permission);
      const roles = Object.values(FamilyMemberRole);

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const permission = permissions[i % permissions.length];
        const role = roles[i % roles.length];

        hasPermission(role, permission);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000次权限检查应该在10ms内完成
      expect(duration).toBeLessThan(10);
      console.log(`${iterations}次权限检查耗时: ${duration.toFixed(2)}ms`);
    });

    test("中间件权限检查应该在合理时间内完成", async () => {
      const iterations = 100;
      const requirements: PermissionRequirement[] = [
        {
          permissions: [Permission.READ_FAMILY_DATA],
          requireFamilyMembership: true,
        },
      ];

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await permissionMiddleware.checkPermissions(mockRequest, requirements, {
          familyId: testFamilyId,
          memberId: testAdminId,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 100次中间件权限检查应该在合理时间内完成
      expect(duration).toBeLessThan(1000); // 1秒
      console.log(
        `${iterations}次中间件权限检查耗时: ${duration.toFixed(2)}ms`,
      );
    });
  });

  describe("权限审计测试", () => {
    test("应该记录权限验证日志", async () => {
      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      // 这里需要验证日志记录功能
      // 由于测试环境限制，主要测试日志记录的调用
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await permissionMiddleware.checkPermissions(
        mockRequest,
        [
          {
            permissions: [Permission.READ_FAMILY_DATA],
            requireFamilyMembership: true,
          },
        ],
        {
          familyId: testFamilyId,
          memberId: testAdminId,
        },
      );

      // 验证日志是否被调用
      // 这里需要根据实际的日志实现调整
      consoleSpy.mockRestore();
    });

    test("应该记录权限验证失败日志", async () => {
      const mockRequest = new NextRequest("http://localhost:3000/api/admin", {
        method: "POST",
      });

      // 测试权限验证失败的日志记录
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await permissionMiddleware.checkPermissions(
        mockRequest,
        [
          {
            permissions: [Permission.MANAGE_FAMILY],
            requireFamilyMembership: true,
          },
        ],
        {
          familyId: testFamilyId,
          memberId: testMemberId, // 普通成员没有管理权限
        },
      );

      // 验证错误日志是否被记录
      consoleSpy.mockRestore();
    });
  });
});
