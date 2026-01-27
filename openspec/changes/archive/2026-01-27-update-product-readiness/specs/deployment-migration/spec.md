## ADDED Requirements

### Requirement: Environment Variable Naming Consistency

The system SHALL keep environment variable names consistent across code, docs, and examples.

#### Scenario: 配置一致性

- **WHEN** 开发者根据文档配置环境变量
- **THEN** 与代码使用的变量名保持一致并可直接运行

#### Scenario: 示例文件同步

- **WHEN** 更新环境变量示例
- **THEN** `.env.example` 与相关文档保持同步

### Requirement: Optional Cache Dependency Handling

The system SHALL treat Upstash Redis as an optional dependency with fallback behavior.

#### Scenario: Upstash 未配置

- **WHEN** Upstash Redis 未配置
- **THEN** 系统降级为无缓存/无远程限流模式
- **AND** 记录降级原因但不阻塞核心功能

#### Scenario: USDA 必需配置

- **WHEN** 生产环境启用营养数据功能
- **THEN** USDA API Key 必须已配置
