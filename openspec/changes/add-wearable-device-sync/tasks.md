# Implementation Tasks

## 1. Apple HealthKit Integration
- [ ] 1.1 安装react-native-health库
- [ ] 1.2 配置iOS权限（Info.plist）
- [ ] 1.3 创建healthkit-service.ts服务类
- [ ] 1.4 实现步数、心率、卡路里同步
- [ ] 1.5 实现增量同步（避免重复拉取）

## 2. Huawei Health Integration
- [ ] 2.1 安装@hmscore/react-native-hms-health库
- [ ] 2.2 配置Android权限
- [ ] 2.3 创建huawei-health-service.ts服务类
- [ ] 2.4 实现睡眠、运动数据同步
- [ ] 2.5 处理HMS Core依赖

## 3. Data Deduplication
- [ ] 3.1 创建data-deduplication.ts服务
- [ ] 3.2 实现时间窗口去重策略（±1小时）
- [ ] 3.3 设备数据优先级高于手动录入
- [ ] 3.4 记录数据来源（source字段）
- [ ] 3.5 编写去重逻辑单元测试

## 4. Device Management API
- [ ] 4.1 实现POST /api/devices/connect（连接设备）
- [ ] 4.2 实现DELETE /api/devices/:id/disconnect（断开设备）
- [ ] 4.3 实现GET /api/devices（查询已连接设备）
- [ ] 4.4 实现POST /api/devices/sync（手动触发同步）

## 5. Sync Background Service
- [ ] 5.1 创建后台同步任务
- [ ] 5.2 实现30分钟增量同步
- [ ] 5.3 添加同步状态监控
- [ ] 5.4 处理网络中断重试

## 6. UI Components
- [ ] 6.1 创建设备连接页面（DeviceConnection.tsx）
- [ ] 6.2 创建同步状态显示（SyncStatus.tsx）
- [ ] 6.3 显示最后同步时间
- [ ] 6.4 添加手动同步按钮

## 7. Testing
- [ ] 7.1 在iOS设备测试Apple Health同步
- [ ] 7.2 在Android设备测试华为Health同步
- [ ] 7.3 测试数据去重准确性
- [ ] 7.4 测试后台同步稳定性
