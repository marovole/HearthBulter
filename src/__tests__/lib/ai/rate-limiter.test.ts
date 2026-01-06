/**
 * AI速率限制器单元测试
 */

import { RateLimiter } from "@/lib/services/ai/rate-limiter";

describe("Rate Limiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    rateLimiter.clearAll();
  });

  describe("基础速率限制", () => {
    it("应该允许在限制内的请求", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";

      // 设置：每分钟5个请求
      const result1 = await rateLimiter.checkLimit(userId, endpoint, {
        windowMs: 60000,
        maxRequests: 5,
      });

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result1.resetTime).toBeDefined();
    });

    it("应该拒绝超过限制的请求", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";

      // 设置：每分钟2个请求
      const config = { windowMs: 60000, maxRequests: 2 };

      // 第一个请求
      const result1 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(1);

      // 第二个请求
      const result2 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(0);

      // 第三个请求（应该被拒绝）
      const result3 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
      expect(result3.retryAfter).toBeGreaterThan(0);
    });

    it("应该在窗口重置后重新允许请求", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";

      // 设置：每秒1个请求
      const config = { windowMs: 1000, maxRequests: 1 };

      // 第一个请求
      const result1 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result1.allowed).toBe(true);

      // 第二个请求（应该被拒绝）
      const result2 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result2.allowed).toBe(false);

      // 快进1秒
      jest.advanceTimersByTime(1000);

      // 现在应该再次被允许
      const result3 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result3.allowed).toBe(true);
    });
  });

  describe("多用户隔离", () => {
    it("应该为不同用户独立计算速率限制", async () => {
      const endpoint = "ai_chat";
      const config = { windowMs: 60000, maxRequests: 2 };

      // 用户1的请求
      const user1Result1 = await rateLimiter.checkLimit(
        "user-1",
        endpoint,
        config,
      );
      const user1Result2 = await rateLimiter.checkLimit(
        "user-1",
        endpoint,
        config,
      );
      const user1Result3 = await rateLimiter.checkLimit(
        "user-1",
        endpoint,
        config,
      );

      expect(user1Result1.allowed).toBe(true);
      expect(user1Result2.allowed).toBe(true);
      expect(user1Result3.allowed).toBe(false); // 超出限制

      // 用户2的请求（应该不受用户1影响）
      const user2Result1 = await rateLimiter.checkLimit(
        "user-2",
        endpoint,
        config,
      );
      expect(user2Result1.allowed).toBe(true);
    });

    it("应该为不同端点独立计算速率限制", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 1 };

      // 聊天端点
      const chatResult = await rateLimiter.checkLimit(
        userId,
        "ai_chat",
        config,
      );
      expect(chatResult.allowed).toBe(true);

      // 分析端点（应该不受聊天端点影响）
      const analysisResult = await rateLimiter.checkLimit(
        userId,
        "ai_analyze_health",
        config,
      );
      expect(analysisResult.allowed).toBe(true);

      // 再次请求聊天端点（应该被拒绝）
      const chatResult2 = await rateLimiter.checkLimit(
        userId,
        "ai_chat",
        config,
      );
      expect(chatResult2.allowed).toBe(false);
    });
  });

  describe("滑动窗口算法", () => {
    it("应该正确实现滑动窗口", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";
      const config = { windowMs: 10000, maxRequests: 3 }; // 10秒内3个请求

      // 在时间0：第1个请求
      const result1 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result1.allowed).toBe(true);

      // 在时间3秒：第2个请求
      jest.advanceTimersByTime(3000);
      const result2 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result2.allowed).toBe(true);

      // 在时间6秒：第3个请求
      jest.advanceTimersByTime(3000);
      const result3 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result3.allowed).toBe(true);

      // 在时间8秒：第4个请求（应该被拒绝）
      jest.advanceTimersByTime(2000);
      const result4 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result4.allowed).toBe(false);

      // 在时间11秒：第1个请求已经滑出窗口，应该允许新请求
      jest.advanceTimersByTime(3000);
      const result5 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result5.allowed).toBe(true);
    });

    it("应该精确计算剩余请求数", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";
      const config = { windowMs: 10000, maxRequests: 5 };

      // 第1个请求
      const result1 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result1.remaining).toBe(4);

      // 第2个请求
      const result2 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result2.remaining).toBe(3);

      // 等待5秒，第一个请求滑出窗口
      jest.advanceTimersByTime(5000);

      // 第3个请求
      const result3 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result3.remaining).toBe(3); // 应该恢复一个请求
    });
  });

  describe("分级限制策略", () => {
    it("应该支持不同的限制策略", async () => {
      const userId = "user-123";

      // 为不同端点设置不同限制
      const chatConfig = { windowMs: 60000, maxRequests: 10 };
      const analysisConfig = { windowMs: 60000, maxRequests: 5 };
      const reportConfig = { windowMs: 3600000, maxRequests: 20 }; // 每小时

      // 聊天端点限制
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkLimit(
          userId,
          "ai_chat",
          chatConfig,
        );
        expect(result.allowed).toBe(true);
      }

      const chatOverflow = await rateLimiter.checkLimit(
        userId,
        "ai_chat",
        chatConfig,
      );
      expect(chatOverflow.allowed).toBe(false);

      // 分析端点限制（独立计算）
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit(
          userId,
          "ai_analyze_health",
          analysisConfig,
        );
        expect(result.allowed).toBe(true);
      }

      const analysisOverflow = await rateLimiter.checkLimit(
        userId,
        "ai_analyze_health",
        analysisConfig,
      );
      expect(analysisOverflow.allowed).toBe(false);
    });

    it("应该支持全局限制", async () => {
      const globalConfig = { windowMs: 60000, maxRequests: 5 };

      // 多个端点共享全局限制
      await rateLimiter.checkLimit("user-1", "ai_chat", globalConfig);
      await rateLimiter.checkLimit("user-1", "ai_chat", globalConfig);
      await rateLimiter.checkLimit("user-1", "ai_analyze_health", globalConfig);
      await rateLimiter.checkLimit("user-1", "ai_analyze_health", globalConfig);
      await rateLimiter.checkLimit(
        "user-1",
        "ai_generate_report",
        globalConfig,
      );

      // 第6个请求（任何端点）都应该被拒绝
      const overflowResult = await rateLimiter.checkLimit(
        "user-1",
        "ai_chat",
        globalConfig,
      );
      expect(overflowResult.allowed).toBe(false);
    });
  });

  describe("动态调整", () => {
    it("应该支持动态调整限制", async () => {
      const userId = "user-123";
      const endpoint = "ai_chat";
      let config = { windowMs: 60000, maxRequests: 2 };

      // 使用初始限制
      await rateLimiter.checkLimit(userId, endpoint, config);
      await rateLimiter.checkLimit(userId, endpoint, config);

      const result1 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result1.allowed).toBe(false);

      // 动态提高限制
      config = { windowMs: 60000, maxRequests: 5 };

      // 现在应该允许更多请求
      const result2 = await rateLimiter.checkLimit(userId, endpoint, config);
      expect(result2.allowed).toBe(true);
    });

    it("应该支持基于用户等级的不同限制", async () => {
      const baseUserId = "user-123";
      const premiumUserId = "user-456";

      const baseConfig = { windowMs: 60000, maxRequests: 5 };
      const premiumConfig = { windowMs: 60000, maxRequests: 20 };

      // 基础用户限制
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit(
          baseUserId,
          "ai_chat",
          baseConfig,
        );
        expect(result.allowed).toBe(true);
      }

      const baseOverflow = await rateLimiter.checkLimit(
        baseUserId,
        "ai_chat",
        baseConfig,
      );
      expect(baseOverflow.allowed).toBe(false);

      // 高级用户限制
      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.checkLimit(
          premiumUserId,
          "ai_chat",
          premiumConfig,
        );
        expect(result.allowed).toBe(true);
      }

      const premiumOverflow = await rateLimiter.checkLimit(
        premiumUserId,
        "ai_chat",
        premiumConfig,
      );
      expect(premiumOverflow.allowed).toBe(false);
    });
  });

  describe("统计和监控", () => {
    it("应该正确跟踪统计信息", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 3 };

      // 发送一些请求
      await rateLimiter.checkLimit(userId, "ai_chat", config); // 允许
      await rateLimiter.checkLimit(userId, "ai_chat", config); // 允许
      await rateLimiter.checkLimit(userId, "ai_chat", config); // 允许
      await rateLimiter.checkLimit(userId, "ai_chat", config); // 拒绝

      const stats = rateLimiter.getStats(userId, "ai_chat");

      expect(stats.totalRequests).toBe(4);
      expect(stats.allowedRequests).toBe(3);
      expect(stats.blockedRequests).toBe(1);
      expect(stats.blockRate).toBe(25); // 1/4 = 25%
      expect(stats.currentUsage).toBe(3);
      expect(stats.remainingRequests).toBe(0);
    });

    it("应该支持全局统计", async () => {
      const config = { windowMs: 60000, maxRequests: 2 };

      // 多个用户的请求
      await rateLimiter.checkLimit("user-1", "ai_chat", config);
      await rateLimiter.checkLimit("user-1", "ai_chat", config);
      await rateLimiter.checkLimit("user-1", "ai_chat", config); // 被阻止

      await rateLimiter.checkLimit("user-2", "ai_chat", config);
      await rateLimiter.checkLimit("user-2", "ai_chat", config);

      const globalStats = rateLimiter.getGlobalStats("ai_chat");

      expect(globalStats.totalUsers).toBe(2);
      expect(globalStats.totalRequests).toBe(5);
      expect(globalStats.allowedRequests).toBe(4);
      expect(globalStats.blockedRequests).toBe(1);
      expect(globalStats.averageRequestsPerUser).toBe(2.5);
    });

    it("应该支持按时间范围的统计", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 10 };

      // 在不同时间发送请求
      await rateLimiter.checkLimit(userId, "ai_chat", config);

      jest.advanceTimersByTime(30000); // 30秒后

      await rateLimiter.checkLimit(userId, "ai_chat", config);

      jest.advanceTimersByTime(40000); // 40秒后（总共70秒）

      await rateLimiter.checkLimit(userId, "ai_chat", config);

      // 获取最近60秒的统计
      const recentStats = rateLimiter.getStatsByTimeRange(
        userId,
        "ai_chat",
        60000,
      );
      expect(recentStats.totalRequests).toBe(2); // 只有最近60秒内的请求

      // 获取所有时间的统计
      const allTimeStats = rateLimiter.getStatsByTimeRange(
        userId,
        "ai_chat",
        Infinity,
      );
      expect(allTimeStats.totalRequests).toBe(3);
    });
  });

  describe("错误处理", () => {
    it("应该处理无效的配置", async () => {
      const userId = "user-123";

      // 负数限制
      await expect(
        rateLimiter.checkLimit(userId, "ai_chat", {
          windowMs: -1,
          maxRequests: -1,
        }),
      ).rejects.toThrow();

      // 零限制
      const result = await rateLimiter.checkLimit(userId, "ai_chat", {
        windowMs: 60000,
        maxRequests: 0,
      });
      expect(result.allowed).toBe(false);
    });

    it("应该处理内存不足情况", async () => {
      // Mock内存不足
      const originalCheckLimit = rateLimiter.checkLimit;
      rateLimiter.checkLimit = jest
        .fn()
        .mockRejectedValue(new Error("Out of memory"));

      await expect(
        rateLimiter.checkLimit("user-123", "ai_chat", {
          windowMs: 60000,
          maxRequests: 10,
        }),
      ).rejects.toThrow("Out of memory");
    });

    it("应该处理系统时间回退", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 2 };

      // 正常请求
      await rateLimiter.checkLimit(userId, "ai_chat", config);

      // 模拟时间回退（这在实际中不应该发生，但需要防御）
      jest.advanceTimersByTime(-1000);

      // 应该能够优雅处理
      const result = await rateLimiter.checkLimit(userId, "ai_chat", config);
      expect(result.allowed).toBe(true);
    });
  });

  describe("性能测试", () => {
    it("应该快速处理大量请求", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 1000 };

      const startTime = performance.now();

      // 发送1000个请求
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(rateLimiter.checkLimit(userId, "ai_chat", config));
      }
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(results.length).toBe(1000);

      // 前1000个请求都应该被允许
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });

    it("应该高效处理多用户并发请求", async () => {
      const config = { windowMs: 60000, maxRequests: 10 };
      const userCount = 100;
      const requestsPerUser = 5;

      const startTime = performance.now();

      const promises = [];
      for (let userIndex = 0; userIndex < userCount; userIndex++) {
        const userId = `user-${userIndex}`;
        for (let reqIndex = 0; reqIndex < requestsPerUser; reqIndex++) {
          promises.push(rateLimiter.checkLimit(userId, "ai_chat", config));
        }
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
      expect(results.length).toBe(userCount * requestsPerUser);

      // 所有请求都应该被允许
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe("内存管理", () => {
    it("应该自动清理过期的用户数据", async () => {
      const userId = "user-123";
      const config = { windowMs: 1000, maxRequests: 5 };

      // 发送请求创建用户数据
      await rateLimiter.checkLimit(userId, "ai_chat", config);

      // 验证用户数据存在
      expect(rateLimiter.hasUserData(userId, "ai_chat")).toBe(true);

      // 等待数据过期
      jest.advanceTimersByTime(2000);

      // 手动触发清理
      rateLimiter.cleanup();

      // 用户数据应该被清理
      expect(rateLimiter.hasUserData(userId, "ai_chat")).toBe(false);
    });

    it("应该限制内存使用", () => {
      const initialMemory = rateLimiter.getMemoryUsage();
      expect(initialMemory).toBeDefined();
      expect(initialMemory.activeUsers).toBe(0);
      expect(initialMemory.totalEntries).toBe(0);
    });
  });

  describe("缓存断路器", () => {
    it("应该在系统负载过高时启用断路器", async () => {
      const userId = "user-123";
      const config = { windowMs: 60000, maxRequests: 10 };

      // 模拟高负载：快速发送大量请求
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(rateLimiter.checkLimit(`user-${i}`, "ai_chat", config));
      }
      await Promise.all(promises);

      // 检查断路器状态
      const circuitBreakerStatus =
        rateLimiter.getCircuitBreakerStatus("ai_chat");
      expect(circuitBreakerStatus).toBeDefined();
    });
  });
});
