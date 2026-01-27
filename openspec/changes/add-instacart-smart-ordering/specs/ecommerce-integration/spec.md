## ADDED Requirements

### Requirement: Instacart Platform Integration

系统 SHALL 支持 Instacart 平台的 OAuth 授权和购物车 API 集成。

#### Scenario: 绑定 Instacart 账号成功

- **WHEN** 用户点击「绑定 Instacart」并完成 OAuth 授权
- **THEN** 系统保存 Instacart 访问令牌并显示绑定成功
- **AND** 用户可以在平台管理页面看到 Instacart 绑定状态

#### Scenario: 解绑 Instacart 账号

- **WHEN** 用户点击「解绑 Instacart」并确认
- **THEN** 系统删除 Instacart 访问令牌
- **AND** 清除相关缓存数据

#### Scenario: Instacart Token 过期处理

- **WHEN** Instacart 访问令牌过期
- **THEN** 系统自动使用 Refresh Token 获取新令牌
- **AND** 如果 Refresh Token 也失效，通知用户重新授权

### Requirement: Instacart Product Search

系统 SHALL 支持在 Instacart 平台搜索商品。

#### Scenario: 搜索商品成功

- **WHEN** 系统使用食材名称搜索 Instacart 商品
- **THEN** 返回匹配的商品列表，包含名称、价格、图片、库存状态

#### Scenario: 搜索无结果

- **WHEN** 搜索词在 Instacart 无匹配商品
- **THEN** 返回空列表并建议用户修改搜索词

#### Scenario: 搜索 API 超时

- **WHEN** Instacart 搜索 API 响应超过 5 秒
- **THEN** 返回超时错误并允许用户重试

### Requirement: Instacart Cart Management

系统 SHALL 支持创建和管理 Instacart 购物车。

#### Scenario: 创建购物车成功

- **WHEN** 用户确认周计划并点击「添加到 Instacart」
- **THEN** 系统调用 Instacart API 创建购物车
- **AND** 将所有匹配的商品添加到购物车

#### Scenario: 跳转 Instacart 结算

- **WHEN** 购物车创建成功
- **THEN** 系统生成 Instacart Deep Link
- **AND** 用户点击后跳转到 Instacart App/网站完成结算

#### Scenario: 部分商品添加失败

- **WHEN** 某些商品无法添加到购物车（无库存、下架）
- **THEN** 系统显示失败商品列表
- **AND** 允许用户选择替代商品或跳过

### Requirement: Ingredient to Instacart Product Matching

系统 SHALL 将菜谱食材智能匹配到 Instacart 商品。

#### Scenario: 精确匹配

- **WHEN** 食材名称与 Instacart 商品名称高度匹配
- **THEN** 自动选择最佳匹配商品
- **AND** 显示匹配置信度

#### Scenario: 模糊匹配

- **WHEN** 食材名称无法精确匹配
- **THEN** 返回多个候选商品供用户选择

#### Scenario: 用户纠正匹配

- **WHEN** 用户手动选择正确的商品匹配
- **THEN** 系统记录该映射关系
- **AND** 在后续匹配中优先使用用户选择
