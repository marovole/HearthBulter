# 医疗报告OCR功能配置指南

## 环境变量配置

为了使用医疗报告OCR功能，需要配置以下环境变量：

### 必需的环境变量

```env
# 数据库连接（PostgreSQL/Supabase）
DATABASE_URL="postgresql://user:password@host:port/database"

# Vercel Blob Storage（文件存储）
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### 如何获取配置

#### 1. 数据库配置

**如果使用 Supabase：**
1. 访问 https://supabase.com/dashboard
2. 创建新项目或选择现有项目
3. 在项目设置 > Database > Connection string 中获取连接字符串
4. 格式：`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

**如果使用本地 PostgreSQL：**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/health_butler"
```

#### 2. Vercel Blob Storage 配置

**如果使用 Vercel：**
1. 在 Vercel 项目设置中启用 Blob Storage
2. 访问 https://vercel.com/dashboard/stores
3. 创建 Blob Store 并获取 `BLOB_READ_WRITE_TOKEN`

**如果使用 AWS S3（需要修改代码）：**
需要修改 `src/lib/services/file-storage-service.ts` 使用 AWS SDK

### 配置步骤

1. **创建 `.env.local` 文件**（如果不存在）：
```bash
cp .env.example .env.local  # 如果有示例文件
# 或直接创建
touch .env.local
```

2. **添加环境变量**：
```env
DATABASE_URL="your-database-url"
BLOB_READ_WRITE_TOKEN="your-blob-token"
```

3. **运行数据库迁移**：
```bash
npm run db:push
# 或创建迁移文件
npm run db:migrate
```

## 功能验证

配置完成后，可以通过以下方式验证功能：

1. **验证数据库连接**：
```bash
npm run db:test
```

2. **启动开发服务器**：
```bash
npm run dev
```

3. **访问报告上传页面**（需要先登录）：
   - 访问 `/dashboard/families/[memberId]/reports/upload`

## 注意事项

- OCR功能需要Tesseract.js，首次使用时可能需要下载语言模型
- 文件上传大小限制为10MB
- 支持的格式：PDF、JPG、PNG
- OCR处理可能需要几分钟时间，请耐心等待

## 故障排除

### 问题：数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- 确认数据库服务是否运行
- 检查防火墙设置

### 问题：文件上传失败
- 检查 `BLOB_READ_WRITE_TOKEN` 是否配置
- 确认 Vercel Blob Storage 是否已启用
- 检查文件大小是否超过10MB限制

### 问题：OCR识别失败
- 确保报告图片清晰
- 检查图片是否包含文字
- 查看控制台错误日志

