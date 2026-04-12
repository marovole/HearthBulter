import { convexClient, api } from "@/lib/convex-client";

type Id<TableName extends string> = string & { __tableName: TableName };

interface FamilyMemberRow {
  id: string;
  userId: string;
  familyId: string;
  name: string;
  gender: string | null;
  birthDate: Date | null;
  relationship: string | null;
}

interface FamilyRow {
  _id: string;
  creatorId: string;
  deletedAt?: number;
}

interface FamilyMemberRoleRow {
  userId?: string;
  role: string;
}

interface MemberAccessResult {
  hasAccess: boolean;
  member: FamilyMemberRow | null;
}

export async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<MemberAccessResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberDoc = (await convexClient.query(api.members.getById, {
    memberId: memberId as Id<"familyMembers">,
  })) as any;

  if (!memberDoc || memberDoc.deletedAt) {
    return { hasAccess: false, member: null };
  }

  const member: FamilyMemberRow = {
    id: memberDoc._id,
    userId: memberDoc.userId ?? "",
    familyId: memberDoc.familyId,
    name: memberDoc.name,
    gender: memberDoc.gender ?? null,
    birthDate: memberDoc.birthDate ? new Date(memberDoc.birthDate) : null,
    relationship: null,
  };

  const family = (await convexClient.query(api.families.getById, {
    familyId: member.familyId as Id<"families">,
  })) as FamilyRow | null;

  if (!family || family.deletedAt) {
    return { hasAccess: false, member: null };
  }

  const userMembership = (await convexClient.query(api.members.getByClerkInFamily, {
    familyId: member.familyId as Id<"families">,
    clerkId: userId,
  })) as FamilyMemberRoleRow | null;

  const isCreator = family.creatorId === userMembership?.userId;
  const isAdmin = userMembership?.role === "ADMIN" || isCreator;
  const isSelf = Boolean(
    member.userId && userMembership?.userId && member.userId === userMembership.userId
  );

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}
