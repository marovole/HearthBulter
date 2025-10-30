# Specification: Family Collaboration Features

## ADDED Requirements

### Requirement: Role-Based Permissions
系统应当支持基于角色的权限管理。

#### Scenario: 定义角色
- **WHEN** 创建家庭时
- **THEN** 创建者自动成为「管理员」角色

#### Scenario: 分配角色
- **WHEN** 管理员邀请新成员
- **THEN** 可选择「成员」或「访客」角色

#### Scenario: 权限检查
- **WHEN** 访客尝试删除购物清单
- **THEN** 返回「无权限」错误

#### Scenario: 修改角色
- **WHEN** 管理员将成员升级为管理员
- **THEN** 该成员获得完整管理权限

### Requirement: Shared Shopping List
系统应当支持家庭成员共享购物清单。

#### Scenario: 查看共享清单
- **WHEN** 任何家庭成员访问购物清单
- **THEN** 看到相同的清单内容

#### Scenario: 实时同步
- **WHEN** 成员A添加「牛奶」到清单
- **THEN** 成员B的清单实时更新显示「牛奶」

#### Scenario: 标记责任人
- **WHEN** 分配采购任务
- **THEN** 可将清单项目指定给某个成员

#### Scenario: 购买确认
- **WHEN** 成员购买完「牛奶」
- **THEN** 标记为「已购买」并通知其他成员

#### Scenario: 显示操作记录
- **WHEN** 查看清单项目
- **THEN** 显示「张三添加，李四已购买」

### Requirement: Task Assignment
系统应当支持家庭任务分配和管理。

#### Scenario: 创建任务
- **WHEN** 管理员创建「周日采购」任务
- **THEN** 设置责任人、截止时间、描述

#### Scenario: 分配任务
- **WHEN** 将任务分配给张三
- **THEN** 张三收到任务通知

#### Scenario: 更新任务状态
- **WHEN** 张三开始执行任务
- **THEN** 状态更新为「进行中」

#### Scenario: 完成任务
- **WHEN** 张三标记任务完成
- **THEN** 其他成员收到完成通知

#### Scenario: 任务到期提醒
- **WHEN** 任务即将到期（提前1天）
- **THEN** 推送提醒给责任人

### Requirement: Family Health Dashboard
系统应当提供家庭整体健康概览。

#### Scenario: 查看家庭总览
- **WHEN** 访问家庭看板
- **THEN** 显示所有成员的健康评分和状态

#### Scenario: 成员对比
- **WHEN** 选择「营养达标率」指标
- **THEN** 横向对比所有成员的达标情况

#### Scenario: 家庭总体趋势
- **WHEN** 查看趋势图
- **THEN** 显示家庭平均健康评分的变化曲线

#### Scenario: 识别问题
- **WHEN** 某成员连续未打卡
- **THEN** 在看板突出显示并提示关注

### Requirement: Check-in Interaction
系统应当支持家庭成员间的打卡互动。

#### Scenario: 查看成员打卡
- **WHEN** 张三完成今日打卡
- **THEN** 其他成员可看到「张三已打卡✓」

#### Scenario: 点赞鼓励
- **WHEN** 李四点击「点赞」
- **THEN** 张三收到「李四为你点赞」通知

#### Scenario: 评论互动
- **WHEN** 李四评论「坚持得很好！」
- **THEN** 显示在张三的打卡记录下方

#### Scenario: 家庭连续打卡
- **WHEN** 所有成员连续7天全部打卡
- **THEN** 解锁「家庭团结」徽章

### Requirement: Activity Feed
系统应当记录并展示家庭活动日志。

#### Scenario: 记录活动
- **WHEN** 张三添加食谱
- **THEN** 生成活动「张三添加了红烧肉食谱」

#### Scenario: 查看活动流
- **WHEN** 访问活动页面
- **THEN** 按时间倒序显示所有家庭活动

#### Scenario: 筛选活动
- **WHEN** 选择「仅看张三的活动」
- **THEN** 只显示张三的相关活动

#### Scenario: 活动评论
- **WHEN** 李四评论「这个食谱不错」
- **THEN** 评论显示在活动下方

### Requirement: Family Goals
系统应当支持设定和追踪家庭共同目标。

#### Scenario: 设定家庭目标
- **WHEN** 管理员创建「全家减重10kg」目标
- **THEN** 所有成员看到该目标

#### Scenario: 目标进度
- **WHEN** 查看目标详情
- **THEN** 显示总进度（已完成6kg/10kg）和各成员贡献

#### Scenario: 成员贡献
- **WHEN** 张三减重3kg，李四减重2kg
- **THEN** 显示「张三贡献50%，李四贡献33%」

#### Scenario: 目标达成
- **WHEN** 家庭目标完成
- **THEN** 弹出庆祝动画并生成成就报告

### Requirement: Notification System
系统应当向家庭成员推送协作相关通知。

#### Scenario: 任务通知
- **WHEN** 被分配新任务
- **THEN** 推送「你有新任务：周日采购」

#### Scenario: 清单变更通知
- **WHEN** 其他成员修改购物清单
- **THEN** 推送「李四添加了5个商品到清单」

#### Scenario: 评论通知
- **WHEN** 有人回复评论
- **THEN** 推送「李四回复了你的评论」

#### Scenario: 通知偏好
- **WHEN** 用户设置通知偏好
- **THEN** 可选择接收哪些类型通知及推送方式

### Requirement: Real-time Sync
系统应当支持多人实时协作（可选功能）。

#### Scenario: 实时更新
- **WHEN** 成员A编辑购物清单
- **THEN** 成员B的界面立即显示更新（无需刷新）

#### Scenario: 在线状态
- **WHEN** 查看家庭成员列表
- **THEN** 显示哪些成员当前在线

#### Scenario: 正在编辑提示
- **WHEN** 成员A正在编辑食谱
- **THEN** 成员B看到「张三正在编辑...」提示

#### Scenario: 冲突解决
- **WHEN** 两人同时编辑同一项目
- **THEN** 显示冲突提示并提供合并选项

### Requirement: Collaboration History
系统应当记录协作历史以便追溯。

#### Scenario: 操作历史
- **WHEN** 查看购物清单历史
- **THEN** 显示谁在何时添加/删除/修改了哪些内容

#### Scenario: 版本回溯
- **WHEN** 误删重要内容
- **THEN** 可回溯到之前的版本

#### Scenario: 操作审计
- **WHEN** 管理员查看审计日志
- **THEN** 显示所有成员的关键操作记录

