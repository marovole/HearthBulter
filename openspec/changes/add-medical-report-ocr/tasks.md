# Implementation Tasks

## 1. OCR Service Integration
- [x] 1.1 选择OCR方案（Tesseract.js vs Azure OCR）
- [x] 1.2 创建ocr-service.ts服务类
- [x] 1.3 实现图片预处理（裁剪、增强对比度）
- [x] 1.4 实现文本识别功能（支持中英文）
- [x] 1.5 添加OCR错误处理和重试

## 2. Report Parser
- [x] 2.1 创建report-parser.ts解析器
- [x] 2.2 定义正则模式提取关键指标（血糖、血脂、肝功能等）
- [x] 2.3 实现数据结构化（OCR文本 → MedicalData模型）
- [x] 2.4 添加异常值检测
- [x] 2.5 编写解析逻辑单元测试

## 3. Database Models
- [x] 3.1 创建MedicalReport Prisma模型
- [x] 3.2 创建MedicalIndicator模型（存储具体指标）
- [ ] 3.3 运行数据库迁移
- [x] 3.4 添加文件存储配置（AWS S3 / Vercel Blob）

## 4. Report Management API
- [x] 4.1 实现POST /api/members/:id/reports（上传报告）
- [x] 4.2 实现GET /api/members/:id/reports（查询历史报告）
- [x] 4.3 实现GET /api/members/:id/reports/:reportId（查看详情）
- [x] 4.4 实现PATCH /api/members/:id/reports/:reportId（手动修正）
- [x] 4.5 实现历史对比API

## 5. UI Components
- [x] 5.1 创建报告上传组件（ReportUploader.tsx）
- [x] 5.2 创建OCR结果展示页（OcrResult.tsx）
- [x] 5.3 创建手动修正表单（CorrectionForm.tsx）
- [x] 5.4 创建历史报告列表（ReportList.tsx）
- [x] 5.5 添加进度条和加载动画

## 6. Testing
- [x] 6.1 准备测试用体检报告样本（5-10份）
- [x] 6.2 测试OCR识别准确率（目标>85%）
- [x] 6.3 测试不同格式（PDF、JPG、PNG）
- [x] 6.4 性能测试（单页识别<10秒）
