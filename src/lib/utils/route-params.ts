/**
 * Next.js 15 Route Params Utilities
 *
 * Next.js 15引入了async params作为breaking change。
 * 所有动态路由的params现在都是Promise类型，需要await才能访问。
 *
 * @see https://nextjs.org/docs/messages/sync-dynamic-apis
 */

/**
 * 类型安全地解构单个参数
 *
 * @example
 * // Before (Next.js 14):
 * export async function GET(req: Request, { params }: { params: { id: string } }) {
 *   const id = params.id;
 * }
 *
 * // After (Next.js 15):
 * export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
 *   const { id } = await params;
 * }
 */
export async function getParam<T extends Record<string, string>>(
  params: Promise<T>
): Promise<T> {
  return await params;
}

/**
 * 类型安全地解构多个参数
 *
 * @example
 * export async function GET(
 *   req: Request,
 *   { params }: { params: Promise<{ familyId: string; taskId: string }> }
 * ) {
 *   const { familyId, taskId } = await getParams(params);
 * }
 */
export async function getParams<T extends Record<string, string>>(
  params: Promise<T>
): Promise<T> {
  return await params;
}

/**
 * 类型定义：常见的路由参数类型
 */
export type IdParam = { id: string };
export type MemberIdParam = { memberId: string };
export type FamilyIdParam = { familyId: string };
export type GoalIdParam = { goalId: string };
export type TaskIdParam = { taskId: string };
export type ItemIdParam = { itemId: string };
export type OrderIdParam = { orderId: string };
export type TokenParam = { token: string };
export type ShareTokenParam = { shareToken: string };
export type PlatformParam = { platform: string };
export type CategoryParam = { category: string };

/**
 * 类型定义：复合参数类型
 */
export type MemberGoalParams = { memberId: string; goalId: string };
export type FamilyTaskParams = { familyId: string; taskId: string };
export type FamilyShoppingParams = { familyId: string; itemId: string };
export type MealIngredientParams = { mealId: string; ingredientId: string };
export type PlanMealParams = { planId: string; mealId: string };
