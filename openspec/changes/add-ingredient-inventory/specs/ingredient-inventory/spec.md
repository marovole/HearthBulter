# Specification: Ingredient Inventory Management

## ADDED Requirements

### Requirement: Inventory Management
系统应当允许用户管理家中食材库存。

#### Scenario: 手动添加库存
- **WHEN** 用户购买食材后手动添加
- **THEN** 记录食材名称、数量、单位、购买日期、保质期

#### Scenario: 选择存储位置
- **WHEN** 添加食材时
- **THEN** 可选择冷藏、冷冻或常温存储

#### Scenario: 查看库存列表
- **WHEN** 用户访问「我的库存」
- **THEN** 显示所有库存食材按保质期排序

#### Scenario: 编辑库存
- **WHEN** 用户发现数量有误
- **THEN** 可修改数量、保质期等信息

#### Scenario: 删除库存
- **WHEN** 食材已用完或丢弃
- **THEN** 从库存中移除并可选记录浪费原因

### Requirement: Auto Sync from Orders
系统应当从订单自动同步库存。

#### Scenario: 订单完成触发
- **WHEN** 电商平台订单标记为已送达
- **THEN** 自动提取订单中的食材信息

#### Scenario: 智能推断保质期
- **WHEN** 添加「鸡蛋」到库存
- **THEN** 自动设置保质期为30天

#### Scenario: 用户确认
- **WHEN** 自动同步后
- **THEN** 推送通知让用户确认和调整库存信息

#### Scenario: 避免重复
- **WHEN** 同一食材已存在库存
- **THEN** 累加数量而非创建新条目

### Requirement: Expiry Tracking
系统应当追踪食材保质期并提醒用户。

#### Scenario: 临期警告
- **WHEN** 食材剩余保质期≤3天
- **THEN** 标记为「临期」并显示黄色标签

#### Scenario: 已过期标记
- **WHEN** 食材超过保质期
- **THEN** 标记为「已过期」并显示红色标签

#### Scenario: 过期提醒
- **WHEN** 有食材即将过期（剩余1天）
- **THEN** 推送通知「番茄明天过期，请尽快食用」

#### Scenario: 临期食材清单
- **WHEN** 用户查看「临期食材」
- **THEN** 显示所有剩余保质期≤7天的食材

### Requirement: Usage Recording
系统应当记录食材使用情况。

#### Scenario: 自动扣减（联动打卡）
- **WHEN** 用户打卡记录吃了「番茄炒蛋」
- **THEN** 自动扣减鸡蛋2个、番茄200g

#### Scenario: 手动记录使用
- **WHEN** 用户烹饪后手动记录
- **THEN** 选择食材和使用数量

#### Scenario: 部分使用
- **WHEN** 1kg番茄用了500g
- **THEN** 剩余数量更新为500g

#### Scenario: 使用历史
- **WHEN** 查看某食材详情
- **THEN** 显示使用记录（时间、数量、用途）

### Requirement: Low Stock Alerts
系统应当检测库存不足并提醒。

#### Scenario: 定义阈值
- **WHEN** 用户设置鸡蛋最低库存为5个
- **THEN** 系统记录该阈值

#### Scenario: 库存不足检测
- **WHEN** 鸡蛋库存降至4个
- **THEN** 标记为「库存不足」

#### Scenario: 补货提醒
- **WHEN** 检测到库存不足
- **THEN** 推送「鸡蛋库存不足，建议补货」

#### Scenario: 自动添加到购物清单
- **WHEN** 用户确认需要补货
- **THEN** 一键添加到购物清单

### Requirement: Smart Shopping Suggestions
系统应当基于库存和食谱智能生成采购建议。

#### Scenario: 对比库存和食谱
- **WHEN** 生成下周食谱
- **THEN** 计算所需食材并对比库存

#### Scenario: 排除充足食材
- **WHEN** 生成购物清单
- **THEN** 排除库存充足的食材（如番茄还有1kg）

#### Scenario: 临期食材优先
- **WHEN** 库存有临期番茄
- **THEN** 推荐使用番茄的食谱并减少番茄采购

#### Scenario: 缺少食材清单
- **WHEN** 用户查看采购建议
- **THEN** 显示「需购买：鸡胸肉500g、西兰花300g」

### Requirement: Waste Analysis
系统应当分析食材浪费并提供改进建议。

#### Scenario: 记录浪费
- **WHEN** 用户丢弃过期食材
- **THEN** 记录浪费原因（过期、变质、不喜欢）

#### Scenario: 计算浪费金额
- **WHEN** 查看浪费统计
- **THEN** 显示本月浪费金额（如50元）

#### Scenario: 月度浪费报告
- **WHEN** 每月底
- **THEN** 生成浪费分析报告（浪费品类、原因、趋势）

#### Scenario: 减少浪费建议
- **WHEN** 番茄浪费率高
- **THEN** 建议「减少番茄采购量」或「更频繁购买小份量」

### Requirement: Storage Location Management
系统应当按存储位置管理食材。

#### Scenario: 分类显示
- **WHEN** 用户查看库存
- **THEN** 可按「冷藏」、「冷冻」、「常温」分类查看

#### Scenario: 存储建议
- **WHEN** 用户添加「番茄」到冷藏
- **THEN** 提示「建议常温保存，口感更好」

#### Scenario: 位置筛选
- **WHEN** 用户打开冰箱
- **THEN** 筛选显示「冷藏」类食材

#### Scenario: 温度监控（可选）
- **WHEN** 接入智能冰箱
- **THEN** 显示实时温度并预警温度异常

### Requirement: Barcode Scanning
系统应当支持条形码快速添加库存（可选功能）。

#### Scenario: 扫描条码
- **WHEN** 用户扫描食材包装条码
- **THEN** 自动识别食材名称、品牌、规格

#### Scenario: 自动填充信息
- **WHEN** 识别成功
- **THEN** 预填充食材信息供用户确认

#### Scenario: 识别失败
- **WHEN** 条码无法识别
- **THEN** 提示手动输入食材信息

### Requirement: Inventory Statistics
系统应当提供库存统计和分析。

#### Scenario: 库存总览
- **WHEN** 用户查看统计
- **THEN** 显示总共XX种食材、总价值XX元

#### Scenario: 使用率分析
- **WHEN** 查看使用率
- **THEN** 显示高使用率食材（如鸡蛋）和低使用率食材

#### Scenario: 库存周转率
- **WHEN** 计算周转率
- **THEN** 显示平均X天消耗完一次库存

#### Scenario: 分类统计
- **WHEN** 按类别统计
- **THEN** 显示蔬菜XX元、肉类XX元、主食XX元

