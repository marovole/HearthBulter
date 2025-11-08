#!/usr/bin/env tsx

/**
 * 从 Prisma Schema 生成 Supabase SQL Migration
 * 
 * 此脚本会：
 * 1. 解析 Prisma schema.prisma
 * 2. 生成完整的 Supabase SQL DDL
 * 3. 添加 RLS 策略
 * 4. 创建性能索引
 * 5. 添加触发器和函数
 */

import fs from 'fs';
import path from 'path';

// Prisma 类型到 PostgreSQL 类型映射
const PRISMA_TO_PG_TYPE_MAP: Record<string, string> = {
  String: 'TEXT',
  Int: 'INTEGER',
  Float: 'DECIMAL(10,2)',
  Boolean: 'BOOLEAN',
  DateTime: 'TIMESTAMP WITH TIME ZONE',
  Json: 'JSONB',
  Decimal: 'DECIMAL(10,2)',
};

// Prisma 默认值到 PostgreSQL 默认值映射
function mapDefaultValue(defaultValue: string): string {
  if (defaultValue === 'cuid()') return 'gen_random_uuid()';
  if (defaultValue === 'uuid()') return 'gen_random_uuid()';
  if (defaultValue === 'now()') return 'NOW()';
  if (defaultValue === 'autoincrement()') return 'GENERATED ALWAYS AS IDENTITY';
  if (defaultValue === 'true') return 'TRUE';
  if (defaultValue === 'false') return 'FALSE';
  return defaultValue;
}

// 将 Prisma 模型名转换为表名（snake_case）
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

interface Field {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  isUnique: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  relation?: string;
}

interface Model {
  name: string;
  tableName: string;
  fields: Field[];
}

interface EnumDef {
  name: string;
  values: string[];
}

// 解析 Prisma Schema
function parsePrismaSchema(schemaPath: string): { models: Model[]; enums: EnumDef[] } {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const models: Model[] = [];
  const enums: EnumDef[] = [];

  // 解析枚举
  const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .map(line => line.split(/\s+/)[0]);
    
    enums.push({ name: enumName, values });
  }

  // 解析模型
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let modelMatch;
  
  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];
    const tableName = toSnakeCase(modelName);
    
    const fields: Field[] = [];
    const lines = modelBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      // 解析字段定义
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\??/);
      if (!fieldMatch) continue;
      
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isArray = !!fieldMatch[3];
      const isOptional = trimmed.includes('?');
      
      // 检查装饰器
      const isUnique = trimmed.includes('@unique');
      const isPrimaryKey = trimmed.includes('@id');
      const defaultMatch = trimmed.match(/@default\(([^)]+)\)/);
      const relationMatch = trimmed.match(/@relation\(/);
      
      fields.push({
        name: fieldName,
        type: fieldType,
        isOptional,
        isArray,
        isUnique,
        isPrimaryKey,
        defaultValue: defaultMatch ? defaultMatch[1] : undefined,
        relation: relationMatch ? fieldType : undefined,
      });
    }
    
    models.push({ name: modelName, tableName, fields });
  }

  return { models, enums };
}

// 生成 CREATE TABLE 语句
function generateCreateTable(model: Model, enums: EnumDef[]): string {
  const { tableName, fields } = model;
  const columns: string[] = [];
  const constraints: string[] = [];

  for (const field of fields) {
    // 跳过关系字段
    if (field.relation) continue;

    const columnName = toSnakeCase(field.name);
    let columnDef = `  ${columnName}`;

    // 类型映射
    const enumDef = enums.find(e => e.name === field.type);
    let columnType: string;
    
    if (enumDef) {
      columnType = toSnakeCase(field.type);
    } else if (field.type === 'String' && field.isPrimaryKey) {
      columnType = 'UUID';
    } else {
      columnType = PRISMA_TO_PG_TYPE_MAP[field.type] || field.type;
    }

    if (field.isArray) {
      columnType += '[]';
    }

    columnDef += ` ${columnType}`;

    // 主键
    if (field.isPrimaryKey) {
      columnDef += ' PRIMARY KEY';
    }

    // 默认值
    if (field.defaultValue) {
      const defaultVal = mapDefaultValue(field.defaultValue);
      if (defaultVal !== 'GENERATED ALWAYS AS IDENTITY') {
        columnDef += ` DEFAULT ${defaultVal}`;
      }
    }

    // 非空约束
    if (!field.isOptional && !field.isPrimaryKey) {
      columnDef += ' NOT NULL';
    }

    // 唯一约束
    if (field.isUnique) {
      columnDef += ' UNIQUE';
    }

    columns.push(columnDef);
  }

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columns.join(',\n')}\n);`;
}

// 生成枚举类型
function generateEnums(enums: EnumDef[]): string {
  return enums
    .map(enumDef => {
      const enumName = toSnakeCase(enumDef.name);
      const values = enumDef.values.map(v => `'${v}'`).join(', ');
      return `CREATE TYPE ${enumName} AS ENUM (${values});`;
    })
    .join('\n\n');
}

// 生成外键约束
function generateForeignKeys(models: Model[]): string {
  const constraints: string[] = [];

  for (const model of models) {
    const { tableName, fields } = model;

    for (const field of fields) {
      if (!field.relation) continue;

      const columnName = toSnakeCase(field.name);
      const refTableName = toSnakeCase(field.relation);
      
      constraints.push(
        `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${columnName}\n` +
        `  FOREIGN KEY (${columnName}) REFERENCES ${refTableName}(id)\n` +
        `  ON DELETE CASCADE;`
      );
    }
  }

  return constraints.join('\n\n');
}

// 生成 RLS 策略
function generateRLSPolicies(models: Model[]): string {
  const policies: string[] = [];

  for (const model of models) {
    const { tableName } = model;

    // 启用 RLS
    policies.push(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);

    // 基本查询策略
    policies.push(
      `CREATE POLICY "Allow authenticated users to read ${tableName}"\n` +
      `  ON ${tableName} FOR SELECT\n` +
      `  USING (auth.uid() IS NOT NULL);`
    );

    // 插入策略
    policies.push(
      `CREATE POLICY "Allow authenticated users to insert ${tableName}"\n` +
      `  ON ${tableName} FOR INSERT\n` +
      `  WITH CHECK (auth.uid() IS NOT NULL);`
    );

    // 更新策略
    policies.push(
      `CREATE POLICY "Allow users to update own ${tableName}"\n` +
      `  ON ${tableName} FOR UPDATE\n` +
      `  USING (auth.uid() IS NOT NULL);`
    );

    // 删除策略
    policies.push(
      `CREATE POLICY "Allow users to delete own ${tableName}"\n` +
      `  ON ${tableName} FOR DELETE\n` +
      `  USING (auth.uid() IS NOT NULL);`
    );

    policies.push('');
  }

  return policies.join('\n');
}

// 生成性能索引
function generateIndexes(models: Model[]): string {
  const indexes: string[] = [];

  for (const model of models) {
    const { tableName, fields } = model;

    // 为外键创建索引
    for (const field of fields) {
      if (field.relation) {
        const columnName = toSnakeCase(field.name);
        indexes.push(
          `CREATE INDEX idx_${tableName}_${columnName} ON ${tableName}(${columnName});`
        );
      }
    }

    // 为唯一字段创建索引
    for (const field of fields) {
      if (field.isUnique && !field.isPrimaryKey) {
        const columnName = toSnakeCase(field.name);
        indexes.push(
          `CREATE INDEX idx_${tableName}_${columnName} ON ${tableName}(${columnName});`
        );
      }
    }

    // 为常用查询字段创建索引
    const commonIndexFields = ['created_at', 'updated_at', 'deleted_at', 'user_id', 'member_id', 'family_id'];
    for (const indexField of commonIndexFields) {
      if (fields.some(f => toSnakeCase(f.name) === indexField)) {
        indexes.push(
          `CREATE INDEX idx_${tableName}_${indexField} ON ${tableName}(${indexField});`
        );
      }
    }
  }

  return indexes.join('\n');
}

// 生成触发器
function generateTriggers(): string {
  return `
-- 自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有包含 updated_at 的表添加触发器
-- 注意：需要手动为每个表创建触发器
-- 示例：
-- CREATE TRIGGER update_users_updated_at
--   BEFORE UPDATE ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();
`;
}

// 主函数
function main() {
  console.log('🚀 开始从 Prisma Schema 生成 Supabase Migration...\n');

  const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const outputDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 解析 Prisma Schema
  console.log('📖 解析 Prisma Schema...');
  const { models, enums } = parsePrismaSchema(prismaSchemaPath);
  console.log(`   找到 ${models.length} 个模型和 ${enums.length} 个枚举\n`);

  // 生成 SQL
  console.log('📝 生成 SQL...');
  const sqlParts: string[] = [];

  // 头部注释
  sqlParts.push(`-- Supabase Migration: Generated from Prisma Schema`);
  sqlParts.push(`-- Generated at: ${new Date().toISOString()}`);
  sqlParts.push(`-- Total Models: ${models.length}`);
  sqlParts.push(`-- Total Enums: ${enums.length}\n`);

  // 启用扩展
  sqlParts.push('-- Enable UUID extension');
  sqlParts.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n');

  // 枚举类型
  if (enums.length > 0) {
    sqlParts.push('-- ========================================');
    sqlParts.push('-- Enum Types');
    sqlParts.push('-- ========================================\n');
    sqlParts.push(generateEnums(enums));
    sqlParts.push('');
  }

  // 表定义
  sqlParts.push('-- ========================================');
  sqlParts.push('-- Table Definitions');
  sqlParts.push('-- ========================================\n');
  for (const model of models) {
    sqlParts.push(`-- Table: ${model.tableName}`);
    sqlParts.push(generateCreateTable(model, enums));
    sqlParts.push('');
  }

  // 外键约束
  sqlParts.push('-- ========================================');
  sqlParts.push('-- Foreign Key Constraints');
  sqlParts.push('-- ========================================\n');
  sqlParts.push(generateForeignKeys(models));
  sqlParts.push('');

  // 索引
  sqlParts.push('-- ========================================');
  sqlParts.push('-- Performance Indexes');
  sqlParts.push('-- ========================================\n');
  sqlParts.push(generateIndexes(models));
  sqlParts.push('');

  // 触发器
  sqlParts.push('-- ========================================');
  sqlParts.push('-- Triggers');
  sqlParts.push('-- ========================================\n');
  sqlParts.push(generateTriggers());
  sqlParts.push('');

  // RLS 策略
  sqlParts.push('-- ========================================');
  sqlParts.push('-- Row-Level Security Policies');
  sqlParts.push('-- ========================================\n');
  sqlParts.push(generateRLSPolicies(models));

  // 写入文件
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const outputPath = path.join(outputDir, `${timestamp}_prisma_to_supabase.sql`);
  
  const finalSQL = sqlParts.join('\n');
  fs.writeFileSync(outputPath, finalSQL);

  console.log(`✅ Migration 已生成: ${outputPath}`);
  console.log(`📊 统计信息:`);
  console.log(`   - 模型数量: ${models.length}`);
  console.log(`   - 枚举数量: ${enums.length}`);
  console.log(`   - 文件大小: ${(finalSQL.length / 1024).toFixed(2)} KB\n`);
  console.log('🎉 完成！\n');
  console.log('📋 下一步:');
  console.log('   1. 检查生成的 SQL 文件');
  console.log('   2. 在 Supabase Dashboard 中运行 SQL');
  console.log('   3. 或使用: supabase db push\n');
}

// 执行
if (require.main === module) {
  main();
}

export { parsePrismaSchema, generateCreateTable, generateRLSPolicies };
