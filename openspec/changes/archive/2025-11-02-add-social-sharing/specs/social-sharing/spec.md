# Specification: Social Sharing Features

## ADDED Requirements

### Requirement: Share Content Generation
系统应当生成美观的分享内容。

#### Scenario: 生成健康报告分享卡片
- **WHEN** 用户点击「分享周报」
- **THEN** 生成包含健康评分、体重变化、主要成就的精美图片

#### Scenario: 生成目标达成分享图
- **WHEN** 用户完成减重5kg目标
- **THEN** 自动生成庆祝海报供分享

#### Scenario: 生成食谱分享卡
- **WHEN** 用户分享某食谱
- **THEN** 生成包含食谱图片、营养信息、烹饪时间的卡片

#### Scenario: 自定义分享文案
- **WHEN** 生成分享内容
- **THEN** 允许用户编辑分享文字

### Requirement: Social Platform Integration
系统应当集成主流社交平台分享。

#### Scenario: 分享到微信
- **WHEN** 用户点击「分享到微信」
- **THEN** 调用微信JS-SDK分享到好友或群

#### Scenario: 分享到朋友圈
- **WHEN** 用户选择「朋友圈」
- **THEN** 生成带图片和链接的朋友圈分享

#### Scenario: 分享到微博
- **WHEN** 用户点击「分享到微博」
- **THEN** 跳转微博并预填充内容

#### Scenario: 通用分享链接
- **WHEN** 用户点击「复制链接」
- **THEN** 生成可在任意平台分享的通用链接

### Requirement: Achievement System
系统应当定义并追踪用户成就。

#### Scenario: 成就触发
- **WHEN** 用户连续打卡7天
- **THEN** 解锁「坚持一周」成就并弹出通知

#### Scenario: 成就分级
- **WHEN** 成就有不同等级
- **THEN** 显示铜牌（7天）、银牌（30天）、金牌（100天）

#### Scenario: 成就展示墙
- **WHEN** 用户访问「我的成就」
- **THEN** 展示所有已获得和未获得的成就

#### Scenario: 成就分享
- **WHEN** 解锁新成就
- **THEN** 弹出「分享你的成就」提示

### Requirement: Leaderboard System
系统应当提供排行榜功能。

#### Scenario: 查看健康评分排行榜
- **WHEN** 用户访问排行榜
- **THEN** 显示健康评分最高的前100名用户

#### Scenario: 周榜/月榜
- **WHEN** 切换时间范围
- **THEN** 显示本周或本月的排行

#### Scenario: 显示排名变化
- **WHEN** 用户排名上升
- **THEN** 显示「↑ 3」绿色箭头

#### Scenario: 隐私保护
- **WHEN** 用户未授权公开排名
- **THEN** 仅显示匿名ID和排名

### Requirement: Share Link Generation
系统应当生成可追踪的分享链接。

#### Scenario: 生成分享链接
- **WHEN** 用户分享健康报告
- **THEN** 生成唯一链接如 /share/abc123

#### Scenario: 嵌入邀请码
- **WHEN** 生成分享链接
- **THEN** 链接包含用户邀请码

#### Scenario: 分享落地页
- **WHEN** 其他人点击分享链接
- **THEN** 显示精美的内容展示页

#### Scenario: 追踪点击
- **WHEN** 有人点击分享链接
- **THEN** 记录访问来源和时间

### Requirement: Privacy Control
系统应当提供隐私控制选项。

#### Scenario: 分享前预览
- **WHEN** 用户点击分享
- **THEN** 显示预览界面并标注哪些信息将被分享

#### Scenario: 敏感数据过滤
- **WHEN** 生成分享内容
- **THEN** 自动隐藏体重、年龄等敏感信息

#### Scenario: 分享范围选择
- **WHEN** 用户设置分享范围
- **THEN** 可选择公开、仅好友、私密

#### Scenario: 撤回分享
- **WHEN** 用户后悔分享
- **THEN** 可撤回分享并使链接失效

### Requirement: Community Features
系统应当提供社区交流功能（可选）。

#### Scenario: 发布动态
- **WHEN** 用户分享到社区
- **THEN** 创建社区帖子供其他用户查看

#### Scenario: 点赞和评论
- **WHEN** 其他用户看到动态
- **THEN** 可点赞和评论

#### Scenario: 话题标签
- **WHEN** 发布动态时
- **THEN** 可添加话题（如#减重成功）

#### Scenario: 内容审核
- **WHEN** 用户发布内容
- **THEN** 系统自动过滤敏感词并人工审核（如需要）

### Requirement: Share Analytics
系统应当追踪分享效果。

#### Scenario: 记录分享次数
- **WHEN** 用户分享内容
- **THEN** 累加分享计数

#### Scenario: 追踪点击率
- **WHEN** 分享链接被点击
- **THEN** 记录点击来源和时间

#### Scenario: 转化统计
- **WHEN** 通过分享链接注册新用户
- **THEN** 记录转化并归属给分享者

#### Scenario: 分享效果报告
- **WHEN** 用户查看分享统计
- **THEN** 显示分享次数、点击量、转化数

### Requirement: Invitation Rewards
系统应当提供邀请奖励机制（可选）。

#### Scenario: 生成邀请码
- **WHEN** 用户访问邀请页面
- **THEN** 生成唯一邀请码

#### Scenario: 追踪邀请关系
- **WHEN** 新用户通过邀请码注册
- **THEN** 建立邀请关系

#### Scenario: 发放奖励
- **WHEN** 被邀请用户完成首次打卡
- **THEN** 邀请者获得7天VIP奖励

#### Scenario: 邀请统计
- **WHEN** 用户查看邀请数据
- **THEN** 显示邀请人数、成功注册数、奖励明细

### Requirement: Share Button Placement
系统应当在关键位置添加分享按钮。

#### Scenario: 健康报告分享
- **WHEN** 查看健康报告
- **THEN** 显示「分享」按钮

#### Scenario: 目标达成分享
- **WHEN** 完成目标弹出庆祝
- **THEN** 显示「分享成果」按钮

#### Scenario: 打卡分享
- **WHEN** 完成连续打卡里程碑
- **THEN** 提示「分享给朋友」

#### Scenario: 食谱分享
- **WHEN** 查看食谱详情
- **THEN** 显示「分享这个食谱」按钮

