# Family Profile Management - Technical Design

## Context

家庭档案管理是Health Butler的核心基础能力，为整个系统提供用户身份、家庭成员数据和权限管理。所有其他功能模块（健康数据、食谱生成、购物清单等）都依赖此模块。

**关键约束**:
- 必须支持多成员家庭（最多20人/家庭）
- 数据隐私合规（GDPR/HIPAA）
- 高可用性要求（认证服务停机影响全系统）

---

## Goals / Non-Goals

### Goals
- ✅ 提供安全的用户认证与授权
- ✅ 支持家庭多成员档案管理
- ✅ 实现基于角色的权限控制（RBAC）
- ✅ 自动计算健康指标（BMI、TDEE等）
- ✅ 确保数据隐私与合规性

### Non-Goals
- ❌ 不支持多家庭归属（一个用户只能属于一个家庭）
- ❌ 不提供高级权限管理（如细粒度资源权限）
- ❌ 不支持第三方账号合并（如将Google账号与Email账号合并）

---

## Data Models

### Prisma Schema

```prisma
// 用户账户
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  password      String?   // Nullable for OAuth users
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  familyMember  FamilyMember? // One-to-one with member profile

  @@map("users")
}

// OAuth账户（NextAuth支持）
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // oauth, email
  provider          String  // google, credentials
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// 会话管理
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// 家庭
model Family {
  id        String   @id @default(cuid())
  name      String   // "黄家"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  members FamilyMember[]

  @@map("families")
}

// 家庭成员
model FamilyMember {
  id        String   @id @default(cuid())
  familyId  String
  userId    String?  @unique // Nullable for non-user members (e.g., children)

  // 基础信息
  name      String
  gender    Gender
  birthDate DateTime

  // 身体参数
  height    Float    // cm
  weight    Float    // kg

  // 权限
  role      FamilyRole @default(MEMBER)

  // 软删除
  deletedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  family       Family        @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user         User?         @relation(fields: [userId], references: [id])
  healthGoals  HealthGoal[]
  allergies    Allergy[]
  healthData   HealthData[]  // 健康数据记录

  @@map("family_members")
}

// 健康目标
model HealthGoal {
  id             String       @id @default(cuid())
  memberId       String
  type           GoalType
  targetValue    Float?       // e.g., 目标体重70kg
  targetDate     DateTime?
  weeklyActivity Int          @default(0) // 每周运动次数

  // 计算值
  currentValue   Float?
  startValue     Float?
  progressPercent Float?

  status         GoalStatus   @default(ACTIVE)

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  member FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@map("health_goals")
}

// 过敏史
model Allergy {
  id        String         @id @default(cuid())
  memberId  String
  allergen  String         // "海鲜类"
  severity  AllergySeverity @default(MODERATE)
  notes     String?

  createdAt DateTime @default(now())

  member FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@map("allergies")
}

// 健康数据（体重、体脂等）
model HealthData {
  id        String   @id @default(cuid())
  memberId  String
  weight    Float?   // kg
  bodyFat   Float?   // %
  bloodPressureSystolic  Int? // 收缩压
  bloodPressureDiastolic Int? // 舒张压
  measuredAt DateTime @default(now())

  member FamilyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@map("health_data")
}

// Enums
enum Gender {
  MALE
  FEMALE
  OTHER
}

enum FamilyRole {
  ADMIN  // 家庭管理员
  MEMBER // 普通成员
}

enum GoalType {
  WEIGHT_LOSS   // 减重
  MUSCLE_GAIN   // 增肌
  MAINTENANCE   // 维持
  HEALTH_MANAGE // 疾病管理
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

enum AllergySeverity {
  MILD
  MODERATE
  SEVERE
}
```

---

## API Design

### REST API Endpoints (Next.js API Routes)

#### Authentication
```
POST   /api/auth/register              # 邮箱注册
POST   /api/auth/login                 # 邮箱登录
GET    /api/auth/providers             # 获取OAuth提供商列表
POST   /api/auth/callback/[provider]   # OAuth回调 (NextAuth自动处理)
POST   /api/auth/signout               # 登出
```

#### Family Management
```
POST   /api/families                   # 创建家庭
GET    /api/families/:id               # 获取家庭信息
PATCH  /api/families/:id               # 更新家庭信息
DELETE /api/families/:id               # 删除家庭（仅管理员）
```

#### Member Management
```
GET    /api/families/:familyId/members              # 获取成员列表
POST   /api/families/:familyId/members              # 添加成员
GET    /api/families/:familyId/members/:memberId    # 获取成员详情
PATCH  /api/families/:familyId/members/:memberId    # 更新成员档案
DELETE /api/families/:familyId/members/:memberId    # 删除成员（软删除）
```

#### Health Goals
```
GET    /api/members/:memberId/goals          # 获取成员健康目标
POST   /api/members/:memberId/goals          # 设定新目标
PATCH  /api/members/:memberId/goals/:goalId  # 更新目标
DELETE /api/members/:memberId/goals/:goalId  # 取消目标
```

#### Allergies
```
GET    /api/members/:memberId/allergies      # 获取过敏史
POST   /api/members/:memberId/allergies      # 添加过敏记录
DELETE /api/members/:memberId/allergies/:id  # 删除过敏记录
```

#### Health Data
```
GET    /api/members/:memberId/health-data     # 获取历史健康数据
POST   /api/members/:memberId/health-data     # 记录新数据点
```

### API Response Format

**成功响应**:
```json
{
  "success": true,
  "data": {
    "id": "cm1x2y3z",
    "name": "黄家",
    "members": [...]
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "仅管理员可删除成员"
  }
}
```

---

## Business Logic Services

### Calculation Services

#### `calculateBMI(height: number, weight: number): number`
```typescript
// BMI = weight(kg) / (height(m))^2
export function calculateBMI(height: number, weight: number): number {
  const heightInMeters = height / 100
  return parseFloat((weight / (heightInMeters ** 2)).toFixed(1))
}
```

#### `calculateBMR(gender: Gender, weight: number, height: number, age: number): number`
```typescript
// Mifflin-St Jeor公式
export function calculateBMR(
  gender: Gender,
  weight: number,
  height: number,
  age: number
): number {
  if (gender === 'MALE') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161
  }
}
```

#### `calculateTDEE(bmr: number, activityLevel: number): number`
```typescript
// TDEE = BMR × 活动系数
export function calculateTDEE(bmr: number, activityLevel: number): number {
  // activityLevel: 1.2 (sedentary) - 2.0 (very active)
  return Math.round(bmr * activityLevel)
}
```

#### `calculateAge(birthDate: Date): number`
```typescript
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1
  }
  return age
}
```

---

## Authentication & Authorization

### NextAuth.js Configuration

**Providers**:
- **Email/Password**: 使用bcrypt加密密码
- **Google OAuth**: 通过Google Cloud Console配置
- **Apple Sign-in**: 通过Apple Developer配置（Roadmap）

**Session Strategy**:
- **JWT-based sessions** (无状态，适合Vercel Serverless)
- Token存储在httpOnly cookie中（防XSS）

**Permission Middleware**:
```typescript
export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const member = await prisma.familyMember.findUnique({
    where: { userId: session.user.id }
  })

  if (member?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
}
```

---

## Security Considerations

### Data Encryption
- **Passwords**: bcrypt with salt rounds = 12
- **Sensitive health data**: AES-256-GCM加密存储（应用层加密）
- **API tokens**: 随机生成，哈希后存储

### Rate Limiting
- **登录端点**: 5次/15分钟/IP（防暴力破解）
- **API请求**: 100次/分钟/用户（防滥用）

### CSRF Protection
- NextAuth自动启用CSRF token验证
- 所有POST/PATCH/DELETE请求需携带token

---

## Migration Plan

### Database Migrations
```bash
# 初始化Prisma
pnpm prisma init

# 创建初始迁移
pnpm prisma migrate dev --name init

# 生成Prisma Client
pnpm prisma generate
```

### Seed Data (Development)
```typescript
// prisma/seed.ts
async function main() {
  // 创建测试用户
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Test User'
    }
  })

  // 创建测试家庭
  const family = await prisma.family.create({
    data: {
      name: '测试家庭',
      members: {
        create: {
          userId: user.id,
          name: 'Test User',
          gender: 'MALE',
          birthDate: new Date('1990-01-01'),
          height: 175,
          weight: 70,
          role: 'ADMIN'
        }
      }
    }
  })
}
```

---

## Testing Strategy

### Unit Tests
- **Services**: 测试BMR/TDEE/BMI计算逻辑
- **Utilities**: 测试年龄计算、数据验证函数

### Integration Tests
- **API endpoints**: 测试CRUD操作和权限验证
- **Database queries**: 测试Prisma queries性能

### E2E Tests
- **User registration flow**: 注册 → 邮箱验证 → 登录
- **Family creation flow**: 创建家庭 → 添加成员 → 设定目标

---

## Performance Optimization

### Database Indexing
```prisma
model FamilyMember {
  @@index([familyId])
  @@index([userId])
  @@index([deletedAt]) // 软删除过滤
}
```

### Caching Strategy
- **Session data**: JWT缓存（无需数据库查询）
- **Member list**: Redis缓存5分钟（读多写少）

### Query Optimization
```typescript
// Bad: N+1 queries
const members = await prisma.familyMember.findMany()
for (const member of members) {
  const goals = await prisma.healthGoal.findMany({ where: { memberId: member.id } })
}

// Good: 使用include预加载
const members = await prisma.familyMember.findMany({
  include: {
    healthGoals: true,
    allergies: true
  }
})
```

---

## Risks / Trade-offs

### Risk 1: OAuth Provider Downtime
- **风险**: Google/Apple OAuth服务中断导致用户无法登录
- **缓解**: 同时提供邮箱密码登录作为备用方案

### Risk 2: Family Member Limit
- **决策**: 限制每个家庭最多20名成员
- **理由**: 防止滥用，减少数据库负载
- **Trade-off**: 大家庭用户可能受限（通过客服处理特例）

### Risk 3: Soft Delete Data Growth
- **风险**: 软删除数据累积导致数据库膨胀
- **缓解**: 定期运行清理任务（保留30天后物理删除）

---

## Open Questions

- [ ] 是否支持家庭转移（将成员从一个家庭迁移到另一个家庭）？
- [ ] 是否需要支持多语言（i18n）？
- [ ] 是否需要审计日志（Audit Log）记录所有敏感操作？
- [ ] 儿童成员（<13岁）是否需要特殊的隐私保护？

---

**最后更新**: 2025-10-29
**维护者**: Ronn Huang
