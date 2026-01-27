## MODIFIED Requirements

### Requirement: Real-time Push

The system SHALL support real-time push notifications for web browsers.

#### Scenario: 浏览器通知授权

- **WHEN** 用户首次启用推送
- **THEN** 引导浏览器授权并记录授权状态

#### Scenario: Web Push订阅

- **WHEN** 用户授权浏览器通知
- **THEN** 系统保存订阅信息用于后续推送

#### Scenario: 推送点击跳转

- **WHEN** 用户点击推送通知
- **THEN** 打开应用并跳转到相关页面
