## ADDED Requirements

### Requirement: Production Log Hygiene

The system SHALL reduce console noise in production environments.

#### Scenario: 生产环境日志

- **WHEN** NODE_ENV=production
- **THEN** only warn/error or structured logs are emitted

#### Scenario: 调试日志隔离

- **WHEN** 需要调试信息
- **THEN** 调试日志仅在非生产环境输出
