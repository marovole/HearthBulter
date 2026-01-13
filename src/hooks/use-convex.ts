"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// ==================== DASHBOARD HOOKS ====================

/**
 * Get dashboard overview for a member
 */
export function useDashboardOverview(
  memberId: Id<"familyMembers"> | undefined,
) {
  return useQuery(api.dashboard.overview, memberId ? { memberId } : "skip");
}

/**
 * Get weekly summary
 */
export function useWeeklySummary(
  memberId: Id<"familyMembers"> | undefined,
  weekStartDate?: number,
) {
  return useQuery(
    api.dashboard.weeklySummary,
    memberId ? { memberId, weekStartDate } : "skip",
  );
}

/**
 * Get family dashboard
 */
export function useFamilyOverview(familyId: Id<"families"> | undefined) {
  return useQuery(
    api.dashboard.familyOverview,
    familyId ? { familyId } : "skip",
  );
}

// ==================== FAMILY HOOKS ====================

/**
 * Get user's families
 */
export function useUserFamilies() {
  return useQuery(api.families.listUserFamilies);
}

/**
 * Get family by ID
 */
export function useFamily(familyId: Id<"families"> | undefined) {
  return useQuery(api.families.getById, familyId ? { id: familyId } : "skip");
}

/**
 * Create family mutation
 */
export function useCreateFamily() {
  return useMutation(api.families.create);
}

/**
 * Join family mutation
 */
export function useJoinFamily() {
  return useMutation(api.families.joinByInviteCode);
}

// ==================== HEALTH HOOKS ====================

/**
 * Get health history
 */
export function useHealthHistory(
  memberId: Id<"familyMembers"> | undefined,
  options?: { startDate?: number; endDate?: number; limit?: number },
) {
  return useQuery(
    api.health.getHealthHistory,
    memberId ? { memberId, ...options } : "skip",
  );
}

/**
 * Get latest health data
 */
export function useLatestHealth(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.health.getLatest, memberId ? { memberId } : "skip");
}

/**
 * Get active health goal
 */
export function useActiveHealthGoal(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.health.getActiveGoal, memberId ? { memberId } : "skip");
}

/**
 * Record health data mutation
 */
export function useRecordHealthData() {
  return useMutation(api.health.recordHealthData);
}

/**
 * Create health goal mutation
 */
export function useCreateHealthGoal() {
  return useMutation(api.health.createGoal);
}

// ==================== FOOD HOOKS ====================

/**
 * Search foods
 */
export function useFoodSearch(
  query: string,
  options?: { category?: string; limit?: number },
) {
  return useQuery(
    api.foods.search,
    query.trim() ? { query, ...options } : "skip",
  );
}

/**
 * Get food by ID
 */
export function useFood(foodId: Id<"foods"> | undefined) {
  return useQuery(api.foods.getById, foodId ? { id: foodId } : "skip");
}

/**
 * Get popular foods
 */
export function usePopularFoods(limit?: number) {
  return useQuery(api.foods.getPopular, { limit });
}

/**
 * Calculate nutrition
 */
export function useCalculateNutrition(
  items: Array<{ foodId: Id<"foods">; amount: number }>,
) {
  return useQuery(
    api.foods.calculateNutrition,
    items.length > 0 ? { items } : "skip",
  );
}

// ==================== MEAL PLAN HOOKS ====================

/**
 * Get meal plans
 */
export function useMealPlans(
  memberId: Id<"familyMembers"> | undefined,
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED",
) {
  return useQuery(api.mealPlans.list, memberId ? { memberId, status } : "skip");
}

/**
 * Get active meal plan
 */
export function useActiveMealPlan(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.mealPlans.getActive, memberId ? { memberId } : "skip");
}

/**
 * Get meal plan by ID
 */
export function useMealPlan(planId: Id<"mealPlans"> | undefined) {
  return useQuery(api.mealPlans.getById, planId ? { id: planId } : "skip");
}

/**
 * Create meal plan mutation
 */
export function useCreateMealPlan() {
  return useMutation(api.mealPlans.create);
}

// ==================== MEAL LOG HOOKS ====================

/**
 * Get meal logs
 */
export function useMealLogs(
  memberId: Id<"familyMembers"> | undefined,
  options?: { startDate?: number; endDate?: number; limit?: number },
) {
  return useQuery(
    api.mealLogs.list,
    memberId ? { memberId, ...options } : "skip",
  );
}

/**
 * Get meal logs by date
 */
export function useMealLogsByDate(
  memberId: Id<"familyMembers"> | undefined,
  date: number,
) {
  return useQuery(
    api.mealLogs.getByDate,
    memberId ? { memberId, date } : "skip",
  );
}

/**
 * Get daily summary
 */
export function useDailySummary(
  memberId: Id<"familyMembers"> | undefined,
  date: number,
) {
  return useQuery(
    api.mealLogs.getDailySummary,
    memberId ? { memberId, date } : "skip",
  );
}

/**
 * Get tracking streak
 */
export function useTrackingStreak(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.mealLogs.getStreak, memberId ? { memberId } : "skip");
}

/**
 * Create meal log mutation
 */
export function useCreateMealLog() {
  return useMutation(api.mealLogs.create);
}

// ==================== RECIPE HOOKS ====================

/**
 * Search recipes
 */
export function useRecipeSearch(
  query: string,
  options?: { category?: string; difficulty?: string; limit?: number },
) {
  return useQuery(
    api.recipes.search,
    query.trim() ? { query, ...options } : "skip",
  );
}

/**
 * Get recipe by ID
 */
export function useRecipe(recipeId: Id<"recipes"> | undefined) {
  return useQuery(api.recipes.getById, recipeId ? { id: recipeId } : "skip");
}

/**
 * Get popular recipes
 */
export function usePopularRecipes(limit?: number) {
  return useQuery(api.recipes.getPopular, { limit });
}

/**
 * Get favorite recipes
 */
export function useFavoriteRecipes(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.recipes.getFavorites, memberId ? { memberId } : "skip");
}

/**
 * Favorite recipe mutation
 */
export function useFavoriteRecipe() {
  return useMutation(api.recipes.favorite);
}

/**
 * Rate recipe mutation
 */
export function useRateRecipe() {
  return useMutation(api.recipes.rate);
}

// ==================== INVENTORY HOOKS ====================

/**
 * Get inventory items
 */
export function useInventory(
  memberId: Id<"familyMembers"> | undefined,
  options?: { status?: string; storageLocation?: string },
) {
  return useQuery(
    api.inventory.list,
    memberId ? { memberId, ...options } : "skip",
  );
}

/**
 * Get expiring items
 */
export function useExpiringItems(
  memberId: Id<"familyMembers"> | undefined,
  daysAhead?: number,
) {
  return useQuery(
    api.inventory.getExpiring,
    memberId ? { memberId, daysAhead } : "skip",
  );
}

/**
 * Get low stock items
 */
export function useLowStockItems(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.inventory.getLowStock, memberId ? { memberId } : "skip");
}

/**
 * Add inventory item mutation
 */
export function useAddInventoryItem() {
  return useMutation(api.inventory.add);
}

/**
 * Use inventory item mutation
 */
export function useUseInventoryItem() {
  return useMutation(api.inventory.use);
}

// ==================== BUDGET HOOKS ====================

/**
 * Get budgets
 */
export function useBudgets(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.budget.list, memberId ? { memberId } : "skip");
}

/**
 * Get active budget
 */
export function useActiveBudget(memberId: Id<"familyMembers"> | undefined) {
  return useQuery(api.budget.getActive, memberId ? { memberId } : "skip");
}

/**
 * Get budget by ID
 */
export function useBudget(budgetId: Id<"budgets"> | undefined) {
  return useQuery(api.budget.getById, budgetId ? { id: budgetId } : "skip");
}

/**
 * Create budget mutation
 */
export function useCreateBudget() {
  return useMutation(api.budget.create);
}

/**
 * Add spending mutation
 */
export function useAddSpending() {
  return useMutation(api.budget.addSpending);
}

// ==================== NOTIFICATION HOOKS ====================

/**
 * Get notifications
 */
export function useNotifications(
  memberId: Id<"familyMembers"> | undefined,
  limit?: number,
) {
  return useQuery(
    api.notifications.list,
    memberId ? { memberId, limit } : "skip",
  );
}

/**
 * Get unread count
 */
export function useUnreadNotificationCount(
  memberId: Id<"familyMembers"> | undefined,
) {
  return useQuery(
    api.notifications.getUnreadCount,
    memberId ? { memberId } : "skip",
  );
}

/**
 * Mark notification as read mutation
 */
export function useMarkNotificationRead() {
  return useMutation(api.notifications.markAsRead);
}

/**
 * Mark all notifications as read mutation
 */
export function useMarkAllNotificationsRead() {
  return useMutation(api.notifications.markAllAsRead);
}

// ==================== FILE HOOKS ====================

/**
 * Generate upload URL mutation
 */
export function useGenerateUploadUrl() {
  return useMutation(api.files.generateUploadUrl);
}

/**
 * Get medical reports
 */
export function useMedicalReports(
  memberId: Id<"familyMembers"> | undefined,
  limit?: number,
) {
  return useQuery(
    api.files.getMedicalReports,
    memberId ? { memberId, limit } : "skip",
  );
}

/**
 * Save medical report mutation
 */
export function useSaveMedicalReport() {
  return useMutation(api.files.saveMedicalReport);
}

// ==================== AI HOOKS ====================

/**
 * Analyze health action
 */
export function useAnalyzeHealth() {
  return useAction(api.ai.analyzeHealth);
}

/**
 * Optimize recipe action
 */
export function useOptimizeRecipe() {
  return useAction(api.ai.optimizeRecipe);
}

/**
 * AI consultation action
 */
export function useAIConsult() {
  return useAction(api.ai.consult);
}

/**
 * Generate health report action
 */
export function useGenerateHealthReport() {
  return useAction(api.ai.generateReport);
}

// ==================== SHOPPING LIST HOOKS ====================

/**
 * Get shopping list by ID
 */
export function useShoppingList(listId: Id<"shoppingLists"> | undefined) {
  return useQuery(api.shoppingLists.getById, listId ? { id: listId } : "skip");
}

/**
 * Add item to shopping list mutation
 */
export function useAddShoppingItem() {
  return useMutation(api.shoppingLists.addItem);
}

/**
 * Mark item as purchased mutation
 */
export function useMarkItemPurchased() {
  return useMutation(api.shoppingLists.markPurchased);
}

/**
 * Share shopping list mutation
 */
export function useShareShoppingList() {
  return useMutation(api.shoppingLists.share);
}
