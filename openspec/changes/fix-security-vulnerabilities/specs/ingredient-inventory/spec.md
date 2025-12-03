## ADDED Requirements

### Requirement: Inventory API Authorization
The system SHALL enforce ownership verification on all inventory API endpoints.

#### Scenario: User requests their own inventory
- **WHEN** a user requests inventory data with their own memberId
- **THEN** the system SHALL verify the memberId belongs to the user's family
- **AND** return the inventory data if verification succeeds
- **AND** return 403 Forbidden if the user is not a family member

#### Scenario: User attempts to access another family's inventory
- **WHEN** a user provides a memberId from a different family
- **THEN** the system SHALL reject the request with 403 Forbidden
- **AND** NOT reveal whether the memberId exists
- **AND** log the unauthorized access attempt

#### Scenario: User creates inventory item for family member
- **WHEN** a user creates an inventory item with a memberId
- **THEN** the system SHALL verify both user and target member belong to the same family
- **AND** only allow creation if family membership is confirmed
- **AND** reject with 403 if cross-family creation is attempted

#### Scenario: User modifies or deletes inventory item
- **WHEN** a user attempts to update or delete an inventory item
- **THEN** the system SHALL verify the item belongs to the user's family
- **AND** only allow modification if ownership is confirmed
- **AND** log all inventory modifications with user context

### Requirement: Inventory Input Validation
The system SHALL validate all input data for inventory operations using structured schemas.

#### Scenario: Creating inventory item with invalid data
- **WHEN** a user submits inventory creation request with missing or invalid fields
- **THEN** the system SHALL validate against Zod schema
- **AND** return 400 Bad Request with specific validation errors
- **AND** NOT process the request if validation fails

#### Scenario: Filtering inventory with malformed parameters
- **WHEN** API receives filter parameters with unexpected formats
- **THEN** the system SHALL sanitize and validate all filter values
- **AND** reject requests with malicious filter patterns
- **AND** use safe query building to prevent injection

## MODIFIED Requirements

### Requirement: Inventory Management
系统 SHALL 允许用户管理家中食材库存，并强制执行所有权验证。

#### Scenario: 手动添加库存
- **WHEN** 用户购买食材后手动添加
- **THEN** 系统SHALL验证用户有权为目标成员添加库存
- **AND** 记录食材名称、数量、单位、购买日期、保质期
- **AND** 关联正确的家庭成员ID

#### Scenario: 选择存储位置
- **WHEN** 添加食材时
- **THEN** 可选择冷藏、冷冻或常温存储

#### Scenario: 查看库存列表
- **WHEN** 用户访问「我的库存」
- **THEN** 系统SHALL仅返回用户所属家庭的库存数据
- **AND** 显示所有库存食材按保质期排序

#### Scenario: 编辑库存
- **WHEN** 用户发现数量有误
- **THEN** 系统SHALL验证用户对该库存项有编辑权限
- **AND** 可修改数量、保质期等信息

#### Scenario: 删除库存
- **WHEN** 食材已用完或丢弃
- **THEN** 系统SHALL验证用户对该库存项有删除权限
- **AND** 从库存中移除并可选记录浪费原因
