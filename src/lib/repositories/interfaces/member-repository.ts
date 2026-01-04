/**
 * MemberRepository 接口
 *
 * 处理家庭成员的健康目标、过敏信息和健康数据管理
 *
 * @module member-repository
 */

// ============================================================================
// 枚举类型
// ============================================================================

export type GoalType =
  | "LOSE_WEIGHT"
  | "GAIN_MUSCLE"
  | "MAINTAIN"
  | "IMPROVE_HEALTH";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
export type AllergenType = "FOOD" | "ENVIRONMENTAL" | "MEDICATION" | "OTHER";
export type AllergySeverity =
  | "MILD"
  | "MODERATE"
  | "SEVERE"
  | "LIFE_THREATENING";
export type HealthDataSource = "MANUAL" | "DEVICE" | "IMPORTED";
export type FamilyMemberRole = "ADMIN" | "MEMBER";

// ============================================================================
// DTO 类型
// ============================================================================

/**
 * 健康目标 DTO
 */
export interface HealthGoalDTO {
  id: string;
  memberId: string;
  goalType: GoalType;
  targetWeight?: number;
  currentWeight?: number;
  startWeight?: number;
  targetWeeks?: number;
  startDate: string;
  targetDate?: string;
  tdee?: number;
  bmr?: number;
  activityFactor?: number;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 过敏信息 DTO
 */
export interface AllergyDTO {
  id: string;
  memberId: string;
  allergenType: AllergenType;
  allergenName: string;
  severity: AllergySeverity;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 健康数据 DTO
 */
export interface HealthDataDTO {
  id: string;
  memberId: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  measuredAt: string;
  source: HealthDataSource;
  notes?: string;
  deviceConnectionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 成员访问结果
 */
export interface MemberAccessResult {
  hasAccess: boolean;
  member: {
    id: string;
    name: string;
    familyId: string;
    userId?: string;
    role: FamilyMemberRole;
    family: {
      id: string;
      creatorId: string;
    };
  } | null;
}

// ============================================================================
// 输入类型
// ============================================================================

/**
 * 创建健康目标输入
 */
export interface CreateHealthGoalInput {
  goalType: GoalType;
  targetWeight?: number;
  currentWeight?: number;
  startWeight?: number;
  targetWeeks?: number;
  startDate: Date;
  targetDate?: Date;
  tdee?: number;
  bmr?: number;
  activityFactor?: number;
  carbRatio?: number;
  proteinRatio?: number;
  fatRatio?: number;
}

/**
 * 更新健康目标输入
 */
export interface UpdateHealthGoalInput {
  goalType?: GoalType;
  targetWeight?: number;
  currentWeight?: number;
  targetWeeks?: number;
  targetDate?: Date;
  tdee?: number;
  bmr?: number;
  activityFactor?: number;
  carbRatio?: number;
  proteinRatio?: number;
  fatRatio?: number;
  status?: GoalStatus;
  progress?: number;
}

/**
 * 创建过敏记录输入
 */
export interface CreateAllergyInput {
  allergenType: AllergenType;
  allergenName: string;
  severity: AllergySeverity;
  description?: string;
}

/**
 * 更新过敏记录输入
 */
export interface UpdateAllergyInput {
  allergenType?: AllergenType;
  allergenName?: string;
  severity?: AllergySeverity;
  description?: string;
}

/**
 * 创建健康数据输入
 */
export interface CreateHealthDataInput {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  measuredAt?: Date;
  source?: HealthDataSource;
  notes?: string;
  deviceConnectionId?: string;
}

/**
 * 更新健康数据输入
 */
export interface UpdateHealthDataInput {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  measuredAt?: Date;
  notes?: string;
}

/**
 * 健康数据查询参数
 */
export interface HealthDataQuery {
  memberId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

/**
 * 健康数据查询结果
 */
export interface HealthDataResult {
  data: HealthDataDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Repository 接口
// ============================================================================

/**
 * MemberRepository 接口
 *
 * 提供成员健康管理相关的数据访问方法
 */
export interface MemberRepository {
  // ============================================================================
  // 成员访问验证
  // ============================================================================

  /**
   * 验证用户是否有权访问指定成员的数据
   *
   * @param memberId - 成员 ID
   * @param userId - 用户 ID
   * @returns 访问权限结果和成员信息
   */
  verifyMemberAccess(
    memberId: string,
    userId: string,
  ): Promise<MemberAccessResult>;

  // ============================================================================
  // 健康目标管理
  // ============================================================================

  /**
   * 获取成员的所有健康目标
   *
   * @param memberId - 成员 ID
   * @param includeInactive - 是否包含非活跃目标（默认 false）
   * @returns 健康目标列表
   */
  getHealthGoals(
    memberId: string,
    includeInactive?: boolean,
  ): Promise<HealthGoalDTO[]>;

  /**
   * 根据 ID 获取单个健康目标
   *
   * @param goalId - 目标 ID
   * @returns 健康目标或 null
   */
  getHealthGoalById(goalId: string): Promise<HealthGoalDTO | null>;

  /**
   * 创建健康目标
   *
   * @param memberId - 成员 ID
   * @param input - 健康目标输入数据
   * @returns 创建的健康目标
   */
  createHealthGoal(
    memberId: string,
    input: CreateHealthGoalInput,
  ): Promise<HealthGoalDTO>;

  /**
   * 更新健康目标
   *
   * @param goalId - 目标 ID
   * @param input - 更新数据
   * @returns 更新后的健康目标
   */
  updateHealthGoal(
    goalId: string,
    input: UpdateHealthGoalInput,
  ): Promise<HealthGoalDTO>;

  /**
   * 删除健康目标（软删除）
   *
   * @param goalId - 目标 ID
   */
  deleteHealthGoal(goalId: string): Promise<void>;

  // ============================================================================
  // 过敏管理
  // ============================================================================

  /**
   * 获取成员的所有过敏信息
   *
   * @param memberId - 成员 ID
   * @returns 过敏信息列表
   */
  getAllergies(memberId: string): Promise<AllergyDTO[]>;

  /**
   * 创建过敏记录
   *
   * @param memberId - 成员 ID
   * @param input - 过敏信息输入数据
   * @returns 创建的过敏记录
   */
  createAllergy(
    memberId: string,
    input: CreateAllergyInput,
  ): Promise<AllergyDTO>;

  /**
   * 更新过敏记录
   *
   * @param allergyId - 过敏记录 ID
   * @param input - 更新数据
   * @returns 更新后的过敏记录
   */
  updateAllergy(
    allergyId: string,
    input: UpdateAllergyInput,
  ): Promise<AllergyDTO>;

  /**
   * 删除过敏记录（软删除）
   *
   * @param allergyId - 过敏记录 ID
   */
  deleteAllergy(allergyId: string): Promise<void>;

  // ============================================================================
  // 健康数据管理
  // ============================================================================

  /**
   * 查询健康数据
   *
   * @param query - 查询参数
   * @returns 健康数据查询结果
   */
  getHealthData(query: HealthDataQuery): Promise<HealthDataResult>;

  /**
   * 创建健康数据记录
   *
   * @param memberId - 成员 ID
   * @param input - 健康数据输入
   * @returns 创建的健康数据记录
   */
  createHealthData(
    memberId: string,
    input: CreateHealthDataInput,
  ): Promise<HealthDataDTO>;

  /**
   * 更新健康数据记录
   *
   * @param dataId - 数据记录 ID
   * @param input - 更新数据
   * @returns 更新后的健康数据记录
   */
  updateHealthData(
    dataId: string,
    input: UpdateHealthDataInput,
  ): Promise<HealthDataDTO>;

  /**
   * 删除健康数据记录
   *
   * @param dataId - 数据记录 ID
   */
  deleteHealthData(dataId: string): Promise<void>;
}
