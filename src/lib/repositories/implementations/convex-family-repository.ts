import type { FamilyRepository } from "../interfaces/family-repository";
import type {
  CreateFamilyDTO,
  CreateFamilyMemberDTO,
  FamilyDTO,
  FamilyListQuery,
  FamilyMemberDTO,
  FamilyWithMembersDTO,
  UpdateFamilyDTO,
  UpdateFamilyMemberDTO,
} from "../types/family";
import type { PaginatedResult, PaginationInput } from "../types/common";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const DEFAULT_PAGE_LIMIT = 20;

export class ConvexFamilyRepository implements FamilyRepository {
  async createFamily(payload: CreateFamilyDTO): Promise<FamilyDTO> {
    const familyId = await convexClient.mutation(api.families.create, {
      name: payload.name,
      description: payload.description ?? undefined,
      clerkId: payload.creatorId,
    });

    const family = await convexClient.query<ConvexFamilyWithMembers | null>(api.families.getById, {
      familyId: familyId as Id<"families">,
    });

    if (!family) {
      throw new Error("家庭创建失败");
    }

    return mapFamily(family);
  }

  async getFamilyById(id: string): Promise<FamilyDTO | null> {
    const family = await convexClient.query<ConvexFamilyWithMembers | null>(api.families.getById, {
      familyId: id as Id<"families">,
    });

    if (!family) {
      return null;
    }

    return mapFamily(family);
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<FamilyDTO | null> {
    const family = await convexClient.query<ConvexFamilyWithMembers | null>(
      api.families.getByInviteCode,
      { inviteCode }
    );

    if (!family) {
      return null;
    }

    return mapFamily(family);
  }

  async listUserFamilies(
    _query: FamilyListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<FamilyWithMembersDTO>> {
    const families = await convexClient.query<ConvexFamilyWithMembers[]>(api.families.list, {
      clerkId: _query.userId,
    });

    const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
    const offset = pagination?.offset ?? 0;
    const total = families.length;
    const items = families
      .slice(offset, offset + limit)
      .map((family) => mapFamilyWithMembers(family, family.members ?? []));

    return { items, total };
  }

  async updateFamily(id: string, payload: UpdateFamilyDTO): Promise<FamilyDTO> {
    await convexClient.mutation(api.families.update, {
      familyId: id as Id<"families">,
      name: payload.name ?? undefined,
      description: payload.description ?? undefined,
    });

    const family = await convexClient.query<ConvexFamilyWithMembers | null>(api.families.getById, {
      familyId: id as Id<"families">,
    });

    if (!family) {
      throw new Error("家庭不存在");
    }

    return mapFamily(family);
  }

  async softDeleteFamily(id: string): Promise<void> {
    await convexClient.mutation(api.families.softDelete, {
      familyId: id as Id<"families">,
    });
  }

  async addFamilyMember(payload: CreateFamilyMemberDTO): Promise<FamilyMemberDTO> {
    const memberId = await convexClient.mutation(api.families.addMember, {
      familyId: payload.familyId as Id<"families">,
      name: payload.name,
      gender: payload.gender ?? undefined,
      birthDate: payload.birthDate ? payload.birthDate.getTime() : undefined,
      role: payload.role ?? undefined,
      userId: payload.userId ? (payload.userId as Id<"users">) : undefined,
      avatar: payload.avatar ?? undefined,
      height: payload.height ?? undefined,
      weight: payload.weight ?? undefined,
    });

    const member = await convexClient.query<ConvexFamilyMember | null>(api.families.getMemberById, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("成员创建失败");
    }

    return mapMember(member);
  }

  async listFamilyMembers(familyId: string, includeDeleted?: boolean): Promise<FamilyMemberDTO[]> {
    const members = await convexClient.query<ConvexFamilyMember[]>(api.families.listMembers, {
      familyId: familyId as Id<"families">,
      includeDeleted: includeDeleted ?? false,
    });

    return members.map(mapMember);
  }

  async getFamilyMemberById(id: string): Promise<FamilyMemberDTO | null> {
    const member = await convexClient.query<ConvexFamilyMember | null>(api.families.getMemberById, {
      memberId: id as Id<"familyMembers">,
    });

    return member ? mapMember(member) : null;
  }

  async updateFamilyMember(id: string, payload: UpdateFamilyMemberDTO): Promise<FamilyMemberDTO> {
    await convexClient.mutation(api.families.updateMember, {
      memberId: id as Id<"familyMembers">,
      name: payload.name ?? undefined,
      avatar: payload.avatar ?? undefined,
      role: payload.role ?? undefined,
    });

    const member = await convexClient.query<ConvexFamilyMember | null>(api.families.getMemberById, {
      memberId: id as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("成员不存在");
    }

    return mapMember(member);
  }

  async removeFamilyMember(id: string): Promise<void> {
    await convexClient.mutation(api.families.removeMember, {
      memberId: id as Id<"familyMembers">,
    });
  }

  async isUserFamilyMember(familyId: string, userId: string): Promise<boolean> {
    return await convexClient.query<boolean>(api.families.isUserFamilyMember, {
      familyId: familyId as Id<"families">,
      userId: userId as Id<"users">,
    });
  }

  async getUserFamilyRole(familyId: string, userId: string): Promise<string | null> {
    return await convexClient.query<string | null>(api.families.getUserFamilyRole, {
      familyId: familyId as Id<"families">,
      userId: userId as Id<"users">,
    });
  }
}

function mapFamily(family: ConvexFamily): FamilyDTO {
  return {
    id: family._id,
    name: family.name,
    description: family.description ?? null,
    inviteCode: family.inviteCode ?? "",
    creatorId: family.creatorId,
    createdAt: new Date(family.createdAt),
    updatedAt: new Date(family.updatedAt),
    deletedAt: family.deletedAt ? new Date(family.deletedAt) : null,
  };
}

function mapMember(member: ConvexFamilyMember): FamilyMemberDTO {
  return {
    id: member._id,
    familyId: member.familyId,
    userId: member.userId ?? "",
    name: member.name,
    email: null,
    avatar: member.avatar ?? null,
    role: normalizeRole(member.role),
    joinedAt: new Date(member.createdAt),
    createdAt: new Date(member.createdAt),
    updatedAt: new Date(member.updatedAt),
    deletedAt: member.deletedAt ? new Date(member.deletedAt) : null,
    gender: normalizeGender(member.gender),
    birthDate: member.birthDate ? new Date(member.birthDate) : null,
    height: member.height ?? null,
    weight: member.weight ?? null,
    bmi: null,
    ageGroup: null,
    user: null,
  };
}

function normalizeRole(role: string): FamilyMemberDTO["role"] {
  if (role === "ADMIN" || role === "MEMBER" || role === "GUEST") {
    return role;
  }
  return "MEMBER";
}

function normalizeGender(gender: string | null | undefined): FamilyMemberDTO["gender"] {
  if (gender === "MALE" || gender === "FEMALE" || gender === "OTHER") {
    return gender;
  }
  return null;
}

function mapFamilyWithMembers(
  family: ConvexFamilyWithMembers,
  members: ConvexFamilyMember[]
): FamilyWithMembersDTO {
  return {
    ...mapFamily(family),
    members: members.map(mapMember),
    _count: { members: members.length },
  };
}

type ConvexFamily = {
  _id: string;
  name: string;
  description?: string | null;
  inviteCode?: string | null;
  creatorId: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

type ConvexFamilyMember = {
  _id: string;
  familyId: string;
  userId?: string | null;
  name: string;
  gender?: string | null;
  birthDate?: number | null;
  height?: number | null;
  weight?: number | null;
  avatar?: string | null;
  role: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};

type ConvexFamilyWithMembers = ConvexFamily & {
  members?: ConvexFamilyMember[];
};
