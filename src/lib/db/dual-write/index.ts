/**
 * 双写验证框架
 *
 * 提供 Prisma 到 Supabase 迁移期间的双写验证能力
 *
 * @module dual-write
 */

export { FeatureFlagManager, createFeatureFlagManager } from './feature-flags';
export type { FeatureFlags } from './feature-flags';

export { ResultVerifier, createResultVerifier } from './result-verifier';
export type { DiffRecord, DiffSeverity, AlertConfig } from './result-verifier';

export { DualWriteDecorator, createDualWriteDecorator } from './dual-write-decorator';
export type { DualWriteConfig } from './dual-write-decorator';
