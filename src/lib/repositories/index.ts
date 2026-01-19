/**
 * Repository 模块统一导出
 *
 * 提供对外的类型、接口和实现导出
 */

// 通用类型
export * from "./types/common";
export * from "./types/recommendation";
export * from "./types/notification";
export * from "./types/analytics";
export * from "./types/budget";

// Repository 接口
export * from "./interfaces/recommendation-repository";
export * from "./interfaces/notification-repository";
export * from "./interfaces/analytics-repository";
export * from "./interfaces/budget-repository";

// Supabase 实现
export * from "./implementations/supabase-recommendation-repository";
export * from "./implementations/supabase-notification-repository";
export * from "./implementations/supabase-analytics-repository";
export * from "./implementations/supabase-budget-repository";
