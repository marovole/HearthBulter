# Specification: Smart Recipe Recommendation

## ADDED Requirements

### Requirement: Multi-Factor Recommendation Engine
The system SHALL provide a recommendation engine that considers multiple factors including inventory availability, price constraints, seasonal ingredients, user preferences, and nutritional requirements.

#### Scenario: 基于库存推荐
- **WHEN** 用户查看推荐食谱
- **THEN** 优先推荐电商平台有库存的食材

#### Scenario: 基于季节推荐
- **WHEN** 当前为秋季
- **THEN** 推荐使用当季食材（南瓜、红薯等）的食谱

#### Scenario: 基于价格推荐
- **WHEN** 用户设定预算为「经济型」
- **THEN** 推荐使用平价食材的食谱

#### Scenario: 基于营养目标推荐
- **WHEN** 用户目标为「减重」
- **THEN** 推荐低碳水、高蛋白的食谱

#### Scenario: 综合排序
- **WHEN** 计算推荐分数
- **THEN** 综合库存(30%)、价格(20%)、营养(30%)、用户偏好(20%)加权排序

### Requirement: Collaborative Filtering
The system SHALL implement collaborative filtering algorithms to recommend recipes based on similar users' preferences and behaviors.

#### Scenario: 相似用户发现
- **WHEN** 用户A和用户B都喜欢「番茄炒蛋」和「宫保鸡丁」
- **THEN** 系统识别为相似用户

#### Scenario: 协同推荐
- **WHEN** 相似用户收藏了「麻婆豆腐」
- **THEN** 向当前用户推荐「麻婆豆腐」

#### Scenario: 冷启动处理
- **WHEN** 新用户无历史行为
- **THEN** 推荐热门食谱和默认偏好食谱

### Requirement: Content-Based Filtering
The system SHALL provide content-based filtering that recommends recipes with similar ingredients, cooking methods, and nutritional profiles.

#### Scenario: 食材偏好匹配
- **WHEN** 用户经常收藏含「鸡胸肉」的食谱
- **THEN** 推荐更多使用鸡胸肉的食谱

#### Scenario: 烹饪时间匹配
- **WHEN** 用户偏好<30分钟的快手菜
- **THEN** 优先推荐烹饪时间短的食谱

#### Scenario: 口味偏好匹配
- **WHEN** 用户标注「喜欢川菜」
- **THEN** 推荐更多川菜风味食谱

### Requirement: Ingredient Substitution
The system SHALL support intelligent ingredient substitutions based on allergies, budget constraints, taste preferences, and availability.

#### Scenario: 过敏原替换
- **WHEN** 用户对虾过敏，食谱包含虾
- **THEN** 推荐用鸡肉或鱿鱼替换并说明营养差异

#### Scenario: 库存缺货替换
- **WHEN** 食谱中的「羊肉」无库存
- **THEN** 推荐用牛肉或猪肉替换

#### Scenario: 预算优化替换
- **WHEN** 食谱超出预算
- **THEN** 推荐更便宜但营养相似的替代食材

#### Scenario: 营养保持
- **WHEN** 进行食材替换
- **THEN** 确保宏量营养素偏差<10%

### Requirement: Recipe Rating and Feedback
The system SHALL allow users to rate recipes and provide feedback to improve future recommendations.

#### Scenario: 评分食谱
- **WHEN** 用户完成某食谱
- **THEN** 弹出评分界面（1-5星）

#### Scenario: 快捷标签
- **WHEN** 用户评分后
- **THEN** 可选择标签（好吃、简单、耗时、难吃、太咸等）

#### Scenario: 文字评价
- **WHEN** 用户愿意详细反馈
- **THEN** 可填写文字评价（可选）

#### Scenario: 反馈应用
- **WHEN** 用户对某食谱评分<3星
- **THEN** 降低该食谱及相似食谱的推荐权重

### Requirement: Recipe Collection and History
The system SHALL enable users to collect favorite recipes and maintain a history of viewed and cooked recipes.

#### Scenario: 收藏食谱
- **WHEN** 用户点击「收藏」
- **THEN** 添加到收藏列表并影响推荐算法

#### Scenario: 查看收藏
- **WHEN** 用户访问「我的收藏」
- **THEN** 显示所有收藏的食谱按时间排序

#### Scenario: 取消收藏
- **WHEN** 用户点击「取消收藏」
- **THEN** 从收藏列表移除但保留历史记录

#### Scenario: 浏览历史
- **WHEN** 用户访问「浏览历史」
- **THEN** 显示最近查看的30条食谱记录

### Requirement: Refresh Recommendations
The system SHALL provide a "refresh" feature to generate new recommendations while maintaining the user's constraints and preferences.

#### Scenario: 换一批
- **WHEN** 用户点击「换一批」
- **THEN** 生成新的推荐食谱但保持营养目标不变

#### Scenario: 避免重复
- **WHEN** 刷新推荐
- **THEN** 排除近7天已推荐的食谱

#### Scenario: 保持质量
- **WHEN** 刷新后
- **THEN** 新推荐的食谱评分>4.0分

### Requirement: Recommendation Explanation
The system SHALL provide clear explanations for why each recipe was recommended to increase user trust and understanding.

#### Scenario: 显示推荐理由
- **WHEN** 查看推荐食谱
- **THEN** 显示理由标签（如「当季食材」、「符合您的口味」）

#### Scenario: 详细解释
- **WHEN** 用户点击推荐理由
- **THEN** 展开详细说明（如「使用秋季南瓜，价格实惠」）

#### Scenario: 多重理由
- **WHEN** 某食谱有多个推荐理由
- **THEN** 按重要性显示前3个理由

### Requirement: User Preference Learning
The system SHALL continuously learn from user interactions to improve recommendation accuracy over time.

#### Scenario: 口味偏好提取
- **WHEN** 用户连续收藏3个川菜食谱
- **THEN** 自动标注用户偏好为「川菜」

#### Scenario: 食材偏好学习
- **WHEN** 用户频繁选择含「西兰花」的食谱
- **THEN** 提高西兰花在推荐中的权重

#### Scenario: 时间偏好学习
- **WHEN** 用户工作日只选择<20分钟的食谱
- **THEN** 工作日优先推荐快手菜

#### Scenario: 偏好更新
- **WHEN** 用户行为模式改变
- **THEN** 动态调整偏好模型（最近30天权重更高）

