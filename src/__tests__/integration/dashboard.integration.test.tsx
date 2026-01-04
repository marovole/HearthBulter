import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard';

// Mock all child components
jest.mock('@/components/dashboard/WeightTrendChart', () => ({
  WeightTrendChart: ({ memberId }: { memberId: string }) => (
    <div data-testid='weight-trend-chart'>Weight Trend for {memberId}</div>
  ),
}));

jest.mock('@/components/dashboard/NutritionAnalysisChart', () => ({
  NutritionAnalysisChart: ({ memberId }: { memberId: string }) => (
    <div data-testid='nutrition-analysis-chart'>
      Nutrition Analysis for {memberId}
    </div>
  ),
}));

jest.mock('@/components/dashboard/HealthScoreCard', () => ({
  HealthScoreCard: ({ memberId }: { memberId: string }) => (
    <div data-testid='health-score-card'>Health Score for {memberId}</div>
  ),
}));

jest.mock('@/components/dashboard/OverviewCards', () => ({
  OverviewCards: ({ memberId }: { memberId: string }) => (
    <div data-testid='overview-cards'>Overview for {memberId}</div>
  ),
}));

jest.mock('@/components/dashboard/TrendsSection', () => ({
  TrendsSection: ({ memberId }: { memberId: string }) => (
    <div data-testid='trends-section'>Trends for {memberId}</div>
  ),
}));

jest.mock('@/components/dashboard/QuickActionsPanel', () => ({
  QuickActionsPanel: ({ memberId }: { memberId: string }) => (
    <div data-testid='quick-actions-panel'>Quick Actions for {memberId}</div>
  ),
}));

jest.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children, currentMember, familyMembers }: any) => (
    <div data-testid='dashboard-layout'>
      <div data-testid='current-member'>{currentMember}</div>
      <div data-testid='family-members-count'>{familyMembers?.length || 0}</div>
      {children}
    </div>
  ),
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: async () => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
    },
  }),
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with all components', async () => {
    render(<EnhancedDashboard userId='test-user-id' />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    // Check that all main components are rendered
    expect(screen.getByTestId('overview-cards')).toBeInTheDocument();
    expect(screen.getByTestId('weight-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('health-score-card')).toBeInTheDocument();
    expect(screen.getByTestId('nutrition-analysis-chart')).toBeInTheDocument();
    expect(screen.getByTestId('trends-section')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions-panel')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<EnhancedDashboard userId='test-user-id' />);

    // Should show loading spinner
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows family member information', async () => {
    render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('family-members-count')).toBeInTheDocument();
    });

    // Should display family members count
    expect(screen.getByTestId('family-members-count')).toHaveTextContent('3');
  });

  it('handles member selection', async () => {
    render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('weight-trend-chart')).toBeInTheDocument();
    });

    // Initially should show first member's data
    expect(screen.getByTestId('weight-trend-chart')).toHaveTextContent(
      'Weight Trend for 1',
    );

    // TODO: Add member selection interaction test when implemented
  });

  it('renders different tabs correctly', async () => {
    render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    // Check overview tab (default)
    expect(screen.getByTestId('overview-cards')).toBeInTheDocument();

    // TODO: Add tab switching tests when tab navigation is implemented
  });

  it('handles error states gracefully', async () => {
    // Mock a component that throws an error
    jest.doMock('@/components/dashboard/WeightTrendChart', () => ({
      WeightTrendChart: () => {
        throw new Error('Component error');
      },
    }));

    // The dashboard should still render other components
    render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    // Other components should still be visible
    expect(screen.getByTestId('health-score-card')).toBeInTheDocument();
  });

  it('is responsive to different screen sizes', async () => {
    // Mock different screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet size
    });

    render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    // Should still render all components
    expect(screen.getByTestId('overview-cards')).toBeInTheDocument();

    // Mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    fireEvent.resize(window);

    // Should still be functional
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  it('maintains component state on re-render', async () => {
    const { rerender } = render(<EnhancedDashboard userId='test-user-id' />);

    await waitFor(() => {
      expect(screen.getByTestId('weight-trend-chart')).toBeInTheDocument();
    });

    // Re-render with same props
    rerender(<EnhancedDashboard userId='test-user-id' />);

    // Components should still be there
    expect(screen.getByTestId('weight-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('health-score-card')).toBeInTheDocument();
  });
});
