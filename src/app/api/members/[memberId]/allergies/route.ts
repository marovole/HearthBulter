import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { z } from "zod";

// 创建过敏记录的验证 schema

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
const createAllergySchema = z.object({
  allergenType: z.enum(["FOOD", "ENVIRONMENTAL", "MEDICATION", "OTHER"]),
  allergenName: z.string().min(1, "过敏原名称不能为空"),
  severity: z.enum(["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"]),
  description: z.string().optional(),
});

/**
 * GET /api/members/:memberId/allergies
 * 获取成员的过敏史列表
 *
 * 使用双写框架迁移
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 使用 Repository 验证权限
    const { hasAccess } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "无权限访问该成员的过敏史" },
        { status: 403 },
      );
    }

    // 使用 Repository 获取过敏记录列表
    const allergies = await memberRepository.getAllergies(memberId);

    return NextResponse.json({ allergies }, { status: 200 });
  } catch (error) {
    console.error("获取过敏史失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * POST /api/members/:memberId/allergies
 * 添加过敏记录
 *
 * 使用双写框架迁移
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = createAllergySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.errors },
        { status: 400 },
      );
    }

    // 使用 Repository 验证权限
    const { hasAccess, member } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "无权限为该成员添加过敏记录" },
        { status: 403 },
      );
    }

    if (!member) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    const { allergenType, allergenName, severity, description } =
      validation.data;

    // 使用 Repository 创建过敏记录
    const allergy = await memberRepository.createAllergy(memberId, {
      allergenType,
      allergenName,
      severity,
      description,
    });

    return NextResponse.json(
      {
        message: "过敏记录添加成功",
        allergy,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("添加过敏记录失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
