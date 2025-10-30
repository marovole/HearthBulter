# Implementation Tasks

## 1. USDA API Integration
- [x] 1.1 注册USDA API并获取API Key
- [x] 1.2 创建USDA服务类（`usda-service.ts`）
- [x] 1.3 实现食物搜索功能
- [x] 1.4 实现数据映射（USDA → 本地模型）
- [x] 1.5 添加API错误处理和重试逻辑

## 2. Database Models
- [x] 2.1 创建Food Prisma模型
- [x] 2.2 添加食物分类枚举（FoodCategory）
- [x] 2.3 创建数据库迁移
- [x] 2.4 编写seed脚本（常用中文食材库）

## 3. Food Query API
- [x] 3.1 实现 `/api/foods/search` 端点
- [x] 3.2 实现 `/api/foods/:id` 端点
- [x] 3.3 实现 `/api/foods/categories/:category` 端点
- [x] 3.4 添加全文搜索索引（PostgreSQL）- 已创建SQL迁移脚本 `prisma/migrations/add_fulltext_index.sql`

## 4. Nutrition Calculator
- [x] 4.1 创建营养计算服务（`nutrition-calculator.ts`）
- [x] 4.2 实现批量营养计算API
- [x] 4.3 添加单位转换功能（g, kg, 杯）
- [x] 4.4 编写计算逻辑单元测试

## 5. Caching Strategy
- [x] 5.1 配置Redis连接（支持可选依赖，自动降级到内存缓存）
- [x] 5.2 实现Food数据Redis缓存
- [x] 5.3 实现USDA数据90天缓存刷新
- [x] 5.4 添加缓存命中率监控

## 6. Testing
- [x] 6.1 编写USDA API集成测试
- [x] 6.2 测试中英文食物名映射
- [x] 6.3 测试营养计算精度
- [x] 6.4 性能测试（1000次查询）
