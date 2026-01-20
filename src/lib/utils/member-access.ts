import { neonAdapter } from "@/lib/db";

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
  id: string;
  creatorId: string;
}

interface FamilyMemberRoleRow {
  role: string;
}

interface MemberAccessResult {
  hasAccess: boolean;
  member: FamilyMemberRow | null;
}

export async function verifyMemberAccess(
  memberId: string,
  userId: string,
): Promise<MemberAccessResult> {
  const member = (await neonAdapter.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
  })) as FamilyMemberRow | null;

  if (!member) {
    return { hasAccess: false, member: null };
  }

  const family = (await neonAdapter.family.findUnique({
    where: { id: member.familyId },
  })) as FamilyRow | null;

  if (!family) {
    return { hasAccess: false, member: null };
  }

  const userMembership = (await neonAdapter.familyMember.findFirst({
    where: { familyId: member.familyId, userId, deletedAt: null },
  })) as FamilyMemberRoleRow | null;

  const isCreator = family.creatorId === userId;
  const isAdmin = userMembership?.role === "ADMIN" || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}
