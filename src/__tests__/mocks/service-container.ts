/**
 * Global mock for service-container
 * Provides mocked service instances for all tests
 */

// Mock implementations for各服务
export const mockNotificationManager = {
  sendNotification: jest.fn(),
  sendBulkNotifications: jest.fn(),
  scheduleNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  deleteNotification: jest.fn(),
};

export const mockRecommendationEngine = {
  getRecommendations: jest.fn(),
  generatePersonalizedPlan: jest.fn(),
};

export const mockAnalyticsService = {
  analyzeWeightTrend: jest.fn(),
  summarizeNutrition: jest.fn(),
  calculateGoalProgress: jest.fn(),
  getDashboardOverview: jest.fn(),
  getAnomalyReport: jest.fn(),
};

export const mockBudgetTracker = {
  getCurrentBudget: jest.fn(),
  recordSpending: jest.fn(),
  getBudgetHistory: jest.fn(),
  checkBudgetAlerts: jest.fn(),
};

export const mockBudgetNotificationService = {
  sendBudgetAlert: jest.fn(),
  sendBudgetOverspend: jest.fn(),
  sendBudgetOptimizationTip: jest.fn(),
  sendBudgetPeriodSummary: jest.fn(),
  sendCategoryBudgetAlert: jest.fn(),
};

// Mock ServiceContainer class
export class ServiceContainer {
  getNotificationManager() {
    return mockNotificationManager;
  }

  getRecommendationEngine() {
    return mockRecommendationEngine;
  }

  getAnalyticsService() {
    return mockAnalyticsService;
  }

  getBudgetTracker() {
    return mockBudgetTracker;
  }

  getBudgetNotificationService() {
    return mockBudgetNotificationService;
  }

  // Add other service getters as needed
  getNotificationRepository() {
    return {};
  }

  getRecommendationRepository() {
    return {};
  }

  getAnalyticsRepository() {
    return {};
  }

  getBudgetRepository() {
    return {};
  }

  getFamilyRepository() {
    return {};
  }
}

// Mock singleton container instance
const mockContainer = new ServiceContainer();

export function getDefaultContainer(): ServiceContainer {
  return mockContainer;
}

export default {
  ServiceContainer,
  getDefaultContainer,
};
