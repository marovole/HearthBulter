# Implementation Tasks

## 1. Database Setup
- [x] 1.1 创建Prisma Schema（User, Family, FamilyMember, HealthGoal, Allergy模型）
- [x] 1.2 运行初始数据库迁移
- [x] 1.3 编写seed脚本创建测试数据

## 2. Authentication
- [x] 2.1 配置NextAuth.js（Credentials + Google Provider）
- [x] 2.2 实现用户注册API `/api/auth/register`
- [x] 2.3 实现登录/登出功能
- [x] 2.4 添加会话管理中间件
- [ ] 2.5 编写认证单元测试

## 3. Family Management
- [x] 3.1 实现家庭CRUD API (`/api/families`)
- [x] 3.2 实现家庭创建引导流程
- [ ] 3.3 实现邀请成员功能
- [x] 3.4 添加权限验证中间件
- [ ] 3.5 编写家庭管理集成测试

## 4. Member Profile Management
- [x] 4.1 实现成员CRUD API (`/api/families/:id/members`)
- [x] 4.2 实现BMI/TDEE自动计算服务
- [ ] 4.3 创建成员档案UI组件
- [x] 4.4 实现软删除逻辑
- [ ] 4.5 编写成员管理单元测试

## 5. Health Goals & Allergies
- [ ] 5.1 实现健康目标API (`/api/members/:id/goals`)
- [ ] 5.2 实现过敏史API (`/api/members/:id/allergies`)
- [ ] 5.3 创建目标设定UI
- [ ] 5.4 创建过敏记录UI
- [ ] 5.5 编写目标计算逻辑测试

## 6. UI Components
- [ ] 6.1 创建登录/注册页面
- [ ] 6.2 创建家庭仪表盘
- [ ] 6.3 创建成员列表和详情页
- [ ] 6.4 创建目标设定表单
- [ ] 6.5 添加响应式布局（移动端适配）

## 7. Testing & Documentation
- [ ] 7.1 编写E2E测试（注册→创建家庭→添加成员）
- [ ] 7.2 测试权限控制（管理员/普通成员）
- [ ] 7.3 更新API文档
- [ ] 7.4 编写用户指南
- [ ] 7.5 进行性能测试（>100用户并发）
