## Why

当前项目测试覆盖率仅为 4.77%，远低于 70% 的目标。19个测试套件失败，主要由于 Jest 环境配置问题、模块路径解析错误和 Prisma Client 在浏览器环境运行错误。缺乏充分的测试覆盖会影响代码质量和长期维护性。

## What Changes

- 修复 Jest 测试环境配置问题
- 正确配置模块路径解析和 mock
- 修复 Prisma Client 在测试环境中的使用问题
- 增加核心业务逻辑的单元测试
- 实现关键 API 端点的集成测试
- 添加端到端测试覆盖
- 将测试覆盖率提升到 70% 以上

## Impact

- **Affected specs**: `testing`, `code-quality`
- **Affected code**:
  - Jest 配置文件
  - 所有测试文件
  - 业务逻辑服务
  - API 路由
  - React 组件

**Priority**: P1 - 测试质量
**Estimated effort**: 2-3 days