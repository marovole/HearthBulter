# Family Profile Management - Change Spec

## ADDED Requirements

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
- **AND** 用户填写家庭名称后成功创建家庭
- **AND** 用户自动成为该家庭的管理员

#### Scenario: User invited to existing family
- **GIVEN** 家庭管理员发送邀请链接给新成员
- **WHEN** 新成员通过链接注册/登录
- **THEN** 系统将新成员关联到目标家庭
- **AND** 新成员角色为普通成员

#### Scenario: User cannot create duplicate families
- **GIVEN** 用户已属于某个家庭
- **WHEN** 尝试创建新家庭
- **THEN** 系统显示提示"您已属于家庭，如需创建新家庭请先退出当前家庭"
- **AND** 创建操作被阻止

---

### Requirement: Member Profile Management
系统必须（SHALL）允许家庭管理员和成员管理家庭成员档案。

#### Scenario: Admin adds new family member
- **GIVEN** 家庭管理员进入成员管理页面
- **WHEN** 点击"添加成员"并填写信息（姓名、性别、出生日期、身高、体重）
- **THEN** 系统创建成员档案并自动计算BMI
- **AND** 成员列表中显示新成员

#### Scenario: Member updates own profile
- **GIVEN** 普通成员登录并进入"我的档案"
- **WHEN** 修改个人信息（如更新体重）
- **THEN** 系统保存新数据并更新BMI
- **AND** 显示提示"档案更新成功"

#### Scenario: Admin deletes inactive member
- **GIVEN** 家庭管理员查看成员列表
- **WHEN** 选择某成员并确认删除
- **THEN** 系统执行软删除
- **AND** 成员不再在列表中显示
- **AND** 历史数据被保留

---

### Requirement: Health Goals Configuration
系统必须（SHALL）允许用户为每个成员设定健康目标。

#### Scenario: User sets weight loss goal
- **GIVEN** 成员当前体重80kg，目标体重70kg
- **WHEN** 设定"减重"目标并设定目标体重和期望周期（12周）
- **THEN** 系统计算每周目标减重量（0.83kg/周）
- **AND** 显示安全性提示"建议每周减重0.5-1kg"
- **AND** 系统自动调整TDEE

#### Scenario: User sets muscle gain goal
- **GIVEN** 成年男性成员BMI正常
- **WHEN** 选择"增肌"目标并设定运动频率
- **THEN** 系统建议蛋白质摄入量提高至2.0g/kg
- **AND** TDEE调整为BMR×活动系数+300 kcal

#### Scenario: Goal progress is tracked
- **GIVEN** 成员设定了减重目标（80kg → 70kg in 12周）
- **WHEN** 4周后体重更新为76kg
- **THEN** 系统计算进度：已完成40%
- **AND** 显示趋势分析

---

### Requirement: Allergy & Dietary Restrictions
系统必须（SHALL）记录成员过敏史和饮食禁忌。

#### Scenario: User records seafood allergy
- **GIVEN** 成员编辑健康档案
- **WHEN** 在"过敏史"字段添加"海鲜类"
- **THEN** 系统保存过敏信息
- **AND** 食谱生成时自动排除海鲜食材

#### Scenario: Vegetarian dietary preference
- **GIVEN** 成员选择"素食主义者"
- **WHEN** 保存设置
- **THEN** 系统将肉类标记为不可用
- **AND** 食谱优先推荐豆制品

#### Scenario: Lactose intolerance
- **GIVEN** 成员标记"乳糖不耐受"
- **WHEN** 食谱生成包含牛奶
- **THEN** 系统自动替换为无乳糖牛奶
- **AND** 显示替代说明
