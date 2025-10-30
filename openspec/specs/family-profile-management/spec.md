# Family Profile Management Specification

## Purpose

家庭档案管理是Health Butler的核心基础能力，负责管理用户账户、家庭信息和成员档案。所有其他功能（健康数据采集、食谱生成等）都依赖于此模块提供的家庭成员身份数据。

**能力范围**:
- 用户注册与认证
- 家庭创建与管理
- 成员档案CRUD（创建、读取、更新、删除）
- 健康目标设定与过敏史记录
- 成员权限管理

---
## Requirements
### Requirement: User Authentication
系统必须（SHALL）提供安全的用户认证机制，支持多种登录方式，确保用户数据安全。

#### Scenario: User registers with email
- **GIVEN** 用户访问注册页面
- **WHEN** 输入有效的邮箱地址和密码（密码长度≥8且包含字母+数字）
- **THEN** 系统创建用户账户并发送邮箱验证链接
- **AND** 用户被重定向到邮箱验证提示页

#### Scenario: User logs in with Google OAuth
- **GIVEN** 用户选择"使用Google登录"
- **WHEN** 完成Google授权流程
- **THEN** 系统创建或关联用户账户
- **AND** 用户被重定向到仪表盘

#### Scenario: Invalid credentials are rejected
- **GIVEN** 用户尝试登录
- **WHEN** 输入错误的密码（连续3次失败）
- **THEN** 系统显示错误提示"用户名或密码错误"
- **AND** 账户被暂时锁定15分钟（防暴力破解）

---

### Requirement: Family Creation
用户首次登录后必须（SHALL）创建家庭档案，家庭作为成员管理的容器单元。

#### Scenario: First-time user creates family
- **GIVEN** 新注册用户完成登录
- **WHEN** 系统检测到用户未关联任何家庭
- **THEN** 自动显示家庭创建引导页
- **AND** 用户填写家庭名称（如"黄家"）后成功创建家庭
- **AND** 用户自动成为该家庭的管理员（creator role）

#### Scenario: User invited to existing family
- **GIVEN** 家庭管理员发送邀请链接给新成员
- **WHEN** 新成员通过链接注册/登录
- **THEN** 系统将新成员关联到目标家庭
- **AND** 新成员角色为普通成员（member role）

#### Scenario: User cannot create duplicate families
- **GIVEN** 用户已属于某个家庭
- **WHEN** 尝试创建新家庭
- **THEN** 系统显示提示"您已属于'XXX家庭'，如需创建新家庭请先退出当前家庭"
- **AND** 创建操作被阻止

---

### Requirement: Member Profile Management
系统必须（SHALL）允许家庭管理员和成员管理家庭成员档案，包括基础信息和健康参数。

#### Scenario: Admin adds new family member
- **GIVEN** 家庭管理员进入成员管理页面
- **WHEN** 点击"添加成员"并填写成员信息（姓名、性别、出生日期、身高、体重）
- **THEN** 系统创建成员档案并自动计算BMI
- **AND** 成员列表中显示新成员卡片

#### Scenario: Member updates own profile
- **GIVEN** 普通成员登录并进入"我的档案"
- **WHEN** 修改个人信息（如更新体重）
- **THEN** 系统保存新数据并更新BMI
- **AND** 显示提示"档案更新成功"
- **AND** 历史数据被保留（体重变化记录）

#### Scenario: Admin deletes inactive member
- **GIVEN** 家庭管理员查看成员列表
- **WHEN** 选择某成员并点击"删除"后确认操作
- **THEN** 系统执行软删除（设置deleted_at字段）
- **AND** 成员不再在列表中显示
- **AND** 历史健康数据和食谱关联被保留（数据合规）

#### Scenario: Member age is automatically calculated
- **GIVEN** 成员档案中存储了出生日期
- **WHEN** 系统需要显示成员年龄或进行年龄相关计算
- **THEN** 系统基于当前日期自动计算年龄
- **AND** 年龄段标签被自动分配（儿童<12岁、青少年12-18岁、成年18-65岁、老年>65岁）

---

### Requirement: Health Goals Configuration
系统必须（SHALL）允许用户为每个成员设定健康目标，目标作为食谱生成的关键输入参数。

#### Scenario: User sets weight loss goal
- **GIVEN** 成员当前体重80kg，目标体重70kg
- **WHEN** 用户选择"减重"目标并设定目标体重和期望周期（12周）
- **THEN** 系统计算每周目标减重量（0.83kg/周）
- **AND** 显示安全性提示"建议每周减重0.5-1kg，您的目标在健康范围内"
- **AND** 系统自动调整TDEE为当前BMR×活动系数-400 kcal

#### Scenario: User sets muscle gain goal
- **GIVEN** 成年男性成员BMI正常
- **WHEN** 选择"增肌"目标并设定每周运动频率（4次）
- **THEN** 系统建议蛋白质摄入量提高至2.0g/kg体重
- **AND** TDEE调整为BMR×活动系数+300 kcal
- **AND** 食谱宏量比例调整为 碳水40% / 蛋白质30% / 脂肪30%

#### Scenario: Multiple concurrent goals are rejected
- **GIVEN** 成员已设定"减重"目标
- **WHEN** 尝试同时设定"增肌"目标
- **THEN** 系统显示提示"请先完成或取消当前目标"
- **AND** 新目标设定被阻止（避免矛盾）

#### Scenario: Goal progress is tracked
- **GIVEN** 成员设定了减重目标（80kg → 70kg in 12周）
- **WHEN** 4周后体重更新为76kg
- **THEN** 系统计算进度：已完成40%（4kg/10kg）
- **AND** 显示趋势分析"您的进度符合预期，继续保持！"

---

### Requirement: Allergy & Dietary Restrictions
系统必须（SHALL）记录成员过敏史和饮食禁忌，确保食谱生成时自动排除相关食材。

#### Scenario: User records seafood allergy
- **GIVEN** 成员编辑健康档案
- **WHEN** 在"过敏史"字段添加"海鲜类（虾、蟹、贝类）"
- **THEN** 系统保存过敏信息并标记严重程度为"严重"
- **AND** 食谱生成时自动排除所有海鲜食材

#### Scenario: Vegetarian dietary preference
- **GIVEN** 成员在饮食偏好中选择"素食主义者"
- **WHEN** 保存设置
- **THEN** 系统将肉类、海鲜标记为不可用食材
- **AND** 食谱生成时优先推荐豆制品、蛋类作为蛋白质来源

#### Scenario: Lactose intolerance
- **GIVEN** 成员标记"乳糖不耐受"
- **WHEN** 食谱生成包含牛奶
- **THEN** 系统自动替换为无乳糖牛奶或植物奶（豆奶、燕麦奶）
- **AND** 显示替代食材说明

---

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

## Data Retention & Privacy

### Requirement: GDPR Compliance
系统必须（SHALL）遵循GDPR数据隐私规定，允许用户导出和删除个人数据。

#### Scenario: User requests data export
- **GIVEN** 用户进入"数据与隐私"设置页
- **WHEN** 点击"导出我的数据"
- **THEN** 系统生成包含所有家庭成员档案、健康数据的JSON文件
- **AND** 文件通过加密链接提供下载（链接24小时有效）

#### Scenario: User deletes account
- **GIVEN** 用户请求删除账户
- **WHEN** 确认删除操作
- **THEN** 系统将账户和关联数据标记为删除状态（软删除）
- **AND** 数据在30天后完全物理删除
- **AND** 期间用户可通过联系支持恢复账户

---

## Performance Requirements

### Requirement: Response Time
家庭档案相关操作必须（SHALL）在可接受的时间内完成，确保良好用户体验。

#### Scenario: Member list loads quickly
- **GIVEN** 家庭有10个成员
- **WHEN** 用户访问成员列表页
- **THEN** 页面首屏渲染时间 <800ms
- **AND** 所有成员卡片在1.5秒内加载完成

#### Scenario: Profile update is instant
- **GIVEN** 用户修改成员档案
- **WHEN** 点击保存
- **THEN** 数据库写入在200ms内完成
- **AND** UI立即显示更新后的数据（乐观更新）
