# Proposal: Add AI Nutrition Advisor

## Why

虽然系统已能生成食谱和计算营养素，但缺乏智能化的健康建议和个性化优化方案。集成GPT-4/Claude可根据体检数据、健康目标、饮食偏好提供专业营养建议，实现从「数据计算」到「智能决策」的升级。

## What Changes

- 集成OpenAI GPT-4 Turbo或Anthropic Claude API
- 开发结构化Prompt工程（体检数据→营养建议）
- 实现个性化健康分析引擎
- 添加食谱智能优化功能（AI驱动的食材替换）
- 开发周期性健康报告生成器
- 实现对话式营养咨询（问答系统）
- 添加AI建议历史记录和反馈机制

## Impact

**Affected Specs**:
- `ai-nutrition-advisor` (NEW)
- `meal-planning` (MODIFIED - 添加AI优化功能)

**Affected Code**:
- `src/lib/services/ai/` - AI服务层（新增）
  - `openai-client.ts` - OpenAI客户端
  - `prompt-templates.ts` - Prompt模板
  - `health-analyzer.ts` - 健康分析引擎
- `src/lib/services/nutrition-advisor.ts` - 营养建议服务
- `src/app/api/ai/**` - AI API路由
- `src/components/advisor/` - 营养建议组件（新增）
  - `HealthAnalysisPanel.tsx` - 健康分析面板
  - `AIChat.tsx` - 对话式咨询
  - `SmartRecipeOptimizer.tsx` - 智能食谱优化
- Prisma Schema - 添加AIAdvice, AIConversation模型

**Breaking Changes**: 无

**Dependencies**:
- `openai` (^4.x) 或 `@anthropic-ai/sdk`
- API Key管理（环境变量）
- Token使用监控和成本控制

**Estimated Effort**: 6天开发 + 2天测试 + 1天Prompt调优

**Risks**:
- API成本控制（需设置使用额度）
- 响应延迟（3-10秒）
- 医疗免责声明（AI建议不能替代专业医生）

