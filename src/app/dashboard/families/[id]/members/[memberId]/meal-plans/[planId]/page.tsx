import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { MealPlanDetailClient } from './MealPlanDetailClient';

interface MealPlanDetailPageProps {
  params: Promise<{
    id: string
    memberId: string
    planId: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function MealPlanDetailPage({
  params,
}: MealPlanDetailPageProps) {
  const { id, memberId, planId } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // 获取食谱计划和成员信息
  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id: planId, deletedAt: null },
    include: {
      member: {
        include: {
          family: {
            select: {
              id: true,
              name: true,
              creatorId: true,
              members: {
                where: { userId: session.user.id, deletedAt: null },
                select: { role: true },
              },
            },
          },
        },
      },
      meals: {
        include: {
          ingredients: {
            include: {
              food: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { date: 'asc' },
          { mealType: 'asc' },
        ],
      },
    },
  });

  if (!mealPlan) {
    notFound();
  }

  // 验证权限
  const isCreator = mealPlan.member.family.creatorId === session.user.id;
  const isAdmin = mealPlan.member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = mealPlan.member.userId === session.user.id;

  if (!isAdmin && !isSelf) {
    redirect(`/dashboard/families/${id}/members/${memberId}`);
  }

  // 验证成员ID和家庭ID匹配
  if (mealPlan.memberId !== memberId || mealPlan.member.familyId !== id) {
    notFound();
  }

  return (
    <MealPlanDetailClient
      mealPlan={mealPlan}
      memberName={mealPlan.member.name || '成员'}
      familyId={id}
      memberId={memberId}
    />
  );
}

