## MODIFIED Requirements

### Requirement: TypeScript Type Safety

系统 SHALL 遵循 TypeScript 严格模式规范，确保所有代码具有完整的类型定义。

#### Scenario: 禁止使用 any 类型
- **WHEN** 开发者编写 TypeScript 代码
- **THEN** 代码中不应出现显式 `any` 类型
- **AND** 应使用 `unknown` 配合类型守卫处理未知类型
- **AND** 应为所有函数参数和返回值定义明确类型

#### Scenario: 类型断言规范
- **WHEN** 需要进行类型断言时
- **THEN** 应优先使用类型守卫函数进行类型缩窄
- **AND** 若必须使用断言，应断言为具体类型而非 `any`
- **AND** 应在注释中说明断言的安全性依据

#### Scenario: 外部数据类型处理
- **WHEN** 处理来自外部 API 或数据库的数据
- **THEN** 应使用 Zod 等运行时验证库进行类型验证
- **AND** 应定义对应的 TypeScript 接口
- **AND** 验证通过后才能将数据断言为目标类型

## ADDED Requirements

### Requirement: 服务层类型完整性

所有 Services 层代码 SHALL 具有完整的类型定义，包括内部变量、函数参数和返回值。

#### Scenario: 查询条件类型化
- **WHEN** 构建数据库查询条件
- **THEN** 应使用预定义的 `WhereCondition` 接口
- **AND** 接口应与 Repository 层类型保持一致

#### Scenario: 元数据类型化
- **WHEN** 记录活动日志或传递元数据
- **THEN** 应使用 `ActivityMetadata` 联合类型
- **AND** 类型应覆盖所有可能的元数据结构

#### Scenario: 回调函数类型化
- **WHEN** 使用 Proxy 或动态方法调用
- **THEN** 应定义明确的函数签名类型
- **AND** 应避免使用 `(...args: any[])` 签名
