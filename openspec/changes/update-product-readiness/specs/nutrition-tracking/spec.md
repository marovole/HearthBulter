## ADDED Requirements

### Requirement: Recognition Result Persistence

The system SHALL persist confirmed recognition results into nutrition logs.

#### Scenario: 识别确认落库

- **WHEN** 用户确认识别结果
- **THEN** 系统写入餐食记录并关联营养数据

#### Scenario: 手动修正

- **WHEN** 用户修改识别结果或份量
- **THEN** 系统更新记录并重新计算营养值
