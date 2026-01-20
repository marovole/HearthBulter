import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { z } from "zod";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  role?: string;
}

interface Family {
  id: string;
  creatorId: string;
}

interface Allergy {
  id: string;
  memberId: string;
  allergenType: string;
  allergenName: string;
  severity: string;
  description: string | null;
  deletedAt: string | null;
}

// 更新过敏记录的验证 schema
const updateAllergySchema = z.object({
  allergenType: z.enum(["FOOD", "ENVIRONMENTAL", "MEDICATION", "OTHER"]).optional(),
  allergenName: z.string().min(1).optional(),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"]).optional(),
  description: z.string().optional(),
});

/**
 * 验证用户是否有权限访问过敏记录
 *
 * Migrated from Supabase to Neon
 */
async function verifyAllergyAccess(
  allergyId: string,
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; allergy: Allergy | null }> {
  // 获取过敏记录
  const allergy = await neonAdapter.allergy.findFirst<Allergy>({
    where: { id: allergyId, memberId: memberId, deletedAt: null },
  });

  if (!allergy) {
    return { hasAccess: false, allergy: null };
  }

  // 查询成员信息
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false, allergy: null };
  }

  // 查询家庭信息
  const family = await neonAdapter.family.findFirst<Family>({
    where: { id: member.familyId },
  });

  // 检查是否是家庭创建者
  const isCreator = family?.creatorId === userId;

  // 检查是否是管理员
  let isAdmin = false;
  if (!isCreator && member.familyId) {
    const adminMember = await neonAdapter.familyMember.findFirst<FamilyMember>({
      where: {
        familyId: member.familyId,
        userId: userId,
        role: "ADMIN",
        deletedAt: null,
      },
    });

    isAdmin = !!adminMember;
  }

  // 检查是否是本人
  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    allergy,
  };
}

/**
 * GET /api/members/:memberId/allergies/:allergyId
 * 获取单个过敏记录
 *
 * Migrated from Supabase to Neon
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限并获取过敏记录
    const { hasAccess, allergy } = await verifyAllergyAccess(allergyId, memberId, session.user.id);

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: "过敏记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ allergy }, { status: 200 });
  } catch (error) {
    console.error("获取过敏记录失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/members/:memberId/allergies/:allergyId
 * 更新过敏记录
 *
 * Migrated from Supabase to Neon
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = updateAllergySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.errors },
        { status: 400 }
      );
    }

    // 验证权限
    const { hasAccess, allergy } = await verifyAllergyAccess(allergyId, memberId, session.user.id);

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: "过敏记录不存在" }, { status: 404 });
    }

    // 更新过敏记录
    const updatedAllergy = await neonAdapter.allergy.update<Allergy>({
      where: { id: allergyId },
      data: validation.data,
    });

    return NextResponse.json(
      {
        message: "过敏记录更新成功",
        allergy: updatedAllergy,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新过敏记录失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/members/:memberId/allergies/:allergyId
 * 删除过敏记录（软删除）
 *
 * Migrated from Supabase to Neon
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, allergy } = await verifyAllergyAccess(allergyId, memberId, session.user.id);

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: "过敏记录不存在" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 软删除过敏记录
    await neonAdapter.allergy.update({
      where: { id: allergyId },
      data: { deletedAt: now },
    });

    return NextResponse.json({ message: "过敏记录删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除过敏记录失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
