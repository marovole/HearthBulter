# 代码审查规则文档

本文档详细说明了Health Butler项目中使用的自动化代码审查规则，包括规则类型、严重程度和修复建议。

## 🔍 规则类型

### 1. 复杂度检查 (Complexity)

#### 高复杂度函数 (complexity_high)
- **描述**: 检测复杂度过高的函数
- **严重程度**: 中等
- **触发条件**: 函数中条件语句和循环语句过多
- **修复建议**: 考虑将复杂函数拆分为更小的函数，提高可读性和可维护性
- **影响文件类型**: TypeScript, JavaScript, React

#### 过长函数 (maintainability_long_function)
- **描述**: 检测行数过多的函数
- **严重程度**: 中等
- **触发条件**: 文件行数超过50行
- **修复建议**: 将长函数拆分为更小的函数，提高代码可读性
- **影响文件类型**: 所有代码文件

### 2. 安全检查 (Security)

#### SQL注入风险 (security_sql_injection)
- **描述**: 检测潜在的SQL注入漏洞
- **严重程度**: 严重
- **触发条件**: 包含SQL关键字和字符串插值
- **修复建议**: 使用参数化查询或预编译语句，避免直接拼接SQL字符串
- **影响文件类型**: 所有包含数据库查询的文件

### 3. TypeScript类型检查

#### 使用any类型 (typescript_any_type)
- **描述**: 检测代码中不推荐使用的any类型
- **严重程度**: 高 (已覆盖为高严重性)
- **触发条件**: 使用`: any`类型声明或`<any>`泛型
- **修复建议**: 使用具体的类型定义替换any类型，提高类型安全性
- **影响文件类型**: TypeScript, React

#### React Hooks依赖检查 (react_hooks_dependency)
- **描述**: 检查useEffect和其他hooks的依赖数组
- **严重程度**: 中等
- **触发条件**: 使用useEffect但缺少依赖数组
- **修复建议**: 为useEffect和其他hooks添加完整的依赖数组
- **影响文件类型**: React组件

### 4. 代码风格检查 (Style)

#### 遗留的console.log (style_console_log)
- **描述**: 检测生产环境中不应该存在的console.log语句
- **严重程度**: 低
- **触发条件**: 代码中包含console.log语句
- **修复建议**: 移除或替换为适当的日志记录方法
- **影响文件类型**: 所有代码文件

#### 项目命名规范 (project_naming_convention)
- **描述**: 检查是否遵循项目的命名规范
- **严重程度**: 低
- **触发条件**: 接口名称不符合命名规范
- **修复建议**: 接口名称应该以大写字母开头，或使用I前缀
- **影响文件类型**: TypeScript, React

### 5. 性能检查 (Performance)

#### 大数组操作 (performance_large_array)
- **描述**: 检测可能影响性能的大数组操作
- **严重程度**: 低
- **触发条件**: 文件中包含过多数组方法调用
- **修复建议**: 考虑使用更高效的数据结构或算法优化大数组操作
- **影响文件类型**: 所有代码文件

#### Prisma查询优化 (prisma_query_optimization)
- **描述**: 检查Prisma查询是否包含必要的选择和过滤
- **严重程度**: 低
- **触发条件**: findMany查询没有限制
- **修复建议**: 为findMany查询添加take限制以避免返回过多数据
- **影响文件类型**: 包含Prisma查询的文件

### 6. 可维护性检查

#### API错误处理 (api_error_handling)
- **描述**: 检查API路由是否包含适当的错误处理
- **严重程度**: 中等
- **触发条件**: API路由文件缺少try-catch块
- **修复建议**: 为API路由添加try-catch错误处理
- **影响文件类型**: API路由文件

## 📊 代码指标

系统会为每个文件计算以下指标：

### 复杂度 (Complexity)
- **计算方式**: 基础复杂度(1) + 条件语句数量 + 循环语句数量 + 逻辑运算符数量
- **阈值**: 高于10标记为中等风险，高于15标记为高风险

### 代码行数 (Lines of Code)
- **计算方式**: 非空行数统计
- **阈值**: 高于300行标记为需要关注

### 安全评分 (Security Score)
- **计算方式**: 基础分100 - 每个安全问题扣20分
- **阈值**: 低于70分标记为中等风险，低于50分标记为高风险

### 可维护性指数 (Maintainability Index)
- **计算方式**: 100 - 复杂度*5 - 重复行数
- **阈值**: 低于60分标记为中等风险，低于40分标记为高风险

### 重复行数 (Duplicate Lines)
- **计算方式**: 检测重复的非空有意义行（长度>10字符）
- **阈值**: 高于5行标记为需要关注

## 🚨 失败条件

### 立即失败条件
- 发现严重安全问题
- 高风险问题数量超过5个
- 单文件复杂度超过15
- 单文件安全评分低于50

### 警告条件
- 中风险问题数量超过15个
- 通过率低于60%
- 单文件行数超过300

## ⚙️ 配置自定义规则

### 添加新规则
1. 在 `src/lib/code-review-config.ts` 中的 `defaultCodeReviewConfig.rules` 数组中添加新规则
2. 定义规则的以下属性：
   - `id`: 唯一标识符
   - `name`: 规则名称
   - `description`: 规则描述
   - `condition`: 检测条件函数
   - `severity`: 严重程度 ('low' | 'medium' | 'high' | 'critical')
   - `type`: 规则类型
   - `recommendation`: 修复建议
   - `enabled`: 是否启用
   - `fileTypes`: 影响的文件类型（可选）

### 修改规则严重程度
在 `defaultCodeReviewConfig.severityOverrides` 中覆盖规则的严重程度：

```typescript
severityOverrides: {
  'typescript_any_type': 'high', // 将any类型使用升级为高严重性
  'security_sql_injection': 'critical', // SQL注入保持严重
}
```

### 配置阈值
在 `defaultCodeReviewConfig.thresholds` 中调整各种指标的阈值：

```typescript
thresholds: {
  maxComplexity: 10,
  maxLinesPerFunction: 50,
  maxDuplicateLines: 5,
  minSecurityScore: 70,
  minMaintainabilityIndex: 60,
  maxCriticalIssues: 0,
  maxHighIssues: 3,
  maxMediumIssues: 10,
  minApprovalRate: 0.8,
}
```

## 🔧 使用方法

### 开发时使用
```bash
# 运行代码审查
npm run review

# 生成审查报告
npm run review:report

# 生成HTML报告
npm run review:report:html
```

### 集成到CI/CD
- Pre-commit钩子会自动审查暂存的文件
- GitHub Actions会在PR和push时运行代码审查
- 严重问题会阻止提交和合并

### 代码审查面板
在开发环境中，可以使用 `CodeReviewPanel` 组件来查看详细的审查结果：

```typescript
import { CodeReviewPanel } from '@/components/ui/code-review-panel';

<CodeReviewPanel
  review={{
    content: fileContent,
    filePath: filePath,
    fileType: 'typescript'
  }}
  onReviewComplete={(result) => {
    // 处理审查结果
  }}
/>
```

## 📈 最佳实践

1. **类型安全**: 优先使用具体类型，避免any类型
2. **函数设计**: 保持函数简短，单一职责
3. **安全编程**: 使用参数化查询，验证输入
4. **错误处理**: 完善的错误处理和边界条件检查
5. **代码规范**: 统一的命名和格式约定
6. **性能优化**: 避免不必要的大数组操作

## 🔄 规则更新

规则的更新应该：
1. 向后兼容，不破坏现有代码
2. 有明确的理由和好处
3. 包含详细的文档和示例
4. 经过充分测试验证

---

*此文档会随着项目发展持续更新，请定期查看最新版本。*
