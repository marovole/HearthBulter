// ============================================================================
// 周计划邮件通知服务
// 生成周计划 HTML 邮件并发送
// ============================================================================

import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import { EmailService } from "./email-service";

// Type definitions for Convex documents
interface UserDoc {
  _id?: string;
  email?: string;
  name?: string;
}

interface TriggerLogDoc {
  _id: string;
  mealPlanId?: string;
  emailSent?: boolean;
}

interface MealPlanDoc {
  _id?: string;
  id?: string;
  meals?: any[];
  startDate?: number;
  endDate?: number;
  targetCalories?: number;
}

// ============================================================================
// 类型定义
// ============================================================================

export interface WeeklyPlanEmailData {
  userName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  meals: WeeklyMealSummary[];
  nutritionSummary: NutritionSummary;
  shoppingListUrl: string;
  instacartCheckoutUrl?: string;
  unsubscribeUrl: string;
}

export interface WeeklyMealSummary {
  date: Date;
  dayName: string;
  meals: {
    type: string;
    name: string;
    calories: number;
  }[];
}

export interface NutritionSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  targetCalories: number;
}

// ============================================================================
// 周计划邮件服务
// ============================================================================

export class WeeklyPlanEmailService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // --------------------------------------------------------------------------
  // 发送周计划邮件
  // --------------------------------------------------------------------------

  async sendWeeklyPlanEmail(userId: string, mealPlanId: string): Promise<boolean> {
    try {
      // 使用 Convex 获取用户信息
      const user = (await convexClient.query(asConvexQueryReference("users:getById"), {
        userId: userId,
      })) as UserDoc | null;

      if (!user?.email) {
        console.error(`[WeeklyPlanEmail] No email for user ${userId}`);
        return false;
      }

      // 使用 Convex 获取餐食计划详情
      const mealPlan = (await convexClient.query(asConvexQueryReference("meals:getPlanDetails"), {
        planId: mealPlanId,
      })) as MealPlanDoc | null;

      if (!mealPlan) {
        console.error(`[WeeklyPlanEmail] Meal plan ${mealPlanId} not found`);
        return false;
      }

      const emailData = this.buildEmailData(user, mealPlan);
      const html = this.generateEmailHtml(emailData);

      // 获取家庭成员 ID 用于发送邮件
      // 注意：这里需要查询家庭成员，Convex 中可能需要额外的查询
      const memberId = userId; // 简化处理，实际应该查询 familyMembers

      await this.emailService.send(memberId, "Your Weekly Meal Plan is Ready! 🍽️", html, {
        html: true,
      });

      // 更新触发日志 (Convex)
      // 注意：需要查询相关日志并更新
      const logs = (await convexClient.query(
        asConvexQueryReference("smartTrigger:getTriggerLogs"),
        {
          userId,
        }
      )) as TriggerLogDoc[] | null;

      // 找到相关的未发送邮件的日志并更新
      const targetLog = (logs || []).find((log) => log.mealPlanId === mealPlanId && !log.emailSent);

      if (targetLog) {
        await convexClient.mutation(asConvexMutationReference("smartTrigger:updateTriggerLog"), {
          id: targetLog._id,
          patch: { emailSent: true },
        });
      }

      return true;
    } catch (error) {
      console.error("[WeeklyPlanEmail] Failed to send email:", error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // 构建邮件数据
  // --------------------------------------------------------------------------

  private buildEmailData(user: any, mealPlan: any): WeeklyPlanEmailData {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const mealsByDate = new Map<string, any[]>();
    for (const meal of mealPlan.meals || []) {
      const dateKey = new Date(meal.date).toISOString().split("T")[0] ?? "";
      if (!dateKey) continue;
      if (!mealsByDate.has(dateKey)) {
        mealsByDate.set(dateKey, []);
      }
      mealsByDate.get(dateKey)!.push(meal);
    }

    const meals: WeeklyMealSummary[] = Array.from(mealsByDate.entries()).map(
      ([dateStr, dayMeals]) => {
        const date = new Date(dateStr);
        return {
          date,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          meals: dayMeals.map((m) => ({
            type: m.mealType,
            name: m.recipeName || "Custom Meal",
            calories: m.calories,
          })),
        };
      }
    );

    const totalMeals = (mealPlan.meals || []).length;
    const nutritionSummary: NutritionSummary = {
      avgCalories:
        totalMeals > 0
          ? (mealPlan.meals || []).reduce((s: number, m: any) => s + (m.calories || 0), 0) /
            totalMeals
          : 0,
      avgProtein:
        totalMeals > 0
          ? (mealPlan.meals || []).reduce((s: number, m: any) => s + (m.protein || 0), 0) /
            totalMeals
          : 0,
      avgCarbs:
        totalMeals > 0
          ? (mealPlan.meals || []).reduce((s: number, m: any) => s + (m.carbs || 0), 0) / totalMeals
          : 0,
      avgFat:
        totalMeals > 0
          ? (mealPlan.meals || []).reduce((s: number, m: any) => s + (m.fat || 0), 0) / totalMeals
          : 0,
      targetCalories: mealPlan.targetCalories || 2000,
    };

    return {
      userName: user.name || "there",
      weekStartDate: mealPlan.startDate ? new Date(mealPlan.startDate) : new Date(),
      weekEndDate: mealPlan.endDate ? new Date(mealPlan.endDate) : new Date(),
      meals,
      nutritionSummary,
      shoppingListUrl: `${baseUrl}/dashboard/shopping-lists?planId=${mealPlan._id || mealPlan.id}`,
      instacartCheckoutUrl: `${baseUrl}/dashboard/instacart-cart?planId=${mealPlan._id || mealPlan.id}`,
      unsubscribeUrl: `${baseUrl}/settings/notifications?unsubscribe=weekly-plan`,
    };
  }

  // --------------------------------------------------------------------------
  // 生成邮件 HTML
  // --------------------------------------------------------------------------

  private generateEmailHtml(data: WeeklyPlanEmailData): string {
    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const mealsHtml = data.meals
      .map(
        (day) => `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">
              ${day.dayName}, ${formatDate(day.date)}
            </div>
            ${day.meals
              .map(
                (meal) => `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #6b7280;">
                <span>${meal.type}: ${meal.name}</span>
                <span>${Math.round(meal.calories)} cal</span>
              </div>
            `
              )
              .join("")}
          </td>
        </tr>
      `
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Meal Plan</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🍽️ Your Weekly Meal Plan</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
          ${formatDate(data.weekStartDate)} - ${formatDate(data.weekEndDate)}
        </p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 24px 32px;">
        <p style="margin: 0; color: #374151; font-size: 16px;">
          Hi ${data.userName}! 👋
        </p>
        <p style="margin: 12px 0 0; color: #6b7280; font-size: 14px;">
          Your personalized meal plan for the week is ready. Here's what's on the menu:
        </p>
      </td>
    </tr>

    <!-- Nutrition Summary -->
    <tr>
      <td style="padding: 0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
          <tr>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
              <div style="font-size: 20px; font-weight: 600; color: #10b981;">${Math.round(data.nutritionSummary.avgCalories)}</div>
              <div style="font-size: 12px; color: #6b7280;">Avg Calories</div>
            </td>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
              <div style="font-size: 20px; font-weight: 600; color: #3b82f6;">${Math.round(data.nutritionSummary.avgProtein)}g</div>
              <div style="font-size: 12px; color: #6b7280;">Protein</div>
            </td>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
              <div style="font-size: 20px; font-weight: 600; color: #f59e0b;">${Math.round(data.nutritionSummary.avgCarbs)}g</div>
              <div style="font-size: 12px; color: #6b7280;">Carbs</div>
            </td>
            <td style="padding: 16px; text-align: center;">
              <div style="font-size: 20px; font-weight: 600; color: #ef4444;">${Math.round(data.nutritionSummary.avgFat)}g</div>
              <div style="font-size: 12px; color: #6b7280;">Fat</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Meals List -->
    <tr>
      <td style="padding: 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
          ${mealsHtml}
        </table>
      </td>
    </tr>

    <!-- CTA Buttons -->
    <tr>
      <td style="padding: 32px; text-align: center;">
        <a href="${data.instacartCheckoutUrl}" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 12px;">
          🛒 Order on Instacart
        </a>
        <a href="${data.shoppingListUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #10b981; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #10b981;">
          📋 View Shopping List
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          You're receiving this because you enabled smart meal planning.
          <br>
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

export const weeklyPlanEmailService = new WeeklyPlanEmailService();
