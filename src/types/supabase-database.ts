/**
 * Supabase Database Type Definitions
 *
 * 这个文件定义了 Supabase 数据库的 TypeScript 类型
 * 由 Prisma Schema 生成
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DualWriteFeatureFlagsValue = {
  enableDualWrite: boolean;
  enableSupabasePrimary: boolean;
  [key: string]: Json | undefined;
};

export type Database = any;
