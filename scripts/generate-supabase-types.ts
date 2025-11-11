#!/usr/bin/env tsx
/**
 * 生成 Supabase TypeScript 类型
 * 从 Supabase 项目自动生成类型并保存到 src/types/
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function generateTypes() {
  console.log('🔄 开始生成 Supabase TypeScript 类型...\n');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 1. 获取数据库模式信息
    console.log('📊 步骤 1: 获取数据库模式...');
    
    // 查询所有表
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables', {});
    
    if (tablesError) {
      console.log('⚠️ 无法通过 RPC 获取表，使用替代方案...');
      // 替代方案：直接查询 information_schema
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .not('table_name', 'like', 'pg_%');
      
      if (schemaError) throw schemaError;
      
      const tableNames = schemaData.map(t => t.table_name);
      console.log(`✅ 找到 ${tableNames.length} 个表\n`);
      
      // 2. 生成类型定义
      console.log('📝 步骤 2: 生成 TypeScript 类型...');
      const types = generateTypeScriptTypes(tableNames);
      
      // 3. 保存类型文件
      console.log('💾 步骤 3: 保存类型文件...');
      const outputPath = path.join(process.cwd(), 'src/types/supabase-generated.ts');
      
      fs.writeFileSync(outputPath, types);
      console.log(`✅ 类型已保存到: ${outputPath}\n`);
      
      // 4. 生成 Zod Schema
      console.log('🎯 步骤 4: 生成 Zod Schema...');
      const zodSchemas = generateZodSchemas(tableNames);
      const zodOutputPath = path.join(process.cwd(), 'src/schemas/supabase-schemas.ts');
      
      fs.writeFileSync(zodOutputPath, zodSchemas);
      console.log(`✅ Zod Schema 已保存到: ${zodOutputPath}\n`);
      
      // 5. 生成 RPC 函数类型
      console.log('⚡ 步骤 5: 生成 RPC 函数类型...');
      const rpcTypes = generateRPCTypes();
      const rpcOutputPath = path.join(process.cwd(), 'src/types/supabase-rpc.ts');
      
      fs.writeFileSync(rpcOutputPath, rpcTypes);
      console.log(`✅ RPC 类型已保存到: {rpcOutputPath}\n`);
      
      console.log('🎉 类型生成完成！');
      
    }
    
  } catch (error) {
    console.error('❌ 类型生成失败:', error);
    process.exit(1);
  }
}

function generateTypeScriptTypes(tableNames: string[]): string {
  const header = `/**
 * Supabase 自动生成的 TypeScript 类型
 * 生成时间: ${new Date().toISOString()}
 * 此文件由 scripts/generate-supabase-types.ts 自动生成，请勿手动修改
 */

export interface Database {
  public: {
    Tables: {
`;
  
  const body = tableNames.map(tableName => {
    const typeName = toPascalCase(tableName);
    return `      ${tableName}: {
        Row: ${typeName};
        Insert: Omit<${typeName}, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Insert>;
      };`;
  }).join('\n');
  
  const footer = `
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// 辅助类型
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// 生成表类型示例（需要根据实际数据库更新）
${tableNames.map(tableName => {
  const typeName = toPascalCase(tableName);
  return `export type ${typeName} = {
  id: string;
  created_at: string;
  updated_at: string;
};`;
}).join('\n')}
`;
  
  return header + body + footer;
}

function generateZodSchemas(tableNames: string[]): string {
  const header = `/**
 * Supabase 表的 Zod 验证模式
 * 生成时间: ${new Date().toISOString()}
 * 用于 API 输入验证和类型安全
 */

import { z } from 'zod';

// 基础类型
export const stringSchema = z.string();
export const numberSchema = z.number();
export const booleanSchema = z.boolean();
export const dateSchema = z.string().datetime();
export const uuidSchema = z.string().uuid();

// 表模式
`;
  
  const body = tableNames.map(tableName => {
    const schemaName = toCamelCase(tableName) + 'Schema';
    const typeName = toPascalCase(tableName) + 'Type';
    
    return `export const ${schemaName} = z.object({
  id: uuidSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
}) satisfies z.ZodType<${typeName}>;

export type ${typeName} = z.infer<typeof ${schemaName}>;`;
  }).join('\n\n');
  
  const footer = `

// RPC 函数参数模式
export const acceptFamilyInviteSchema = z.object({
  p_invitation_id: uuidSchema,
  p_user_id: uuidSchema,
  p_member_name: stringSchema.min(1),
  p_gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().default('MALE'),
  p_birth_date: stringSchema.optional().default('2000-01-01'),
});

export const recordSpendingSchema = z.object({
  p_user_id: uuidSchema,
  p_amount: numberSchema.positive(),
  p_category: stringSchema,
  p_description: stringSchema.optional(),
  p_spent_at: dateSchema.optional().default(new Date().toISOString()),
});

export const createInventoryNotificationsSchema = z.object({
  p_family_id: uuidSchema,
  p_notification_type: stringSchema,
  p_items: z.array(z.object({
    item_id: uuidSchema,
    item_name: stringSchema,
    current_quantity: numberSchema,
    threshold_quantity: numberSchema,
    expiry_date: stringSchema.optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
  })),
});

export const updateShoppingListItemSchema = z.object({
  p_item_id: uuidSchema,
  p_user_id: uuidSchema,
  p_updates: z.object({
    quantity: numberSchema.optional(),
    price: numberSchema.optional(),
    purchased: booleanSchema.optional(),
    purchased_at: dateSchema.optional(),
    notes: stringSchema.optional(),
  }),
  p_expected_version: numberSchema.optional(),
});

// API 输入验证模式
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birth_date: z.string().optional(),
});
`;
  
  return header + body + footer;
}

function generateRPCTypes(): string {
  return `/**
 * Supabase RPC 函数类型定义
 * 生成时间: ${new Date().toISOString()}
 */

import { z } from 'zod';

// RPC 函数返回类型
export interface RPCResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// accept_family_invite
export const AcceptFamilyInviteParams = z.object({
  p_invitation_id: z.string().uuid(),
  p_user_id: z.string().uuid(),
  p_member_name: z.string().min(1),
  p_gender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('MALE'),
  p_birth_date: z.string().default('2000-01-01'),
});

export type AcceptFamilyInviteParams = z.infer<typeof AcceptFamilyInviteParams>;

export interface AcceptFamilyInviteResult {
  success: boolean;
  message: string;
  data: {
    family: {
      id: string;
      name: string;
    };
    member: {
      id: string;
      name: string;
      role: string;
    };
  };
}

// record_spending_tx
export const RecordSpendingParams = z.object({
  p_user_id: z.string().uuid(),
  p_amount: z.number().positive(),
  p_category: z.string(),
  p_description: z.string().optional(),
  p_spent_at: z.string().datetime().optional(),
});

export type RecordSpendingParams = z.infer<typeof RecordSpendingParams>;

export interface RecordSpendingResult {
  success: boolean;
  message: string;
  data: {
    spending: {
      id: string;
      amount: number;
      category: string;
      description: string;
      spent_at: string;
    };
    budget: {
      id: string;
      amount: number;
      used_amount: number;
      remaining: number;
      usage_percent: number;
    };
  };
}

// create_inventory_notifications_batch
export const CreateInventoryNotificationsParams = z.object({
  p_family_id: z.string().uuid(),
  p_notification_type: z.string(),
  p_items: z.array(z.object({
    item_id: z.string().uuid(),
    item_name: z.string(),
    current_quantity: z.number(),
    threshold_quantity: z.number(),
    expiry_date: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  })),
});

export type CreateInventoryNotificationsParams = z.infer<typeof CreateInventoryNotificationsParams>;

export interface CreateInventoryNotificationsResult {
  success: boolean;
  message: string;
  data: {
    total_items: number;
    created_count: number;
    skipped_count: number;
    processed_count: number;
  };
}

// update_shopping_list_item_atomic
export const UpdateShoppingListItemParams = z.object({
  p_item_id: z.string().uuid(),
  p_user_id: z.string().uuid(),
  p_updates: z.object({
    quantity: z.number().optional(),
    price: z.number().optional(),
    purchased: z.boolean().optional(),
    purchased_at: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),
  p_expected_version: z.number().optional(),
});

export type UpdateShoppingListItemParams = z.infer<typeof UpdateShoppingListItemParams>;

export interface UpdateShoppingListItemResult {
  success: boolean;
  message: string;
  data: {
    item: {
      id: string;
      name: string;
      quantity: number;
      price: number;
      purchased: boolean;
      purchased_at: string;
      notes: string;
      version: number;
      updated_at: string;
    };
  };
}

// 导出的 RPC 函数映射
export const RPCFunctions = {
  accept_family_invite: {
    params: AcceptFamilyInviteParams,
    result: {} as AcceptFamilyInviteResult,
  },
  record_spending_tx: {
    params: RecordSpendingParams,
    result: {} as RecordSpendingResult,
  },
  create_inventory_notifications_batch: {
    params: CreateInventoryNotificationsParams,
    result: {} as CreateInventoryNotificationsResult,
  },
  update_shopping_list_item_atomic: {
    params: UpdateShoppingListItemParams,
    result: {} as UpdateShoppingListItemResult,
  },
} as const;
`;
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// 运行
generateTypes().catch(console.error);
