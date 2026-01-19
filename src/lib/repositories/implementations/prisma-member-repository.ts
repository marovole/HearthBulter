/**
 * Prisma MemberRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-member-repository
 */

import type {
  MemberRepository,
  MemberAccessResult,
  HealthGoalDTO,
  CreateHealthGoalInput,
  UpdateHealthGoalInput,
  AllergyDTO,
  CreateAllergyInput,
  UpdateAllergyInput,
  HealthDataDTO,
  CreateHealthDataInput,
  UpdateHealthDataInput,
  HealthDataQuery,
  HealthDataResult,
} from "@/lib/repositories/interfaces/member-repository";

/**
 * PrismaMemberRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaMemberRepository implements MemberRepository {
  // ============================================================================
  // 成员访问验证
  // ============================================================================

  async verifyMemberAccess(
    _memberId: string,
    _userId: string,
  ): Promise<MemberAccessResult> {
    throw new Error(
      "PrismaMemberRepository.verifyMemberAccess not implemented",
    );
  }

  // ============================================================================
  // 健康目标管理
  // ============================================================================

  async getHealthGoals(
    _memberId: string,
    _includeInactive?: boolean,
  ): Promise<HealthGoalDTO[]> {
    throw new Error("PrismaMemberRepository.getHealthGoals not implemented");
  }

  async getHealthGoalById(_goalId: string): Promise<HealthGoalDTO | null> {
    throw new Error("PrismaMemberRepository.getHealthGoalById not implemented");
  }

  async createHealthGoal(
    _memberId: string,
    _input: CreateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    throw new Error("PrismaMemberRepository.createHealthGoal not implemented");
  }

  async updateHealthGoal(
    _goalId: string,
    _input: UpdateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    throw new Error("PrismaMemberRepository.updateHealthGoal not implemented");
  }

  async deleteHealthGoal(_goalId: string): Promise<void> {
    throw new Error("PrismaMemberRepository.deleteHealthGoal not implemented");
  }

  // ============================================================================
  // 过敏管理
  // ============================================================================

  async getAllergies(_memberId: string): Promise<AllergyDTO[]> {
    throw new Error("PrismaMemberRepository.getAllergies not implemented");
  }

  async createAllergy(
    _memberId: string,
    _input: CreateAllergyInput,
  ): Promise<AllergyDTO> {
    throw new Error("PrismaMemberRepository.createAllergy not implemented");
  }

  async updateAllergy(
    _allergyId: string,
    _input: UpdateAllergyInput,
  ): Promise<AllergyDTO> {
    throw new Error("PrismaMemberRepository.updateAllergy not implemented");
  }

  async deleteAllergy(_allergyId: string): Promise<void> {
    throw new Error("PrismaMemberRepository.deleteAllergy not implemented");
  }

  // ============================================================================
  // 健康数据管理
  // ============================================================================

  async getHealthData(_query: HealthDataQuery): Promise<HealthDataResult> {
    throw new Error("PrismaMemberRepository.getHealthData not implemented");
  }

  async createHealthData(
    _memberId: string,
    _input: CreateHealthDataInput,
  ): Promise<HealthDataDTO> {
    throw new Error("PrismaMemberRepository.createHealthData not implemented");
  }

  async updateHealthData(
    _dataId: string,
    _input: UpdateHealthDataInput,
  ): Promise<HealthDataDTO> {
    throw new Error("PrismaMemberRepository.updateHealthData not implemented");
  }

  async deleteHealthData(_dataId: string): Promise<void> {
    throw new Error("PrismaMemberRepository.deleteHealthData not implemented");
  }
}
