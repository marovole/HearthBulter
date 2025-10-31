# Proposal: Add Medical Report OCR

## Why

体检报告包含专业医疗数据（血脂、血糖、肝肾功能等），手动录入繁琐且易出错。通过OCR自动识别并结构化存储，可以大幅提升用户体验，同时为健康分析提供权威数据支撑。

## What Changes

- 对接OCR服务（Tesseract.js或Azure OCR）
- 实现体检报告上传和识别功能
- 创建数据提取和结构化存储逻辑
- 添加手动修正和学习机制
- 实现历史报告对比分析

## Impact

**Affected Specs**:
- `medical-report-integration` (NEW)

**Affected Code**:
- `src/lib/services/ocr-service.ts` - OCR集成
- `src/lib/services/report-parser.ts` - 报告解析
- `src/app/api/members/[id]/reports/**` - 报告管理API
- `src/components/reports/**` - 报告上传UI

**Breaking Changes**: 无

**Dependencies**:
- Tesseract.js (开源OCR) 或 Azure Cognitive Services
- PDF解析库（pdf-parse）

**Estimated Effort**: 4天开发 + 2天测试
