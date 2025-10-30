## MODIFIED Requirements

### Requirement: Member Permissions
系统必须（SHALL）实施基于角色的权限控制，区分家庭管理员和普通成员权限。

#### Scenario: Admin invites new members
- **GIVEN** 家庭管理员在成员管理页
- **WHEN** 点击"邀请成员"并输入邮箱地址
- **THEN** 系统生成唯一邀请链接并发送邮件
- **AND** 链接包含过期时间戳（7天后自动失效）
- **AND** 系统验证邀请码唯一性，避免冲突
- **AND** 邀请链接使用安全的令牌生成算法

#### Scenario: Invitation link expires properly
- **GIVEN** 邀请链接已生成超过7天
- **WHEN** 用户尝试使用过期链接
- **THEN** 系统显示"邀请已过期，请联系管理员重新发送"
- **AND** 邀请被标记为已过期状态
- **AND** 过期邀请定期被系统清理

#### Scenario: Invalid invitation attempts are blocked
- **GIVEN** 恶意用户尝试猜测邀请码
- **WHEN** 连续5次输入无效邀请码
- **THEN** 系统临时锁定该IP的邀请验证功能15分钟
- **AND** 记录安全日志用于监控分析

#### Scenario: Member cannot delete other members
- **GIVEN** 普通成员进入成员列表页
- **WHEN** 尝试访问其他成员的删除操作
- **THEN** 系统显示权限错误"仅管理员可删除成员"
- **AND** 操作被阻止
- **AND** 尝试行为被记录在安全日志中

#### Scenario: Admin transfers ownership
- **GIVEN** 当前管理员希望转移家庭所有权
- **WHEN** 选择目标成员并确认转移
- **THEN** 目标成员角色变更为管理员
- **AND** 原管理员角色降级为普通成员
- **AND** 系统发送通知给双方
- **AND** 转移操作需要二次身份验证

## ADDED Requirements

### Requirement: API Input Validation
系统必须（SHALL）对所有API输入进行严格验证，防止恶意输入和数据注入攻击。

#### Scenario: API endpoint validates all inputs
- **GIVEN** 客户端向任何API端点发送请求
- **WHEN** 请求包含无效或恶意数据
- **THEN** 系统返回400错误并描述具体验证失败原因
- **AND** 系统记录验证失败日志用于安全监控
- **AND** 恶意IP地址被临时限制访问

#### Scenario: Required fields are validated
- **GIVEN** API端点要求必填字段
- **WHEN** 客户端缺少必填字段或提供空值
- **THEN** 系统立即拒绝请求并返回详细错误信息
- **AND** 错误信息不暴露内部系统结构

#### Scenario: Data type validation
- **GIVEN** API端点期望特定数据类型
- **WHEN** 客户端发送错误类型的数据
- **THEN** 系统进行类型转换或拒绝请求
- **AND** 返回清晰的类型错误提示

#### Scenario: String length and format validation
- **GIVEN** API端点处理字符串输入
- **WHEN** 输入超出长度限制或包含非法字符
- **THEN** 系统截断或拒绝超长输入
- **AND** 过滤掉潜在的恶意字符（如SQL注入、XSS攻击字符）

### Requirement: Error Handling Standardization
系统必须（SHALL）提供统一、安全的错误处理机制，确保错误信息不泄露敏感数据。

#### Scenario: API returns consistent error format
- **GIVEN** API调用发生任何错误
- **WHEN** 客户端接收错误响应
- **THEN** 错误响应包含标准格式：{error: {code, message, details}}
- **AND** 错误代码使用标准化分类（VALIDATION_ERROR, PERMISSION_ERROR等）
- **AND** 敏感系统信息不包含在错误消息中

#### Scenario: Server errors are logged securely
- **GIVEN** 系统发生内部错误
- **WHEN** 错误被捕获处理
- **THEN** 详细错误信息记录在安全日志中
- **AND** 用户只能看到友好的错误提示
- **AND** 开发环境可查看详细调试信息

#### Scenario: Rate limiting prevents abuse
- **GIVEN** 恶意用户频繁请求API
- **WHEN** 请求频率超过限制（100 req/min per user）
- **THEN** 系统返回429状态码
- **AND** 包含Retry-After头指示重试时间
- **AND** 异常行为被标记为潜在攻击

### Requirement: Database Integrity
系统必须（SHALL）确保数据库完整性和一致性，实施适当的约束和软删除机制。

#### Scenario: Soft delete preserves data integrity
- **GIVEN** 重要数据需要被删除
- **WHEN** 执行删除操作
- **THEN** 数据被标记为deleted状态而非物理删除
- **AND** 相关外键关系保持完整
- **AND** 业务查询默认过滤已删除数据

#### Scenario: Data constraints prevent corruption
- **GIVEN** 数据库表定义了完整性约束
- **WHEN** 尝试插入或更新违反约束的数据
- **THEN** 数据库拒绝操作并返回约束错误
- **AND** 应用层捕获并转换为用户友好的错误消息

#### Scenario: Database transactions ensure consistency
- **GIVEN** 业务操作涉及多个数据表
- **WHEN** 执行相关数据库操作
- **THEN** 所有操作在单个事务中完成
- **AND** 任何步骤失败都会回滚整个事务
- **AND** 数据始终保持一致状态

### Requirement: Type Safety Enhancement
系统必须（SHALL）利用TypeScript类型系统确保代码类型安全，减少运行时错误。

#### Scenario: API requests are type-validated
- **GIVEN** API端点定义了严格的请求类型
- **WHEN** 客户端发送请求
- **THEN** 请求数据必须符合TypeScript接口定义
- **AND** 类型不匹配在编译时被捕获
- **AND** 运行时进行额外验证确保类型安全

#### Scenario: Database models have complete types
- **GIVEN** Prisma定义了数据库模型
- **WHEN** 应用代码操作数据
- **THEN** 所有字段都有明确的TypeScript类型
- **AND** 可选字段和必填字段清晰区分
- **AND** 关系类型正确定义

#### Scenario: Configuration is type-safe
- **GIVEN** 系统需要配置参数
- **WHEN** 读取配置文件或环境变量
- **THEN** 配置值有严格的类型定义
- **AND** 缺失或无效配置在启动时被检测
- **AND** 默认值类型安全且合理