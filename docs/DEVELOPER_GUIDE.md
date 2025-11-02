# 开发者文档 - 健康管家仪表盘

## 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [环境设置](#环境设置)
4. [组件架构](#组件架构)
5. [API 接口](#api-接口)
6. [状态管理](#状态管理)
7. [样式系统](#样式系统)
8. [测试指南](#测试指南)
9. [部署指南](#部署指南)
10. [贡献指南](#贡献指南)

## 项目概述

### 项目简介
健康管家仪表盘是一个基于 Next.js 的现代化健康管理平台，支持家庭成员健康数据管理、趋势分析、营养追踪等功能。

### 核心特性
- 📱 响应式设计，支持桌面和移动端
- 👥 多成员家庭健康管理
- 📊 丰富的数据可视化
- 🎯 个性化健康目标设置
- 🔒 灵活的权限管理
- 📋 营养分析和建议
- 🎮 移动端手势操作

### 技术栈
- **前端框架**: React 18 + Next.js 15
- **样式方案**: Tailwind CSS 4.0
- **图表库**: Recharts 3.3
- **图标库**: Lucide React
- **状态管理**: React Hooks + Zustand
- **表单处理**: React Hook Form + Zod
- **测试框架**: Jest + Testing Library
- **类型检查**: TypeScript

## 技术架构

### 目录结构
```
src/
├── components/
│   ├── dashboard/           # 仪表盘组件
│   ├── ui/                  # 基础UI组件
│   └── layout/              # 布局组件
├── lib/
│   ├── hooks/               # 自定义Hooks
│   ├── utils/               # 工具函数
│   ├── services/            # API服务
│   └── types/               # TypeScript类型定义
├── app/
│   ├── dashboard/           # 仪表盘页面
│   └── api/                 # API路由
├── __tests__/               # 测试文件
└── styles/                  # 样式文件
```

### 组件层次结构
```
EnhancedDashboard
├── DashboardLayout
│   ├── Sidebar
│   ├── Header
│   └── MainContent
├── OverviewCards
├── HealthMetricsChart
├── FamilyMembersCard
├── NutritionTrendChart
├── HealthScoreDisplay
├── QuickActionsPanel
├── TrendsSection
└── InsightsPanel
```

## 环境设置

### 系统要求
- Node.js >= 20.0.0
- npm >= 8.0.0 或 pnpm >= 8.0.0

### 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 环境变量配置
创建 `.env.local` 文件：
```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/health_butler"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# API 配置
API_BASE_URL="http://localhost:3000/api"

# 第三方服务配置
OPENAI_API_KEY="your-openai-key"
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 组件架构

### 核心组件

#### EnhancedDashboard
主要的仪表盘容器组件，负责：
- 布局管理
- 数据加载
- 状态协调
- 组件通信

```typescript
interface EnhancedDashboardProps {
  familyId: string
}

export function EnhancedDashboard({ familyId }: EnhancedDashboardProps) {
  // 组件实现
}
```

#### HealthMetricsChart
健康数据图表组件，支持：
- 多指标展示（体重、体脂、血压、心率）
- 时间范围筛选
- 数据对比
- 交互式图表

```typescript
interface HealthMetricsChartProps {
  memberId: string
  days?: number
}
```

#### FamilyMembersCard
家庭成员管理组件，包含：
- 成员列表展示
- 成员切换
- 权限管理
- 健康状态概览

```typescript
interface FamilyMembersCardProps {
  familyId: string
  onMemberSelect?: (memberId: string) => void
}
```

### 自定义 Hooks

#### useHealthMetrics
健康数据管理 Hook：
```typescript
function useHealthMetrics(memberId: string, days: number) {
  const [data, setData] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hook 实现
  return { data, loading, error, refetch }
}
```

#### useGestures
手势操作 Hook：
```typescript
function useSwipe(options: SwipeOptions) {
  // 滑动手势处理
  return { addEventListeners, removeEventListeners }
}

function useLongPress(options: LongPressOptions) {
  // 长按手势处理
  return { onMouseDown, onMouseUp, onTouchStart, onTouchEnd }
}
```

## API 接口

### RESTful API 设计

#### 家庭成员 API
```typescript
// 获取家庭成员列表
GET /api/dashboard/family-members?familyId={familyId}

// 添加家庭成员
POST /api/dashboard/family-members
Body: {
  name: string
  email?: string
  role: 'admin' | 'member' | 'child'
}

// 更新成员信息
PUT /api/dashboard/family-members/{memberId}
Body: Partial<FamilyMember>

// 删除成员
DELETE /api/dashboard/family-members/{memberId}
```

#### 健康数据 API
```typescript
// 获取健康指标数据
GET /api/dashboard/health-metrics?memberId={memberId}&days={days}

// 记录健康数据
POST /api/dashboard/health-metrics
Body: {
  memberId: string
  date: string
  weight?: number
  bodyFat?: number
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  heartRate?: number
}
```

#### 健康评分 API
```typescript
// 获取健康评分
GET /api/dashboard/health-score?memberId={memberId}

// 获取评分历史
GET /api/dashboard/health-score/history?memberId={memberId}&days={days}
```

### 数据类型定义

```typescript
interface FamilyMember {
  id: string
  name: string
  email?: string
  avatar?: string
  role: 'admin' | 'member' | 'child'
  permissions: MemberPermissions
  healthScore: number
  lastActive: Date
}

interface HealthMetric {
  date: string
  weight: number
  bodyFat: number
  bloodPressure: {
    systolic: number
    diastolic: number
  }
  heartRate: number
}

interface NutritionData {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}
```

## 状态管理

### 本地状态管理
使用 React Hooks 进行组件级状态管理：
```typescript
const [selectedMember, setSelectedMember] = useState<string>('')
const [timeRange, setTimeRange] = useState<number>(30)
const [loading, setLoading] = useState<boolean>(true)
```

### 全局状态管理
使用 Zustand 管理跨组件状态：
```typescript
interface AppState {
  currentUser: User | null
  selectedFamily: Family | null
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedFamily: (family: Family) => void
}

const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  selectedFamily: null,
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  setSelectedFamily: (family) => set({ selectedFamily: family }),
}))
```

## 样式系统

### Tailwind CSS 配置
项目使用 Tailwind CSS 4.0 进行样式开发：

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  }
}
```

### 组件样式规范
```typescript
// 使用 clsx 和 tailwind-merge 进行样式组合
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 示例：按钮组件
const Button = ({ variant, size, className, ...props }) => (
  <button
    className={cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      {
        'bg-primary-600 text-white hover:bg-primary-700': variant === 'primary',
        'bg-gray-100 text-gray-900 hover:bg-gray-200': variant === 'secondary',
      },
      {
        'h-9 px-3 text-sm': size === 'sm',
        'h-10 px-4 text-sm': size === 'default',
        'h-11 px-8 text-base': size === 'lg',
      },
      className
    )}
    {...props}
  />
)
```

## 测试指南

### 测试结构
```
src/__tests__/
├── setup.ts                 # 测试环境配置
├── components/              # 组件单元测试
│   ├── HealthMetricsChart.test.tsx
│   ├── FamilyMembersCard.test.tsx
│   └── GestureComponents.test.tsx
├── integration/             # 集成测试
│   └── EnhancedDashboard.test.tsx
└── utils/                   # 工具函数测试
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 测试示例

#### 组件单元测试
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { HealthMetricsChart } from '../HealthMetricsChart'

describe('HealthMetricsChart', () => {
  it('renders loading state', () => {
    render(<HealthMetricsChart memberId="test" />)
    expect(screen.getByText('加载健康数据中...')).toBeInTheDocument()
  })

  it('displays chart data', async () => {
    const mockData = { data: [{ date: '2024-01-01', weight: 70 }] }
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    })

    render(<HealthMetricsChart memberId="test" />)
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument()
    })
  })
})
```

#### 集成测试
```typescript
import { render, screen } from '@testing-library/react'
import { EnhancedDashboard } from '../EnhancedDashboard'

describe('EnhancedDashboard Integration', () => {
  it('renders all dashboard components', async () => {
    render(<EnhancedDashboard familyId="test-family" />)
    
    await waitFor(() => {
      expect(screen.getByText('健康数据趋势')).toBeInTheDocument()
      expect(screen.getByText('家庭成员')).toBeInTheDocument()
    })
  })
})
```

## 部署指南

### 构建生产版本
```bash
npm run build
```

### 环境变量配置
生产环境需要配置以下环境变量：
```env
NODE_ENV="production"
DATABASE_URL="production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret"
```

### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到 Vercel
vercel --prod
```

### Docker 部署
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建和运行
docker build -t health-butler .
docker run -p 3000:3000 health-butler
```

## 贡献指南

### 开发流程
1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 组件使用函数式组件和 Hooks
- 文件名使用 PascalCase（组件）或 camelCase（工具函数）

### 提交规范
使用 Conventional Commits 规范：
```bash
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

### 代码审查
- 所有 PR 需要通过代码审查
- 确保测试覆盖率不低于 70%
- 遵循项目的编码规范
- 更新相关文档

## 性能优化

### 代码分割
```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
})
```

### 图片优化
```typescript
import Image from 'next/image'

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={40}
  height={40}
  priority={true}
/>
```

### 缓存策略
```typescript
// 使用 React Query 进行数据缓存
import { useQuery } from '@tanstack/react-query'

const { data, isLoading } = useQuery({
  queryKey: ['health-metrics', memberId],
  queryFn: () => fetchHealthMetrics(memberId),
  staleTime: 5 * 60 * 1000, // 5分钟
})
```

## 故障排除

### 常见问题

#### 1. 样式不生效
检查 Tailwind CSS 配置和类名是否正确。

#### 2. API 调用失败
检查网络请求和后端服务状态。

#### 3. 类型错误
确保 TypeScript 类型定义正确。

### 调试技巧
- 使用 React DevTools 进行组件调试
- 使用浏览器开发者工具检查网络请求
- 使用 console.log 进行断点调试

## 许可证
MIT License - 详见 [LICENSE](../LICENSE) 文件

---

更多详细信息请参考项目源码和 API 文档。如有问题，请提交 Issue 或联系开发团队。
