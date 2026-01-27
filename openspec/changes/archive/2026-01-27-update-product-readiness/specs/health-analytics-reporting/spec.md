## MODIFIED Requirements

### Requirement: Report Export

The system SHALL support report export in multiple formats.

#### Scenario: 导出PDF

- **WHEN** 用户点击「导出PDF」
- **THEN** 在前端生成包含图表与数据的PDF文件
- **AND** 在导出前提供图表预览与模块选择

#### Scenario: 导出HTML

- **WHEN** 用户选择「HTML格式」
- **THEN** 生成可在浏览器中打开的独立HTML报告

#### Scenario: 生成分享链接

- **WHEN** 用户点击「分享报告」
- **THEN** 生成唯一链接，他人可通过链接查看报告（7天有效）
