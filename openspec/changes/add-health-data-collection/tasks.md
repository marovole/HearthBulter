# Implementation Tasks

## 1. Database Models
- [ ] 1.1 创建HealthData Prisma模型（体重、体脂、血压等字段）
- [ ] 1.2 添加DataSource枚举（手动、设备、体检报告）
- [ ] 1.3 运行数据库迁移
- [ ] 1.4 添加索引优化查询性能

## 2. Data Validation Service
- [ ] 2.1 创建health-data-validator.ts服务
- [ ] 2.2 实现范围验证（体重20-300kg，体脂3-50%等）
- [ ] 2.3 实现异常检测（与上次数据对比）
- [ ] 2.4 编写验证逻辑单元测试

## 3. Health Data API
- [ ] 3.1 实现POST /api/members/:id/health-data（录入数据）
- [ ] 3.2 实现GET /api/members/:id/health-data（查询历史）
- [ ] 3.3 实现GET /api/members/:id/health-data/trends（趋势分析）
- [ ] 3.4 实现DELETE /api/members/:id/health-data/:dataId（删除错误记录）
- [ ] 3.5 添加权限验证（仅成员本人或管理员）

## 4. UI Components
- [ ] 4.1 创建健康数据录入表单（HealthDataForm.tsx）
- [ ] 4.2 创建历史数据列表（HealthDataList.tsx）
- [ ] 4.3 创建趋势图表组件（TrendChart.tsx）
- [ ] 4.4 添加快速录入按钮（QuickEntry.tsx）
- [ ] 4.5 实现移动端优化

## 5. Reminder System
- [ ] 5.1 设计提醒配置数据模型
- [ ] 5.2 实现提醒设置API
- [ ] 5.3 创建后台任务发送通知
- [ ] 5.4 实现打卡连续天数统计

## 6. Testing
- [ ] 6.1 编写数据验证单元测试
- [ ] 6.2 编写API集成测试
- [ ] 6.3 测试异常数据处理
- [ ] 6.4 E2E测试（录入→查看趋势）
