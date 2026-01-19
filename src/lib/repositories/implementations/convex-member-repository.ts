import type {
  AllergyDTO,
  CreateAllergyInput,
  CreateHealthDataInput,
  CreateHealthGoalInput,
  HealthDataDTO,
  HealthDataQuery,
  HealthDataResult,
  HealthGoalDTO,
  MemberAccessResult,
  MemberRepository,
  UpdateAllergyInput,
  UpdateHealthDataInput,
  UpdateHealthGoalInput,
} from "@/lib/repositories/interfaces/member-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export class ConvexMemberRepository implements MemberRepository {
  async verifyMemberAccess(
    memberId: string,
    clerkId: string,
  ): Promise<MemberAccessResult> {
    const result = await convexClient.query<MemberAccessResult>(
      api.members.verifyAccess,
      {
        memberId: memberId as Id<"familyMembers">,
        clerkId,
      },
    );

    return result;
  }

  async getHealthGoals(
    memberId: string,
    includeInactive: boolean = false,
  ): Promise<HealthGoalDTO[]> {
    const goals = await convexClient.query<Doc<"healthGoals">[]>(
      api.health.listGoals,
      {
        memberId: memberId as Id<"familyMembers">,
        includeInactive,
      },
    );

    return goals.map(mapHealthGoal);
  }

  async getHealthGoalById(goalId: string): Promise<HealthGoalDTO | null> {
    const goal = await convexClient.query<Doc<"healthGoals"> | null>(
      api.health.getGoalById,
      {
        goalId: goalId as Id<"healthGoals">,
      },
    );

    return goal ? mapHealthGoal(goal) : null;
  }

  async createHealthGoal(
    memberId: string,
    input: CreateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    const goalId = await convexClient.mutation(api.health.createGoal, {
      memberId: memberId as Id<"familyMembers">,
      goalType: input.goalType,
      targetValue: input.targetWeight ?? 0,
      currentValue: input.currentWeight ?? 0,
      startDate: input.startDate.getTime(),
      endDate: input.targetDate?.getTime(),
      status: "ACTIVE",
      tdee: input.tdee,
      bmr: input.bmr,
      activityFactor: input.activityFactor,
      carbRatio: input.carbRatio ?? 0.5,
      proteinRatio: input.proteinRatio ?? 0.2,
      fatRatio: input.fatRatio ?? 0.3,
      targetWeeks: input.targetWeeks,
      startWeight: input.startWeight,
      progress: 0,
    });

    const goal = await convexClient.query<Doc<"healthGoals"> | null>(
      api.health.getGoalById,
      {
        goalId: goalId as Id<"healthGoals">,
      },
    );

    if (!goal) {
      throw new Error("健康目标创建失败");
    }

    return mapHealthGoal(goal);
  }

  async updateHealthGoal(
    goalId: string,
    input: UpdateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    await convexClient.mutation(api.health.updateGoal, {
      goalId: goalId as Id<"healthGoals">,
      targetValue: input.targetWeight,
      currentValue: input.currentWeight,
      endDate: input.targetDate?.getTime(),
      status: input.status,
      carbRatio: input.carbRatio,
      proteinRatio: input.proteinRatio,
      fatRatio: input.fatRatio,
    });

    const goal = await convexClient.query<Doc<"healthGoals"> | null>(
      api.health.getGoalById,
      {
        goalId: goalId as Id<"healthGoals">,
      },
    );

    if (!goal) {
      throw new Error("健康目标不存在");
    }

    return mapHealthGoal(goal);
  }

  async deleteHealthGoal(goalId: string): Promise<void> {
    await convexClient.mutation(api.health.deleteGoal, {
      goalId: goalId as Id<"healthGoals">,
    });
  }

  async getAllergies(memberId: string): Promise<AllergyDTO[]> {
    const allergies = await convexClient.query<Doc<"allergies">[]>(
      api.health.listAllergies,
      {
        memberId: memberId as Id<"familyMembers">,
      },
    );

    return allergies.map(mapAllergy);
  }

  async createAllergy(
    memberId: string,
    input: CreateAllergyInput,
  ): Promise<AllergyDTO> {
    const allergyId = await convexClient.mutation(api.health.createAllergy, {
      memberId: memberId as Id<"familyMembers">,
      allergenType: input.allergenType,
      allergenName: input.allergenName,
      severity: input.severity,
      description: input.description,
    });

    const allergy = await convexClient.query<Doc<"allergies"> | null>(
      api.health.getAllergyById,
      {
        allergyId: allergyId as Id<"allergies">,
      },
    );

    if (!allergy) {
      throw new Error("过敏记录创建失败");
    }

    return mapAllergy(allergy);
  }

  async updateAllergy(
    allergyId: string,
    input: UpdateAllergyInput,
  ): Promise<AllergyDTO> {
    await convexClient.mutation(api.health.updateAllergy, {
      allergyId: allergyId as Id<"allergies">,
      allergenType: input.allergenType,
      allergenName: input.allergenName,
      severity: input.severity,
      description: input.description,
    });

    const allergy = await convexClient.query<Doc<"allergies"> | null>(
      api.health.getAllergyById,
      {
        allergyId: allergyId as Id<"allergies">,
      },
    );

    if (!allergy) {
      throw new Error("过敏记录不存在");
    }

    return mapAllergy(allergy);
  }

  async deleteAllergy(allergyId: string): Promise<void> {
    await convexClient.mutation(api.health.deleteAllergy, {
      allergyId: allergyId as Id<"allergies">,
    });
  }

  async getHealthData(query: HealthDataQuery): Promise<HealthDataResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortOrder = query.sortOrder ?? "desc";

    const result = await convexClient.query<{
      data: Doc<"healthData">[];
      total: number;
    }>(api.health.listHealthData, {
      memberId: query.memberId as Id<"familyMembers">,
      startDate: query.startDate
        ? new Date(query.startDate).getTime()
        : undefined,
      endDate: query.endDate ? new Date(query.endDate).getTime() : undefined,
      page,
      limit,
      sortOrder,
    });

    return {
      data: result.data.map(mapHealthData),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async createHealthData(
    memberId: string,
    input: CreateHealthDataInput,
  ): Promise<HealthDataDTO> {
    const source = "source" in input ? input.source : undefined;

    const response = await convexClient.mutation<{
      success: true;
      data: { recordId: Id<"healthData"> };
      timestamp: number;
    }>(api.health.addRecord, {
      memberId: memberId as Id<"familyMembers">,
      weight: input.weight,
      bodyFat: input.bodyFat,
      muscleMass: input.muscleMass,
      bloodPressureSystolic: input.bloodPressureSystolic,
      bloodPressureDiastolic: input.bloodPressureDiastolic,
      heartRate: input.heartRate,
      source,
      measuredAt: input.measuredAt?.getTime(),
      notes: input.notes,
    });

    const recordId = response.data.recordId as Id<"healthData">;
    const record = await convexClient.query<Doc<"healthData"> | null>(
      api.health.getRecordById,
      {
        recordId,
      },
    );

    if (!record) {
      throw new Error("健康数据创建失败");
    }

    return mapHealthData(record);
  }

  async updateHealthData(
    dataId: string,
    input: UpdateHealthDataInput,
  ): Promise<HealthDataDTO> {
    await convexClient.mutation(api.health.updateRecord, {
      recordId: dataId as Id<"healthData">,
      weight: input.weight,
      bodyFat: input.bodyFat,
      muscleMass: input.muscleMass,
      bloodPressureSystolic: input.bloodPressureSystolic,
      bloodPressureDiastolic: input.bloodPressureDiastolic,
      heartRate: input.heartRate,
      measuredAt: input.measuredAt?.getTime(),
      notes: input.notes,
    });

    const record = await convexClient.query<Doc<"healthData"> | null>(
      api.health.getRecordById,
      {
        recordId: dataId as Id<"healthData">,
      },
    );

    if (!record) {
      throw new Error("健康数据不存在");
    }

    return mapHealthData(record);
  }

  async deleteHealthData(dataId: string): Promise<void> {
    await convexClient.mutation(api.health.deleteRecord, {
      recordId: dataId as Id<"healthData">,
    });
  }
}

function mapHealthGoal(goal: Doc<"healthGoals">): HealthGoalDTO {
  return {
    id: goal._id,
    memberId: goal.memberId,
    goalType: goal.goalType as HealthGoalDTO["goalType"],
    targetWeight: goal.targetValue,
    currentWeight: goal.currentValue,
    startWeight: goal.startWeight ?? undefined,
    targetWeeks: goal.targetWeeks ?? undefined,
    startDate: new Date(goal.startDate).toISOString(),
    targetDate: goal.endDate ? new Date(goal.endDate).toISOString() : undefined,
    tdee: goal.tdee ?? undefined,
    bmr: goal.bmr ?? undefined,
    activityFactor: goal.activityFactor ?? undefined,
    carbRatio: goal.carbRatio ?? 0.5,
    proteinRatio: goal.proteinRatio ?? 0.2,
    fatRatio: goal.fatRatio ?? 0.3,
    status: goal.status as HealthGoalDTO["status"],
    progress: goal.progress ?? 0,
    createdAt: new Date(goal.createdAt).toISOString(),
    updatedAt: new Date(goal.updatedAt).toISOString(),
  };
}

function mapAllergy(allergy: Doc<"allergies">): AllergyDTO {
  return {
    id: allergy._id,
    memberId: allergy.memberId,
    allergenType: allergy.allergenType as AllergyDTO["allergenType"],
    allergenName: allergy.allergenName,
    severity: allergy.severity as AllergyDTO["severity"],
    description: allergy.description ?? undefined,
    createdAt: new Date(allergy.createdAt).toISOString(),
    updatedAt: new Date(allergy.updatedAt).toISOString(),
  };
}

function mapHealthData(record: Doc<"healthData">): HealthDataDTO {
  return {
    id: record._id,
    memberId: record.memberId,
    weight: record.weight ?? undefined,
    bodyFat: record.bodyFat ?? undefined,
    muscleMass: record.muscleMass ?? undefined,
    bloodPressureSystolic: record.bloodPressureSystolic ?? undefined,
    bloodPressureDiastolic: record.bloodPressureDiastolic ?? undefined,
    heartRate: record.heartRate ?? undefined,
    measuredAt: new Date(record.measuredAt).toISOString(),
    source: record.source as HealthDataDTO["source"],
    notes: record.notes ?? undefined,
    deviceConnectionId: record.deviceConnectionId ?? undefined,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}
