# Supabase Storage 配置指南

## 概述
本文档说明如何为HearthBulter项目配置Supabase Storage bucket。

## 背景
项目需要存储医疗报告文件，需要创建 `medical-reports` bucket。

## 方法一：通过Supabase Dashboard (推荐)

### 步骤1: 登录Supabase
1. 访问: https://supabase.com/dashboard
2. 登录您的账户

### 步骤2: 选择项目
- 项目ID: `ppmliptjvzurewsiwswb`
- 项目URL: https://ppmliptjvzurewsiwswb.supabase.co

### 步骤3: 创建Storage Bucket
1. 点击左侧菜单 **"Storage"**
2. 点击 **"Create a new bucket"** 按钮
3. 填写信息:
   - **Name**: `medical-reports`
   - **Public bucket**: ✅ 启用 (允许公开访问)
   - **File size limit**: `10 MB` (10485760 bytes)
   - **Allowed MIME types**:
     - `application/pdf`
     - `image/jpeg`
     - `image/png`

4. 点击 **"Create bucket"** 完成创建

### 步骤4: 配置RLS策略
1. 在Storage页面，点击 `medical-reports` bucket
2. 转到 **"Policies"** 标签
3. 添加以下策略:

**策略1: 公开读取**
```sql
-- Policy Name: Public Access
-- Definition:
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'medical-reports');
```

**策略2: 认证用户可上传**
```sql
-- Policy Name: Authenticated users can upload
-- Definition:
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'medical-reports' AND auth.role() = 'authenticated');
```

**策略3: 用户可更新自己的文件**
```sql
-- Policy Name: Users can update own files
-- Definition:
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE
USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**策略4: 用户可删除自己的文件**
```sql
-- Policy Name: Users can delete own files
-- Definition:
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE
USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 方法二：通过SQL (高级)

如果需要通过SQL执行，可以使用以下脚本:

```sql
-- 连接到项目数据库
-- psql postgresql://postgres.[project-ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres

-- 1. 创建bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-reports',
  'medical-reports',
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- 2. 创建RLS策略 (如果需要)
-- 上述策略同样适用于SQL执行
```

## 验证配置

### 检查Bucket
```bash
# 列出所有buckets
curl -X GET "https://ppmliptjvzurewsiwswb.supabase.co/storage/v1/bucket" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 测试上传
在应用中添加文件上传测试代码:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ppmliptjvzurewsiwswb.supabase.co',
  'YOUR_ANON_KEY'
)

// 测试上传
async function testUpload() {
  const { data, error } = await supabase.storage
    .from('medical-reports')
    .upload('test/file.pdf', fileBlob)

  if (error) {
    console.error('Upload failed:', error)
  } else {
    console.log('Upload successful:', data)
  }
}
```

## 注意事项

1. **安全性**: 确保RLS策略正确配置，防止未授权访问
2. **文件大小**: 限制为10MB，可根据需要调整
3. **MIME类型**: 严格限制允许的文件类型
4. **路径结构**: 建议使用 `user_id/filename` 格式的路径

## 相关文档

- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)
- [RLS 策略指南](https://supabase.com/docs/guides/auth/row-level-security)
- [存储API参考](https://supabase.com/docs/reference/javascript/storage-from-upload)

## 支持

如果遇到问题，请检查:
1. Supabase项目状态
2. API密钥是否正确
3. RLS策略是否正确应用
4. 网络连接是否正常

---

**更新日期**: 2025-11-09
**作者**: Claude Code
