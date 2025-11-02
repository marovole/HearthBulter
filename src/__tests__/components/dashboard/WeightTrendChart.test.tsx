import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeightTrendChart } from '@/components/dashboard/WeightTrendChart';

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
  Dot: () => <div data-testid="dot" />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div data-testid="badge">{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

const mockWeightData = {
  data: [
    { date: '2024-01-01', weight: 70 },
    { date: '2024-01-02', weight: 69.8 },
    { date: '2024-01-03', weight: 69.5 },
  ],
  min: 69.5,
  max: 70,
  average: 69.77,
  change: -0.5,
  changePercent: -0.71,
  currentWeight: 69.5,
  targetWeight: 68,
  anomalies: [],
};

describe('WeightTrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<WeightTrendChart memberId="test-member" />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders weight trend data after loading', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockWeightData }),
    });

    render(<WeightTrendChart memberId="test-member" />);

    await waitFor(() => {
      expect(screen.getByText('体重趋势')).toBeInTheDocument();
    });

    expect(screen.getByText('69.5 kg')).toBeInTheDocument();
    expect(screen.getByText('68kg')).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: '加载失败' }),
    });

    render(<WeightTrendChart memberId="test-member" />);

    await waitFor(() => {
      expect(screen.getByText('加载体重趋势数据失败')).toBeInTheDocument();
    });
  });

  it('shows no data message when data is empty', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { ...mockWeightData, data: [] } }),
    });

    render(<WeightTrendChart memberId="test-member" />);

    await waitFor(() => {
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });
  });

  it('displays trend badge correctly', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockWeightData }),
    });

    render(<WeightTrendChart memberId="test-member" />);

    await waitFor(() => {
      expect(screen.getByText('-0.5kg')).toBeInTheDocument();
    });
  });

  it('calls API with correct parameters', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockWeightData }),
    });

    render(<WeightTrendChart memberId="test-member" days={30} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/dashboard/weight-trend?memberId=test-member&days=30'
      );
    });
  });
});
