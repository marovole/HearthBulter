# 主库切换日志 - 2025-11-17

**执行时间**: 2025-11-17 15:52:11 (UTC+8)
**操作类型**: Prisma → Supabase 主库切换
**执行状态**: ✅ 成功

---

## 切换前状态

```
Feature Flags:
- enableDualWrite: true
- enableSupabasePrimary: false (Prisma 为主)
- 最后更新: 2025-11-16T03:05:05.801+00:00

双写 Diff 状态:
- 最近 24 小时: 4 条 diff
- 严重程度: 全部为 info 级别
- 来源: /api/foods/categories/[category]
- 无 error 或 warning 级别 diff
```

## 切换操作

```bash
npx tsx scripts/dual-write/toggle-feature-flags.ts --primary=supabase

# 输出:
📝 准备更新配置:
  enableDualWrite: true → true
  enableSupabasePrimary: false → true

📋 新模式: 双写模式 - Supabase 为主, Prisma 为影子

✅ 更新成功!
```

## 切换后状态

```
Feature Flags:
- enableDualWrite: ✅ 开启
- enableSupabasePrimary: ✅ Supabase 为主
- 最后更新: 2025-11-17T07:52:11.381+00:00
```

---

## 监控检查点

### 即时检查 (切换后 15 分钟)
- [ ] 应用日志无异常错误
- [ ] Supabase 查询正常执行
- [ ] 没有新的 error 级别 diff 产生

### 短期监控 (24 小时)
- [ ] Diff 数量 < 10/天
- [ ] API 成功率 > 99.9%
- [ ] P95 延迟 < 200ms

### 中期监控 (3-7 天)
- [ ] Supabase 错误率 < 0.5%
- [ ] 无关键业务问题
- [ ] 性能稳定

---

## 回滚命令 (如需)

```bash
# 切回 Prisma 为主
npx tsx scripts/dual-write/toggle-feature-flags.ts --primary=prisma

# 验证回滚
npx tsx scripts/check-feature-flags.ts
```

**预计回滚时间**: < 5 分钟

---

## 下一步计划

1. **监控期** (3 天): 观察 Supabase 主库稳定性
2. **评估期** (第 4-7 天): 确认是否可以降级 Prisma 为仅影子写
3. **优化期** (第 7+ 天): 考虑关闭 Prisma 影子写，完全迁移到 Supabase

---

## 相关文档

- 切换计划: `PRIMARY_SWITCH_PLAN.md`
- 双写框架: `scripts/dual-write/README.md`
- 迁移任务: `tasks.md`

---

**签署**: Claude Code + 用户
**日期**: 2025-11-17
