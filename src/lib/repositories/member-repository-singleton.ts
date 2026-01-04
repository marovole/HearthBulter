/**
 * 成员 Repository 单例
 *
 * 提供全局单例 MemberRepository 实例
 *
 * @module member-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseMemberRepository } from "./implementations/supabase-member-repository";
import type { MemberRepository } from "./interfaces/member-repository";

let instance: MemberRepository | null = null;

/**
 * 获取 MemberRepository 单例实例
 *
 * @returns MemberRepository 实例
 */
export function getMemberRepository(): MemberRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseMemberRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 MemberRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { memberRepository } from '@/lib/repositories/member-repository-singleton';
 *
 * const member = await memberRepository.getMemberById(id);
 * ```
 */
export const memberRepository = getMemberRepository();
