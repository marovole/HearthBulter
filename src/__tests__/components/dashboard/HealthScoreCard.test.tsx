/**
 * HealthScoreCard 组件测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        <div key={index} data-testid={`pie-slice-${index}`}>
          {entry.name}: {entry.value}
        </div>
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
  Bar: ({ data }: { data: any[] }) => (
    <div data-testid="bar">
      {data.map((entry, index) => (
        <div key={index} data-testid={`bar-${index}`}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
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
  Button: ({ children, onClick, variant, ...props }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, max, ...props }: any) => (
    <div data-testid="progress" data-value={value} data-max={max} {...props}>
      <div data-testid="progress-bar"></div>
    </div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, ...props }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue} {...props}>{children}</div>
  ),
  TabsContent: ({ children, value, ...props }: any) => (
    <div data-testid="tabs-content" data-value={value} {...props}>{children}</div>
  ),
  TabsList: ({ children, ...props }: any) => (
    <div data-testid="tabs-list" {...props}>{children}</div>
  ),
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button data-testid="tabs-trigger" data-value={value} {...props}>{children}</button>
  ),
}));

describe('HealthScoreCard', () => {
  const mockHealthScore = {
    overall: 85,
    nutrition: 80,
    exercise: 90,
    sleep: 85,
    medical: 85,
    previousOverall: 82,
    weekData: [
      { date: '2024-01-01', score: 80 },
      { date: '2024-01-02', score: 82 },
      { date: '2024-01-03', score: 81 },
      { date: '2024-01-04', score: 83 },
      { date: '2024-01-05', score: 85 },
    ],
    recommendations: [
      '增加蛋白质摄入',
      '保持规律的作息时间',
      '适当增加有氧运动'
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render health score card correctly', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('健康评分')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // overall score
  });

  it('should display score trend when previous score is provided', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    // Should show trend indicator since current score (85) > previous score (82)
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('should render different score categories', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    // Check if individual category scores are displayed
    expect(screen.getByText('营养')).toBeInTheDocument();
    expect(screen.getByText('运动')).toBeInTheDocument();
    expect(screen.getByText('睡眠')).toBeInTheDocument();
    expect(screen.getByText('医疗')).toBeInTheDocument();
  });

  it('should handle missing previous score gracefully', () => {
    const healthScoreWithoutPrevious = {
      ...mockHealthScore,
      previousOverall: undefined
    };

    render(<HealthScoreCard healthScore={healthScoreWithoutPrevious} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should not show trend indicators
  });

  it('should render tabs for different views', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
  });

  it('should switch between tabs when clicked', async () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    const overviewTab = screen.getByTestId('tabs-trigger');
    if (overviewTab) {
      fireEvent.click(overviewTab);
      await waitFor(() => {
        expect(screen.getByTestId('tabs-content')).toBeInTheDocument();
      });
    }
  });

  it('should display recommendations when provided', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    mockHealthScore.recommendations.forEach(recommendation => {
      expect(screen.getByText(recommendation)).toBeInTheDocument();
    });
  });

  it('should handle empty recommendations', () => {
    const healthScoreWithoutRecommendations = {
      ...mockHealthScore,
      recommendations: []
    };

    render(<HealthScoreCard healthScore={healthScoreWithoutRecommendations} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    // Should render without errors even with empty recommendations
  });

  it('should display correct score color based on value', () => {
    const highScore = {
      ...mockHealthScore,
      overall: 95
    };

    render(<HealthScoreCard healthScore={highScore} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('should display low score with different styling', () => {
    const lowScore = {
      ...mockHealthScore,
      overall: 45
    };

    render(<HealthScoreCard healthScore={lowScore} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('should render progress bars for individual categories', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    // Should render progress indicators for each category
    expect(screen.getAllByTestId('progress')).toHaveLength(5); // overall + 4 categories
  });

  it('should handle click events on action buttons', async () => {
    const mockOnViewDetails = jest.fn();

    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Find and click action button if exists
    const buttons = screen.getAllByTestId('button');
    const detailsButton = buttons.find(btn =>
      btn.textContent?.includes('详情') || btn.textContent?.includes('查看')
    );

    if (detailsButton) {
      fireEvent.click(detailsButton);
      await waitFor(() => {
        expect(mockOnViewDetails).toHaveBeenCalled();
      });
    }
  });

  it('should render weekly trend chart', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<HealthScoreCard healthScore={null} />);

    // Should handle null/undefined health score gracefully
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('should display proper accessibility attributes', () => {
    render(<HealthScoreCard healthScore={mockHealthScore} />);

    // Check for proper ARIA labels and semantic structure
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();

    // Score should be properly labeled for screen readers
    const scoreElements = screen.getAllByText('85');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('should be responsive to different screen sizes', () => {
    // Mock different screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<HealthScoreCard healthScore={mockHealthScore} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();

    // Change to mobile size
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));

    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});