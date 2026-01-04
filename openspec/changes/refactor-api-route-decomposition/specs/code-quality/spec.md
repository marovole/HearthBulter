## ADDED Requirements

### Requirement: API 路由函数长度限制

所有 API 路由处理函数 SHALL 保持简洁，单个函数不超过 50 行代码。

#### Scenario: 路由处理函数长度

- **WHEN** 创建或修改 API 路由
- **THEN** 单个处理函数（GET/POST/PUT/DELETE）不超过 50 行
- **AND** 复杂逻辑应抽取为独立的辅助函数
- **AND** 辅助函数应放在同一文件或独立的 service 文件中

#### Scenario: 路由文件长度

- **WHEN** API 路由文件代码量增长
- **THEN** 单个 `route.ts` 文件不超过 150 行
- **AND** 超过限制时应将逻辑抽取到 `lib/services/` 或 `lib/middleware/`

### Requirement: API 中间件复用

系统 SHALL 提供可复用的中间件，避免在路由中重复实现通用逻辑。

#### Scenario: 认证中间件

- **WHEN** API 路由需要用户认证
- **THEN** 应使用 `withAuth()` 中间件
- **AND** 中间件应自动注入 `session.user` 到请求上下文

#### Scenario: 速率限制中间件

- **WHEN** API 路由需要速率限制
- **THEN** 应使用 `withRateLimit(type)` 中间件
- **AND** 中间件应返回标准的 429 响应和重试头

#### Scenario: 中间件组合

- **WHEN** 路由需要多个中间件
- **THEN** 应使用 `compose()` 函数链式组合
- **AND** 中间件执行顺序应为从外到内

### Requirement: API 响应处理分离

复杂的响应生成逻辑 SHALL 抽取为独立函数，与路由处理解耦。

#### Scenario: 流式响应处理

- **WHEN** API 需要返回流式响应
- **THEN** 流式响应逻辑应封装在独立函数中
- **AND** 函数应处理流的创建、编码和错误恢复

#### Scenario: 普通响应处理

- **WHEN** API 需要返回 JSON 响应
- **THEN** 数据组装逻辑应与路由处理分离
- **AND** 响应应遵循统一的格式规范
