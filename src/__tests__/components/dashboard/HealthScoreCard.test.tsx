/**
 * HealthScoreCard 组件测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HealthScoreCard from '@/components/dashboard/HealthScoreCard';

// Mock Recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data }: { data: any[] }) => (
    <div data-testid="pie">
      {data.map((entry, index) => (
        <div key={index}>{entry.name}</div>
      ))}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" style={{ backgroundColor: fill }}></div>
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip"></div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="bar">{dataKey}</div>
  ),
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <div data-testid="card-description" {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>{children}</div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <div data-testid="card-title" {...props}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div data-testid="progress" data-value={value} {...props}></div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => (
    <div data-testid="tabs" {...props}>{children}</div>
  ),
  TabsContent: ({ children, ...props }: any) => (
    <div data-testid="tabs-content" {...props}>{children}</div>
  ),
  TabsList: ({ children, ...props }: any) => (
    <div data-testid="tabs-list" {...props}>{children}</div>
  ),
  TabsTrigger: ({ children, ...props }: any) => (
    <button data-testid="tabs-trigger" {...props}>{children}</button>
  ),
}));

jest.mock('lucide-react', () => ({
  Heart: () => <span>❤️</span>,
  TrendingUp: () => <span>📈</span>,
  TrendingDown: () => <span>📉</span>,
  Target: () => <span>🎯</span>,
  Activity: () => <span>🏃</span>,
  AlertCircle: () => <span>⚠️</span>,
  CheckCircle: () => <span>✓</span>,
  Info: () => <span>ℹ️</span>,
}));

describe('HealthScoreCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render health score card correctly', async () => {
    const mockData = {
      totalScore: 85,
      breakdown: {
        bmiScore: 85,
        nutritionScore: 80,
        activityScore: 90,
        dataCompletenessScore: 85,
      },
      details: {
        bmi: 22,
        bmiCategory: 'normal' as const,
        nutritionAdherenceRate: 0.8,
        activityFrequency: 5,
        dataCompletenessRate: 0.9,
      },
      recommendations: ['增加蛋白质摄入', '保持规律的作息'],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthScoreCard memberId="test-member" />);

    // Just test that it renders and eventually loads
    await waitFor(() => {
      // Component should render the card
      expect(screen.getByTestId('card')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('API error')
    );

    render(<HealthScoreCard memberId="test-member" />);

    // Should still render the card even on error
    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render multiple tabs', async () => {
    const mockData = {
      totalScore: 85,
      breakdown: {
        bmiScore: 85,
        nutritionScore: 80,
        activityScore: 90,
        dataCompletenessScore: 85,
      },
      details: {
        bmi: 22,
        bmiCategory: 'normal' as const,
        nutritionAdherenceRate: 0.8,
        activityFrequency: 5,
        dataCompletenessRate: 0.9,
      },
      recommendations: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<HealthScoreCard memberId="test-member" />);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
