# Implementation Tasks

## 1. USDA API Integration
- [ ] 1.1 注册USDA API并获取API Key
- [ ] 1.2 创建USDA服务类（`usda-service.ts`）
- [ ] 1.3 实现食物搜索功能
- [ ] 1.4 实现数据映射（USDA → 本地模型）
- [ ] 1.5 添加API错误处理和重试逻辑

## 2. Database Models
- [ ] 2.1 创建Food Prisma模型
- [ ] 2.2 添加食物分类枚举（FoodCategory）
- [ ] 2.3 创建数据库迁移
- [ ] 2.4 编写seed脚本（常用中文食材库）

## 3. Food Query API
- [ ] 3.1 实现 `/api/foods/search` 端点
- [ ] 3.2 实现 `/api/foods/:id` 端点
- [ ] 3.3 实现 `/api/foods/categories/:category` 端点
- [ ] 3.4 添加全文搜索索引（PostgreSQL）

## 4. Nutrition Calculator
- [ ] 4.1 创建营养计算服务（`nutrition-calculator.ts`）
- [ ] 4.2 实现批量营养计算API
- [ ] 4.3 添加单位转换功能（g, kg, 杯）
- [ ] 4.4 编写计算逻辑单元测试

## 5. Caching Strategy
- [ ] 5.1 配置Redis连接
- [ ] 5.2 实现Food数据Redis缓存
- [ ] 5.3 实现USDA数据90天缓存刷新
- [ ] 5.4 添加缓存命中率监控

## 6. Testing
- [ ] 6.1 编写USDA API集成测试
- [ ] 6.2 测试中英文食物名映射
- [ ] 6.3 测试营养计算精度
- [ ] 6.4 性能测试（1000次查询）
