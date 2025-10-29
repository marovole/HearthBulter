# Medical Report Integration - Change Spec

## ADDED Requirements

### Requirement: OCR Report Scanning
系统必须（SHALL）支持上传并识别体检报告PDF/图片。

#### Scenario: Upload PDF report
- **GIVEN** 用户拍摄体检报告照片
- **WHEN** 上传到系统
- **THEN** OCR识别关键指标（血脂、血糖、肝功能）
- **AND** 自动填充到成员健康档案

#### Scenario: Manual correction
- **GIVEN** OCR识别出错误数据
- **WHEN** 用户手动修正
- **THEN** 系统保存修正值并学习
- **AND** 提高未来识别准确率

#### Scenario: Unsupported format
- **GIVEN** 用户上传视频文件
- **WHEN** 系统检测文件类型
- **THEN** 拒绝上传并提示"仅支持PDF/JPG/PNG格式"

---

### Requirement: Data Extraction
系统必须（SHALL）提取并结构化存储体检指标。

#### Scenario: Extract blood lipid data
- **GIVEN** 报告包含总胆固醇5.2 mmol/L
- **WHEN** OCR识别完成
- **THEN** 系统提取数值并标注"正常"（<5.2）
- **AND** 关联到成员健康数据

#### Scenario: Detect abnormal values
- **GIVEN** 报告显示血糖7.5 mmol/L（超标）
- **WHEN** 系统解析数据
- **THEN** 自动标记为"异常"
- **AND** 提醒用户关注

#### Scenario: Historical comparison
- **GIVEN** 成员上传第二次体检报告
- **WHEN** 系统解析完成
- **THEN** 自动对比上次数据
- **AND** 生成变化趋势报告

---

### Requirement: File Management
系统必须（SHALL）安全存储和管理体检报告文件。

#### Scenario: Store report securely
- **GIVEN** 用户上传体检报告PDF
- **WHEN** 系统接收文件
- **THEN** 加密存储到云端（AWS S3 / Vercel Blob）
- **AND** 生成唯一访问链接

#### Scenario: Delete old reports
- **GIVEN** 用户删除某次体检报告
- **WHEN** 确认删除操作
- **THEN** 从云存储删除文件
- **AND** 清除关联的健康数据
